-- 20260407190000_update_whatsapp_providers.sql
-- Atualiza a restrição de provedores para incluir Uazapi e W-API

-- 1. Remover a check constraint antiga
ALTER TABLE public.saas_whatsapp_config 
DROP CONSTRAINT IF EXISTS saas_whatsapp_config_provider_check;

-- 2. Adicionar a nova check constraint com os novos provedores
ALTER TABLE public.saas_whatsapp_config 
ADD CONSTRAINT saas_whatsapp_config_provider_check 
CHECK (provider IN ('ZAVU', 'EVOLUTION', 'UAZAPI', 'WAPI'));

COMMENT ON COLUMN public.saas_whatsapp_config.provider IS 'Provedor de WhatsApp (ZAVU, EVOLUTION, UAZAPI, WAPI)';
