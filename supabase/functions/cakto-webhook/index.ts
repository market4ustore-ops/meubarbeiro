// Supabase Edge Function: cakto-webhook
// Processa webhooks da Cakto para atualizar assinaturas

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Tipos para os eventos Cakto
interface CaktoWebhookPayload {
    event: 'purchase_approved' | 'subscription_renewed' | 'subscription_canceled' | 'refund' | 'chargeback'
    sale: {
        id: string
        product: {
            id: string
            name: string
        }
        buyer: {
            email: string
            name: string
        }
        payment: {
            method: string
            value: number
            status: string
        }
        subscription?: {
            id: string
            status: string
            next_billing_date?: string
            plan_id?: string
        }
        created_at: string
    }
    signature?: string
}

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cakto-signature',
}

// Verificar assinatura do webhook (HMAC SHA256)
async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
    if (!signature) {
        console.warn('Webhook received without signature header');
        return false;
    }

    // A Cakto geralmente envia a assinatura em hexadecimal ou base64
    // Para simplificar a implementação imediata e garantir que NUNCA seja pulada:
    if (secret === 'CHANGE_ME' || !secret) {
        console.error('CRITICAL: CAKTO_WEBHOOK_SECRET not properly configured.');
        return false;
    }

    try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureData = hexToBytes(signature);
        const isValid = await crypto.subtle.verify(
            'HMAC',
            cryptoKey,
            signatureData,
            encoder.encode(payload)
        );

        return isValid;
    } catch (err) {
        console.error('Error verifying signature:', err);
        return false;
    }
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        // Validar método
        if (req.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Obter payload
        const rawBody = await req.text()
        const payload: CaktoWebhookPayload = JSON.parse(rawBody)

        console.log('Received Cakto webhook:', payload.event)
        console.log('Raw body:', rawBody)

        // Verificar assinatura (OBRIGATÓRIO)
        const signature = req.headers.get('x-cakto-signature');
        const webhookSecret = Deno.env.get('CAKTO_WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('CRITICAL: CAKTO_WEBHOOK_SECRET not set in environment variables');
            return new Response(
                JSON.stringify({ error: 'Webhook secret not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const isSignatureValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
        if (!isSignatureValid) {
            console.error('Invalid webhook signature check failed');
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Criar cliente Supabase com service role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        // Processar evento
        const { event, sale } = payload

        switch (event) {
            case 'purchase_approved': {
                // Nova compra aprovada - criar ou atualizar assinatura
                console.log('Processing purchase_approved for:', sale.buyer.email)

                // Buscar tenant pelo email do comprador (case-insensitive)
                const { data: user, error: userError } = await supabaseAdmin
                    .from('users')
                    .select('tenant_id')
                    .ilike('email', sale.buyer.email.trim())
                    .single()

                if (userError || !user?.tenant_id) {
                    console.error('User not found:', sale.buyer.email)
                    return new Response(
                        JSON.stringify({ error: 'User not found' }),
                        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                // Buscar plano correspondente ao produto Cakto
                // Você pode mapear isso de várias formas (metadata, nome, etc)
                const { data: plan } = await supabaseAdmin
                    .from('saas_plans')
                    .select('id')
                    .eq('status', 'ACTIVE')
                    .order('price', { ascending: true })
                    .limit(1)
                    .single()

                // Criar ou atualizar assinatura
                const subscriptionData = {
                    tenant_id: user.tenant_id,
                    plan_id: plan?.id,
                    cakto_subscription_id: sale.subscription?.id || sale.id,
                    cakto_customer_id: sale.buyer.email,
                    cakto_product_id: sale.product.id,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: sale.subscription?.next_billing_date ||
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
                    updated_at: new Date().toISOString(),
                }

                const { error: subError } = await supabaseAdmin
                    .from('subscriptions')
                    .upsert(subscriptionData, {
                        onConflict: 'cakto_subscription_id',
                        ignoreDuplicates: false
                    })

                if (subError) {
                    console.error('Error creating subscription:', subError)
                    throw subError
                }

                // Registrar pagamento
                const { data: subscription } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id')
                    .eq('cakto_subscription_id', sale.subscription?.id || sale.id)
                    .single()

                if (subscription) {
                    await supabaseAdmin.from('subscription_payments').insert({
                        subscription_id: subscription.id,
                        cakto_transaction_id: sale.id,
                        amount: sale.payment.value,
                        status: 'approved',
                        payment_method: sale.payment.method,
                        paid_at: new Date().toISOString(),
                    })
                }

                // Atualizar status do tenant
                await supabaseAdmin
                    .from('tenants')
                    .update({
                        status: 'ACTIVE',
                        plan_id: plan?.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.tenant_id)

                console.log('Subscription activated for tenant:', user.tenant_id)
                break
            }

            case 'subscription_renewed': {
                // Renovação de assinatura
                console.log('Processing subscription_renewed')

                const { error } = await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        current_period_start: new Date().toISOString(),
                        current_period_end: sale.subscription?.next_billing_date ||
                            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('cakto_subscription_id', sale.subscription?.id)

                if (error) throw error

                // Registrar pagamento
                const { data: subscription } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id')
                    .eq('cakto_subscription_id', sale.subscription?.id)
                    .single()

                if (subscription) {
                    await supabaseAdmin.from('subscription_payments').insert({
                        subscription_id: subscription.id,
                        cakto_transaction_id: sale.id,
                        amount: sale.payment.value,
                        status: 'approved',
                        payment_method: sale.payment.method,
                        paid_at: new Date().toISOString(),
                    })
                }

                console.log('Subscription renewed:', sale.subscription?.id)
                break
            }

            case 'subscription_canceled': {
                // Cancelamento de assinatura
                console.log('Processing subscription_cancelled')

                const { data: subscription, error } = await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        status: 'cancelled',
                        cancelled_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('cakto_subscription_id', sale.subscription?.id)
                    .select('tenant_id')
                    .single()

                if (error) throw error

                // Atualizar tenant para status suspenso (após período atual)
                if (subscription) {
                    await supabaseAdmin
                        .from('tenants')
                        .update({
                            status: 'SUSPENDED',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', subscription.tenant_id)
                }

                console.log('Subscription canceled:', sale.subscription?.id)
                break
            }

            case 'refund': {
                // Reembolso
                console.log('Processing refund')

                const { error } = await supabaseAdmin
                    .from('subscription_payments')
                    .update({ status: 'refunded' })
                    .eq('cakto_transaction_id', sale.id)

                if (error) console.error('Error updating refund:', error)

                console.log('Refund processed:', sale.id)
                break
            }

            case 'chargeback': {
                // Chargeback
                console.log('Processing chargeback')

                const { error } = await supabaseAdmin
                    .from('subscription_payments')
                    .update({ status: 'chargeback' })
                    .eq('cakto_transaction_id', sale.id)

                if (error) console.error('Error updating chargeback:', error)

                // Suspender tenant em caso de chargeback
                const { data: payment } = await supabaseAdmin
                    .from('subscription_payments')
                    .select('subscription_id')
                    .eq('cakto_transaction_id', sale.id)
                    .single()

                if (payment) {
                    const { data: subscription } = await supabaseAdmin
                        .from('subscriptions')
                        .select('tenant_id')
                        .eq('id', payment.subscription_id)
                        .single()

                    if (subscription) {
                        await supabaseAdmin
                            .from('tenants')
                            .update({ status: 'SUSPENDED' })
                            .eq('id', subscription.tenant_id)
                    }
                }

                console.log('Chargeback processed:', sale.id)
                break
            }

            default:
                console.log('Unknown event:', event)
        }

        return new Response(
            JSON.stringify({ received: true, event }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Webhook error:', error.message)
        console.error('Stack:', error.stack)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
