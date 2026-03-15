-- Migration: 20240312_financial_module.sql

-- 1. Adicionar taxa de comissão aos usuários (barbeiros)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.0;

-- 2. Tabela de Transações Financeiras
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category text NOT NULL,
    amount numeric NOT NULL,
    description text,
    date date NOT NULL DEFAULT current_date,
    status text NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING')),
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    barber_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    commission_amount numeric DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- OWNER pode gerenciar tudo
CREATE POLICY "owner_manage_finance" ON public.financial_transactions
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()) 
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'OWNER'
    );

-- BARBER pode ver apenas transações vinculadas a ele (comissões)
CREATE POLICY "barber_view_commissions" ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (
        barber_id = auth.uid()
    );

-- 4. Função de Gatilho para Receita Automática
CREATE OR REPLACE FUNCTION public.handle_appointment_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_total_amount numeric := 0;
    v_commission_rate numeric := 0;
    v_commission_amount numeric := 0;
BEGIN
    -- Disparar apenas se status mudou para COMPLETED
    IF (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED')) THEN
        
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

        -- Inserir transação de entrada
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
            'Receita do agendamento: ' || NEW.client_name,
            NEW.date,
            'PAID',
            NEW.client_id,
            NEW.barber_id,
            NEW.id,
            v_commission_amount
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar o Trigger
DROP TRIGGER IF EXISTS tr_appointment_completed ON public.appointments;
CREATE TRIGGER tr_appointment_completed
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_appointment_completion();
