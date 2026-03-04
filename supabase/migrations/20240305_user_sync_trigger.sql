-- Função para lidar com a criação de novos usuários (Sync Auth -> Public)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, tenant_id, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'BARBER'::public.user_role),
    (new.raw_user_meta_data->>'tenant_id')::uuid,
    COALESCE((new.raw_user_meta_data->>'status')::public.barber_status, 'ONLINE'::public.barber_status)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = COALESCE(EXCLUDED.role, public.users.role),
    tenant_id = COALESCE(EXCLUDED.tenant_id, public.users.tenant_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar a função após o insert no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
