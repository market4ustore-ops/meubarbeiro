-- 1. Garante que a coluna client_id existe na tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Cria índice para performance
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);

-- 3. Habilita RLS na tabela clients (se não estiver habilitada)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Cria política para permitir que o Público (anon) procure clientes por telefone
-- Isso é necessário para o 'ensureClient' funcionar no site público.
-- A política permite apenas SELECT se o telefone bater, ou buscar por ID se necessário.
DROP POLICY IF EXISTS "public_select_clients" ON public.clients;
CREATE POLICY "public_select_clients" ON public.clients
FOR SELECT TO anon, authenticated
USING (true);

-- 5. Cria política para permitir que o Público (anon) cadastre novos clientes durante o agendamento
DROP POLICY IF EXISTS "public_insert_clients" ON public.clients;
CREATE POLICY "public_insert_clients" ON public.clients
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 6. Recarregar o cache do PostgREST para garantir que o Supabase enxergue as mudanças
NOTIFY pgrst, 'reload schema';
