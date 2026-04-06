-- 20260406150000_saas_kanban.sql
-- Tabela de tarefas do Kanban para o Super Admin SaaS

-- 1. Criação da Tabela
CREATE TABLE IF NOT EXISTS public.saas_kanban_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'DOING', 'DONE')),
    priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    label text DEFAULT 'FEATURE' CHECK (label IN ('BUG', 'FEATURE', 'SUPPORT', 'FINANCIAL')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.saas_kanban_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso (Apenas SUPER_ADMIN)
DROP POLICY IF EXISTS super_admin_all_tasks ON public.saas_kanban_tasks;
CREATE POLICY super_admin_all_tasks ON public.saas_kanban_tasks
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- 4. Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_saas_kanban_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_saas_kanban_updated_at
BEFORE UPDATE ON public.saas_kanban_tasks
FOR EACH ROW EXECUTE FUNCTION public.handle_saas_kanban_updated_at();

-- 5. Comentários
COMMENT ON TABLE public.saas_kanban_tasks IS 'Tarefas internas e atividades de gestão do Super Admin SaaS.';
