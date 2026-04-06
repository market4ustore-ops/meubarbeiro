# Migração e RPCs Adicionais

-- 1. Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Função RPC para obter o tamanho do banco
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS json AS $$
DECLARE
  db_size text;
  db_size_bytes bigint;
BEGIN
  SELECT pg_size_pretty(pg_database_size(current_database())), pg_database_size(current_database())
  INTO db_size, db_size_bytes;
  
  RETURN json_build_object('size', db_size, 'bytes', db_size_bytes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
