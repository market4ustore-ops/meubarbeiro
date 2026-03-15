-- ==========================================
-- CORREÇÃO DEFINITIVA: Módulo de Clientes - Acesso Público
-- ==========================================

-- 1. Garante que RLS está ativado
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_barbers ENABLE ROW LEVEL SECURITY;

-- 2. Permissões para Clientes (Público/Anon)
-- Permite que o site de agendamento veja se o cliente já existe (por telefone)
DROP POLICY IF EXISTS "public_select_clients" ON public.clients;
CREATE POLICY "public_select_clients" ON public.clients
FOR SELECT TO anon, authenticated
USING (true);

-- Permite que o site de agendamento crie o registro do cliente no CRM
DROP POLICY IF EXISTS "public_insert_clients" ON public.clients;
CREATE POLICY "public_insert_clients" ON public.clients
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. Permissões para Vínculo Cliente-Barbeiro (Público/Anon)
-- Permite vincular o cliente ao barbeiro selecionado no agendamento
DROP POLICY IF EXISTS "public_insert_client_barbers" ON public.client_barbers;
CREATE POLICY "public_insert_client_barbers" ON public.client_barbers
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Permissões para o Dono ver TODOS os clientes do seu tenant
-- (Garante que a política existente não está filtrando demais)
DROP POLICY IF EXISTS "owner_all_clients_select" ON public.clients;
CREATE POLICY "owner_all_clients_select" ON public.clients
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('OWNER', 'SUPER_ADMIN')
);

-- 5. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
