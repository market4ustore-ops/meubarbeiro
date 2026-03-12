-- ============================================================
-- Módulo de Gestão de Clientes
-- ============================================================

-- Tabela principal de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Vínculo direto Cliente ↔ Barbeiro
CREATE TABLE IF NOT EXISTS client_barbers (
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  barber_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, barber_id)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_client_barbers_barber_id ON client_barbers(barber_id);
CREATE INDEX IF NOT EXISTS idx_client_barbers_client_id ON client_barbers(client_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_barbers ENABLE ROW LEVEL SECURITY;

-- OWNER / SUPER_ADMIN: acesso completo (SELECT)
CREATE POLICY "owner_all_clients_select" ON clients
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('OWNER', 'SUPER_ADMIN')
  );

-- OWNER / SUPER_ADMIN: INSERT
CREATE POLICY "owner_all_clients_insert" ON clients
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('OWNER', 'SUPER_ADMIN')
  );

-- OWNER / SUPER_ADMIN: UPDATE
CREATE POLICY "owner_all_clients_update" ON clients
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('OWNER', 'SUPER_ADMIN')
  );

-- OWNER / SUPER_ADMIN: DELETE
CREATE POLICY "owner_all_clients_delete" ON clients
  FOR DELETE USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('OWNER', 'SUPER_ADMIN')
  );

-- BARBER: SELECT apenas nos clientes vinculados a si
CREATE POLICY "barber_own_clients_select" ON clients
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'BARBER'
    AND (
      id IN (
        SELECT client_id FROM client_barbers
        WHERE barber_id = auth.uid()
      )
      OR
      phone IN (
        SELECT client_phone FROM appointments
        WHERE barber_id = auth.uid()
          AND tenant_id = get_user_tenant_id()
      )
    )
  );

-- BARBER: UPDATE apenas observações dos seus clientes
CREATE POLICY "barber_own_clients_update" ON clients
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'BARBER'
    AND (
      id IN (SELECT client_id FROM client_barbers WHERE barber_id = auth.uid())
      OR
      phone IN (
        SELECT client_phone FROM appointments
        WHERE barber_id = auth.uid() AND tenant_id = get_user_tenant_id()
      )
    )
  );

-- client_barbers: OWNER acesso completo
CREATE POLICY "owner_manage_client_barbers" ON client_barbers
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('OWNER', 'SUPER_ADMIN')
  );

-- client_barbers: BARBER lê apenas seus vínculos
CREATE POLICY "barber_read_own_links" ON client_barbers
  FOR SELECT USING (barber_id = auth.uid());
