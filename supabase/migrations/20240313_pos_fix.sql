-- Migration: 20240313_pos_fix.sql
-- Objetivo: Corrigir permissões de RLS para o PDV e garantir colunas necessárias.

-- 1. Garantir colunas na tabela financial_transactions
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('PIX', 'CARD', 'CASH')),
ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0.0;

-- 2. Garantir coluna de comissão nos usuários
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.0;

-- 3. Corrigir RLS para permitir INSERT por BARBER e OWNER
-- Removemos a política antiga restritiva se existir
DROP POLICY IF EXISTS "owner_manage_finance" ON public.financial_transactions;
DROP POLICY IF EXISTS "barber_view_commissions" ON public.financial_transactions;
DROP POLICY IF EXISTS "authenticated_insert_finance" ON public.financial_transactions;

-- Nova política de INSERÇÃO (Permite que qualquer autenticado insira no seu próprio tenant)
CREATE POLICY "authenticated_insert_finance" ON public.financial_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    );

-- Nova política de SELEÇÃO (OWNER vê tudo do tenant, BARBER vê o que é dele)
CREATE POLICY "authenticated_select_finance" ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        AND (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'OWNER'
            OR barber_id = auth.uid()
        )
    );

-- Nova política de UPDATE/DELETE (Somente OWNER pode editar histórico financeiro)
CREATE POLICY "owner_manage_finance" ON public.financial_transactions
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'OWNER'
    );

CREATE POLICY "owner_delete_finance" ON public.financial_transactions
    FOR DELETE TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'OWNER'
    );

-- 4. Atualizar trigger para evitar duplicidade e garantir campos
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
        
        -- Verificar se já existe uma transação vinculada a este agendamento (evita duplicidade do PDV manual)
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

            -- Inserir transação de entrada padrão (sem método definido ainda)
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
                'Receita do agendamento (Auto): ' || NEW.client_name,
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
