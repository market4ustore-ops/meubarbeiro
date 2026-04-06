-- 20260404120000_whatsapp_notifications_triggers.sql
-- Triggers para disparar notificações WhatsApp via Uazapi

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Função de disparo de notificação
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_payload JSONB;
BEGIN
    -- Montar payload unificado
    v_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'data', row_to_json(NEW)
    );

    -- Disparar chamada assíncrona para a Edge Function
    -- OBS: Usamos um bloco EXCEPTION para garantir que falhas na rede/função não travem a transação do banco
    BEGIN
        PERFORM extensions.http_post(
            'https://mxdqklklnequjdfikvvf.supabase.co/functions/v1/whatsapp-notifier',
            v_payload::text,
            'application/json'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros de rede para não quebrar o commit principal
        RAISE WARNING 'Falha ao disparar gatilho de notificação WhatsApp: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para Agendamentos
DROP TRIGGER IF EXISTS tr_whatsapp_appointment_insert ON public.appointments;
CREATE TRIGGER tr_whatsapp_appointment_insert
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_whatsapp_notification();

-- 4. Trigger para Pedidos de Produtos
DROP TRIGGER IF EXISTS tr_whatsapp_order_insert ON public.product_orders;
CREATE TRIGGER tr_whatsapp_order_insert
AFTER INSERT ON public.product_orders
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_whatsapp_notification();

COMMENT ON FUNCTION public.fn_trigger_whatsapp_notification() IS 'Dispara eventos para a Edge Function de notificações WhatsApp (Uazapi).';
