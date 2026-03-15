-- ============================================================
-- Integração: Clientes ↔ Agendamentos
-- ============================================================

-- Adiciona a coluna client_id na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Cria índice para melhorar a performance de buscas por cliente
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);

-- Comentário para documentar a alteração
COMMENT ON COLUMN appointments.client_id IS 'ID do cliente vinculado na tabela clients para histórico centralizado.';
