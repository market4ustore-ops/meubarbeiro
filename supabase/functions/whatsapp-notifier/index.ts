import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const { table, action, data } = payload
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } })

    // 1. BLOQUEIO DE GATILHOS ANTIGOS
    // Ignoramos INSERTs automáticos de agendamentos e produtos para evitar duplicidade com o novo fluxo manual
    if (action === 'INSERT' && (table === 'appointments' || table === 'product_orders') && data.id !== 'test-id') {
      console.log(`[WhatsAppNotifier] Ignorando gatilho automático de ${table} (Novo fluxo manual ativo)`)
      return new Response(JSON.stringify({ skipped: true, reason: 'automatic_trigger_disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. CONFIGURAÇÕES W-API
    const { data: config } = await supabaseAdmin.from('saas_whatsapp_config').select('*').eq('is_active', true).maybeSingle()
    if (!config || !config.instance_id) throw new Error('Configuração W-API não encontrada.')

    const instId = config.instance_id.trim()
    const baseUrl = config.api_url.endsWith('/') ? config.api_url.slice(0, -1) : config.api_url
    const finalUrl = `${baseUrl}/message/send-text?instanceId=${instId}`

    // 3. BUSCAR TENANT E DESTINATÁRIOS
    let tenantName = 'Barbearia', tenantPhone = null
    const tenantId = data.tenant_id
    if (tenantId) {
      const { data: t } = await supabaseAdmin.from('tenants').select('name, phone').eq('id', tenantId).maybeSingle()
      if (t) { tenantName = t.name; tenantPhone = t.phone?.replace(/\D/g, '') }
    }

    const recipients: string[] = []
    if (data.override_phone) {
      recipients.push(data.override_phone.replace(/\D/g, ''))
    } else {
      if (tenantPhone) recipients.push(tenantPhone)
      // Se for um combo ou agendamento, tentamos pegar o telefone do barbeiro
      const barbId = data.appointment?.barber_id || data.barber_id
      if (barbId) {
        const { data: barb } = await supabaseAdmin.from('users').select('phone').eq('id', barbId).maybeSingle()
        if (barb?.phone) recipients.push(barb.phone.replace(/\D/g, ''))
      }
    }

    // 4. MONTAGEM DA MENSAGEM (FLUXO UNIFICADO)
    let message = `✂️ *NOVA NOTIFICAÇÃO - ${tenantName.toUpperCase()}*\n\n`
    message += `👤 *Cliente:* ${data.client_name || 'Não informado'}\n`
    message += `📱 *WhatsApp:* ${data.client_phone || 'Não informado'}\n`

    const appointment = data.appointment || (table === 'appointments' || data.id === 'test-id' ? data : null)
    const products = data.products || (table === 'product_orders' ? data : null)

    let totalGeral = 0

    // Parte A: Agendamento
    if (appointment) {
      const dateStr = appointment.date ? new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--'
      const sIds = appointment.service_ids || (appointment.service_id ? [appointment.service_id] : [])
      let servicesText = 'Serviço', servicesTotal = 0
      
      if (sIds.length > 0) {
        const { data: sRows } = await supabaseAdmin.from('services').select('name, price').in('id', sIds)
        if (sRows) { 
          servicesText = sRows.map(s => s.name).join(', '); 
          servicesTotal = sRows.reduce((acc, s) => acc + (s.price || 0), 0) 
        }
      }

      let barberName = 'A definir'
      const barbId = appointment.barber_id
      if (barbId) {
        const { data: bRow } = await supabaseAdmin.from('users').select('name').eq('id', barbId).maybeSingle()
        if (bRow) barberName = bRow.name
      }

      message += `📅 *Data:* ${dateStr}\n`
      message += `⏰ *Horário:* ${appointment.time || '--:--'}\n`
      message += `✂️ *Serviços:* ${servicesText}\n`
      message += `🧔 *Barbeiro:* ${barberName}\n`
      message += `💰 *Valor Serviços:* R$ ${servicesTotal.toFixed(2)}\n`
      totalGeral += servicesTotal
    }

    // Parte B: Produtos
    if (products && products.items) {
      message += `\n🛍️ *Produtos:*\n`
      products.items.forEach((it: any) => {
        message += `• ${it.quantity}x ${it.product_name} (R$ ${it.unit_price?.toFixed(2)})\n`
      })
      const pTotal = products.total || 0
      message += `💰 *Valor Produtos:* R$ ${pTotal.toFixed(2)}\n`
      totalGeral += pTotal
    }

    // Parte C: Totalizador (se houver ambos ou se for apenas produtos)
    if (appointment && products) {
      message += `\n💸 *VALOR TOTAL:* R$ ${totalGeral.toFixed(2)}\n`
    }

    message += `\n_Enviado via sistema meuBarbeiro_`

    // 5. ENVIO W-API
    for (const phone of [...new Set(recipients)]) {
      await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.api_key}` },
        body: JSON.stringify({ instanceId: instId, number: phone, phone: phone, to: phone, content: message, message: message })
      })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
