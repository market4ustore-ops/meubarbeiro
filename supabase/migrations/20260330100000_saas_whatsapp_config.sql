-- 20260330100000_saas_whatsapp_config.sql: Configuração de WhatsApp Centralizada no SaaS

-- Tabela para configuração global (acessível apenas pelo Super Admin)
CREATE TABLE IF NOT EXISTS public.saas_whatsapp_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider text NOT NULL CHECK (provider IN ('ZAVU', 'EVOLUTION')),
    is_active boolean DEFAULT false,
    api_url text, -- URL para Evolution API
    api_key text NOT NULL, -- Token mestre
    instance_id text NOT NULL, -- ID da instância/Sender ID
    template_name text, -- Para Zavu (Template oficial)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Garantir que exista apenas uma configuração global (opcionalmente)
-- Ou ao menos uma política de RLS restrita
ALTER TABLE public.saas_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas Super Admins podem gerenciar config global"
    ON public.saas_whatsapp_config
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'SUPER_ADMIN'
        )
    );

-- Inserir um registro inicial padrão (desativado)
INSERT INTO public.saas_whatsapp_config (provider, is_active, api_key, instance_id)
VALUES ('ZAVU', false, 'PLACEHOLDER_KEY', 'PLACEHOLDER_INSTANCE')
ON CONFLICT DO NOTHING;
