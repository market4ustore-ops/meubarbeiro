-- Migration: 20240312_checkout_pos.sql

-- 1. Adicionar campos de checkout na tabela de transações financeiras
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('PIX', 'CARD', 'CASH')),
ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0.0;

-- 2. Atualizar a função handle_appointment_completion para não duplicar se o checkout já foi feito manualmente
-- (Se o CheckoutModal inserir a transação diretamente, o trigger não deve criar outra)
-- Para isso, vamos adicionar um campo metadata ou apenas checar se já existe transação para esse appointment_id
CREATE OR REPLACE FUNCTION public.handle_appointment_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_total_amount numeric := 0;
    v_commission_rate numeric := 0;
    v_commission_amount numeric := 0;
    v_exists boolean;
BEGIN
    -- Disparar apenas se status mudou para COMPLETED
    IF (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED')) THEN
        
        -- Verificar se já existe uma transação vinculada a este agendamento (evita duplicidade do POS manual)
        SELECT EXISTS(SELECT 1 FROM public.financial_transactions WHERE appointment_id = NEW.id) INTO v_exists;
        
        IF NOT v_exists THEN
            -- Calcular valor total a partir dos serviços (tabela services)
            SELECT COALESCE(SUM(price), 0) INTO v_total_amount 
            FROM public.services 
            WHERE id IN (
                SELECT jsonb_array_elements_text(COALESCE(NEW.service_ids, '[]'::jsonb))::uuid
            );

            -- Fallback caso service_ids esteja vazio mas service_id preenchido
            IF v_total_amount = 0 AND NEW.service_id IS NOT NULL THEN
                SELECT price INTO v_total_amount FROM public.services WHERE id = NEW.service_id;
            END IF;

            -- Buscar taxa de comissão do barbeiro
            SELECT commission_rate INTO v_commission_rate FROM public.users WHERE id = NEW.barber_id;
            
            IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
                v_commission_amount := (v_total_amount * v_commission_rate) / 100;
            END IF;

            -- Inserir transação de entrada padrão (sem método de pagamento definido ainda)
            INSERT INTO public.financial_transactions (
                tenant_id,
                type,
                category,
                amount,
                description,
                date,
                status,
                client_id,
                barber_id,
                appointment_id,
                commission_amount
            ) VALUES (
                NEW.tenant_id,
                'INCOME',
                'Serviço',
                v_total_amount,
                'Receita do agendamento (Automático): ' || NEW.client_name,
                NEW.date,
                'PAID',
                NEW.client_id,
                NEW.barber_id,
                NEW.id,
                v_commission_amount
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
