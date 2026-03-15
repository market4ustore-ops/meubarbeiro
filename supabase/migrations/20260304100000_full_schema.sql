-- full_schema.sql: Migração completa do MeuBarbeiro SaaS (Versão limpa sem aspas)

-- 1. ENUMS
CREATE TYPE public.appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE public.barber_status AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE public.billing_cycle AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE public.order_status AS ENUM ('PENDING', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('approved', 'refunded', 'chargeback');
CREATE TYPE public.plan_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE public.service_category AS ENUM ('CORTE', 'BARBA', 'COMBO', 'OUTROS');
CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'cancelled', 'expired');
CREATE TYPE public.tenant_status AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED');
CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'OWNER', 'BARBER');

-- 2. TABELAS
CREATE TABLE public.saas_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL,
    billing_cycle public.billing_cycle DEFAULT 'MONTHLY'::public.billing_cycle,
    description text,
    max_barbers integer,
    max_products integer DEFAULT 50,
    features jsonb DEFAULT '{}'::jsonb,
    status public.plan_status DEFAULT 'ACTIVE'::public.plan_status,
    is_popular boolean DEFAULT false,
    cakto_checkout_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    email text NOT NULL,
    phone text,
    status public.tenant_status DEFAULT 'TRIAL'::public.tenant_status,
    trial_ends_at timestamp with time zone,
    plan_id uuid REFERENCES public.saas_plans(id),
    logo text,
    logo_url text,
    banner_url text,
    primary_color text DEFAULT '#10b981'::text,
    description text,
    street text,
    number text,
    neighborhood text,
    city text,
    state text,
    zip text,
    instagram_url text,
    facebook_url text,
    scheduling_enabled boolean DEFAULT true,
    digital_card_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.users (
    id uuid PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    avatar text,
    role public.user_role DEFAULT 'BARBER'::public.user_role,
    status public.barber_status DEFAULT 'ONLINE'::public.barber_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    name text NOT NULL,
    description text,
    color text DEFAULT '#10b981'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    name text NOT NULL,
    category public.service_category DEFAULT 'OUTROS'::public.service_category,
    duration integer NOT NULL,
    price numeric NOT NULL,
    promo_price numeric,
    active boolean DEFAULT true,
    description text,
    featured boolean DEFAULT false,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    category_id uuid REFERENCES public.categories(id),
    name text NOT NULL,
    price numeric NOT NULL,
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 5,
    image text,
    image_url text,
    featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    service_id uuid REFERENCES public.services(id),
    barber_id uuid REFERENCES public.users(id),
    client_name text NOT NULL,
    client_phone text NOT NULL,
    date date NOT NULL,
    time text NOT NULL,
    status public.appointment_status DEFAULT 'PENDING'::public.appointment_status,
    notes text,
    total_duration integer DEFAULT 30,
    service_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.product_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    client_name text NOT NULL,
    client_phone text NOT NULL,
    total numeric NOT NULL,
    status public.order_status DEFAULT 'PENDING'::public.order_status,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.product_order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.product_orders(id),
    product_id uuid REFERENCES public.products(id),
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL
);

CREATE TABLE public.opening_hours (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    day text NOT NULL,
    is_open boolean DEFAULT true,
    open_time text DEFAULT '09:00'::text,
    close_time text DEFAULT '18:00'::text
);

CREATE TABLE public.barber_schedules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id),
    user_id uuid REFERENCES public.users(id),
    day text NOT NULL,
    is_working boolean DEFAULT true,
    start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    end_time time without time zone DEFAULT '18:00:00'::time without time zone,
    lunch_start time without time zone,
    lunch_end time without time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.barber_services (
    tenant_id uuid REFERENCES public.tenants(id),
    user_id uuid REFERENCES public.users(id),
    service_id uuid REFERENCES public.services(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, service_id)
);

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id),
    plan_id uuid REFERENCES public.saas_plans(id),
    status public.subscription_status DEFAULT 'pending'::public.subscription_status,
    cakto_subscription_id text,
    cakto_customer_id text,
    cakto_product_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.subscription_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES public.subscriptions(id),
    cakto_transaction_id text,
    amount numeric NOT NULL,
    status public.payment_status NOT NULL,
    payment_method text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. FUNCTIONS & RPCs
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_appointments_for_date(p_tenant_id uuid, p_date date)
RETURNS TABLE(appointment_time text, total_duration integer, status public.appointment_status) AS $$
  SELECT time, total_duration, status
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
  AND date = p_date
  AND status != 'CANCELLED';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_product_order(p_tenant_id uuid, p_client_name text, p_client_phone text, p_total numeric, p_items jsonb)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- Insert Order
  INSERT INTO public.product_orders (tenant_id, client_name, client_phone, total, status)
  VALUES (p_tenant_id, p_client_name, p_client_phone, p_total, 'PENDING')
  RETURNING id INTO v_order_id;

  -- Insert Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.product_order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_order_id, 'status', 'PENDING');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.register_new_tenant(
    p_owner_id uuid,
    p_owner_name text,
    p_owner_email text,
    p_shop_name text,
    p_shop_slug text,
    p_shop_phone text,
    p_plan_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Create the tenant
    INSERT INTO public.tenants (name, slug, email, phone, plan_id, status)
    VALUES (p_shop_name, p_shop_slug, p_owner_email, p_shop_phone, p_plan_id, 'ACTIVE')
    RETURNING id INTO v_tenant_id;

    -- 2. Create the owner profile in public.users
    INSERT INTO public.users (id, tenant_id, name, email, role)
    VALUES (p_owner_id, v_tenant_id, p_owner_name, p_owner_email, 'OWNER')
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email
    RETURNING id INTO v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'user_id', v_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS POLICIES
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_active_plans ON public.saas_plans FOR SELECT USING (status = 'ACTIVE'::public.plan_status);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY super_admin_all_tenants ON public.tenants FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY owner_select_own_tenant ON public.tenants FOR SELECT TO authenticated USING (id = get_user_tenant_id());
CREATE POLICY public_select_active_tenants ON public.tenants FOR SELECT TO anon USING (status <> 'SUSPENDED'::public.tenant_status);
CREATE POLICY owner_update_own_tenant ON public.tenants FOR UPDATE TO authenticated USING (id = get_user_tenant_id()) WITH CHECK (id = get_user_tenant_id());

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_profile ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY tenant_select_users ON public.users FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_select_online_barbers ON public.users FOR SELECT TO anon USING (status = 'ONLINE'::public.barber_status);
CREATE POLICY owner_insert_users ON public.users FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'OWNER'::public.user_role AND u.tenant_id = users.tenant_id));
CREATE POLICY owner_update_users ON public.users FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'OWNER'::public.user_role AND u.tenant_id = users.tenant_id));
CREATE POLICY owner_delete_users ON public.users FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'OWNER'::public.user_role AND u.tenant_id = users.tenant_id));
CREATE POLICY update_own_profile ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_services ON public.services FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY owner_insert_services ON public.services FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY owner_update_services ON public.services FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY owner_delete_services ON public.services FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_select_active_services ON public.services FOR SELECT TO anon USING (active = true);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_appointments ON public.appointments FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_insert_appointments ON public.appointments FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_update_appointments ON public.appointments FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_insert_appointments ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_products ON public.products FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_insert_products ON public.products FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_update_products ON public.products FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_delete_products ON public.products FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_select_available_products ON public.products FOR SELECT TO anon USING (stock > 0);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_categories ON public.categories FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_manage_categories ON public.categories FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_select_categories ON public.categories FOR SELECT TO anon USING (true);

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_orders ON public.product_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_update_orders ON public.product_orders FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_insert_orders ON public.product_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.product_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_order_items ON public.product_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.product_orders WHERE product_orders.id = product_order_items.order_id AND product_orders.tenant_id = get_user_tenant_id()));
CREATE POLICY public_insert_order_items ON public.product_order_items FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select_hours ON public.opening_hours FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY tenant_manage_hours ON public.opening_hours FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY public_select_hours ON public.opening_hours FOR SELECT TO anon USING (true);

ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_select_schedules ON public.barber_schedules FOR SELECT TO public USING (true);
CREATE POLICY auth_manage_schedules ON public.barber_schedules FOR ALL TO authenticated USING (tenant_id IN (SELECT ut.tenant_id FROM public.users ut WHERE ut.id = auth.uid()));

ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_select_specialties ON public.barber_services FOR SELECT TO public USING (true);
CREATE POLICY auth_manage_specialties ON public.barber_services FOR ALL TO authenticated USING (tenant_id IN (SELECT ut.tenant_id FROM public.users ut WHERE ut.id = auth.uid()));

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_tenant_subscriptions ON public.subscriptions FOR SELECT TO public USING (tenant_id IN (SELECT ut.tenant_id FROM public.users ut WHERE ut.id = auth.uid()));
CREATE POLICY superadmin_select_all_subscriptions ON public.subscriptions FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'SUPER_ADMIN'::public.user_role));
CREATE POLICY superadmin_manage_all_subscriptions ON public.subscriptions FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'SUPER_ADMIN'::public.user_role));

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select_own_payments ON public.subscription_payments FOR SELECT TO public USING (subscription_id IN (SELECT s.id FROM public.subscriptions s JOIN public.users u ON u.tenant_id = s.tenant_id WHERE u.id = auth.uid()));
CREATE POLICY superadmin_select_all_payments ON public.subscription_payments FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'SUPER_ADMIN'::public.user_role));
CREATE POLICY superadmin_manage_all_payments ON public.subscription_payments FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'SUPER_ADMIN'::public.user_role));
