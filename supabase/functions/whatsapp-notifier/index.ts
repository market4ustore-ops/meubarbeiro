// Supabase Edge Function: whatsapp-notifier
// Dispara notificações via WhatsApp (Uazapi) baseadas em gatilhos do banco

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { table, action, data } = await req.json()
        console.log(`[WhatsAppNotifier] Event: ${table} ${action} for ID: ${data.id}`)

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        // 1. Buscar Configuração Global de WhatsApp
        const { data: config, error: configError } = await supabaseAdmin
            .from('saas_whatsapp_config')
            .select('*')
            .single()

        if (configError || !config || !config.is_active) {
            console.warn('[WhatsAppNotifier] WhatsApp desativado ou configuração não encontrada.')
            return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), { status: 200 })
        }

        // 2. Buscar Dados do Estabelecimento (Tenant)
        const tenantId = data.tenant_id
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('name, phone')
            .eq('id', tenantId)
            .single()

        if (tenantError || !tenant) {
            console.error('[WhatsAppNotifier] Tenant não encontrado:', tenantId)
            return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404 })
        }

        // 3. Montar Mensagem e Destinatários
        let message = ''
        const recipients: string[] = [tenant.phone].filter(Boolean)

        if (table === 'appointments') {
            const dateStr = new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR')
            
            // Buscar Nome do Barbeiro
            let barberName = 'A definir'
            if (data.barber_id) {
                const { data: barber } = await supabaseAdmin
                    .from('users')
                    .select('name, phone')
                    .eq('id', data.barber_id)
                    .single()
                
                if (barber) {
                    barberName = barber.name
                    if (barber.phone && barber.phone !== tenant.phone) {
                        recipients.push(barber.phone)
                    }
                }
            }

            message = `✂️ *Novo Agendamento via Site!*\n\n` +
                      `👤 *Cliente:* ${data.client_name}\n` +
                      `📅 *Data:* ${dateStr}\n` +
                      `⏰ *Hora:* ${data.time}\n` +
                      `🧔 *Barbeiro:* ${barberName}\n\n` +
                      `_Acesse o painel para confirmar._`

        } else if (table === 'product_orders') {
            message = `🛍️ *Novo Pedido Recebido!*\n\n` +
                      `👤 *Cliente:* ${data.client_name}\n` +
                      `💰 *Total:* R$ ${Number(data.total).toFixed(2)}\n\n` +
                      `_Verifique o pedido no painel financeiro!_`
        }

        if (!message) {
            return new Response(JSON.stringify({ skipped: true, reason: 'no_message_schema' }), { status: 200 })
        }

        // 4. Enviar via Provedor (Uazapi)
        const validRecipients = [...new Set(recipients)]
        const results = []

        for (const phone of validRecipients) {
            let cleanPhone = phone.replace(/\D/g, '')
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                cleanPhone = `55${cleanPhone}`
            }

            try {
                if (config.provider === 'UAZAPI') {
                    const response = await fetch(`${config.api_url}/send/text`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'token': config.api_key
                        },
                        body: JSON.stringify({
                            number: cleanPhone,
                            text: message,
                            delay: 1200
                        })
                    })
                    results.push({ phone, status: response.status })
                } else {
                    console.warn(`[WhatsAppNotifier] Provedor ${config.provider} não implementado na Edge Function.`)
                }
            } catch (err) {
                console.error(`[WhatsAppNotifier] Erro ao enviar para ${phone}:`, err)
                results.push({ phone, error: err.message })
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('[WhatsAppNotifier] Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
