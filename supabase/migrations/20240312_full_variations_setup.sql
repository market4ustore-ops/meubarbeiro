-- ============================================================
-- Full Variations & Images Setup (safe to run at any time)
-- ============================================================

-- 1. Add has_variations to products (if not exists)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_variations boolean DEFAULT false;

-- ============================================================
-- 2. PRODUCT IMAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    url text NOT NULL,
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. PRODUCT VARIATION TYPES TABLE (e.g. "Tamanho", "Cor")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_variation_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. PRODUCT VARIATION OPTIONS TABLE (e.g. "P", "M", "G")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_variation_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    variation_type_id uuid NOT NULL REFERENCES public.product_variation_types(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_modifier numeric DEFAULT 0,
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 5,
    created_at timestamptz DEFAULT now()
);

-- Add min_stock if the table already existed without it
ALTER TABLE public.product_variation_options
ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 5;

-- ============================================================
-- 5. RLS POLICIES (only create if not already created)
-- ============================================================

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variation_options ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- product_images
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'tenant_manage_product_images') THEN
    CREATE POLICY "tenant_manage_product_images"
    ON public.product_images FOR ALL TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'public_view_product_images') THEN
    CREATE POLICY "public_view_product_images"
    ON public.product_images FOR SELECT TO anon
    USING (true);
  END IF;

  -- product_variation_types
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variation_types' AND policyname = 'tenant_manage_variation_types') THEN
    CREATE POLICY "tenant_manage_variation_types"
    ON public.product_variation_types FOR ALL TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variation_types' AND policyname = 'public_view_variation_types') THEN
    CREATE POLICY "public_view_variation_types"
    ON public.product_variation_types FOR SELECT TO anon
    USING (true);
  END IF;

  -- product_variation_options
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variation_options' AND policyname = 'tenant_manage_variation_options') THEN
    CREATE POLICY "tenant_manage_variation_options"
    ON public.product_variation_options FOR ALL TO authenticated
    USING (tenant_id = get_user_tenant_id())
    WITH CHECK (tenant_id = get_user_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variation_options' AND policyname = 'public_view_variation_options') THEN
    CREATE POLICY "public_view_variation_options"
    ON public.product_variation_options FOR SELECT TO anon
    USING (true);
  END IF;
END $$;

-- ============================================================
-- 6. INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON public.product_images(product_id, position);
CREATE INDEX IF NOT EXISTS idx_variation_types_product_id ON public.product_variation_types(product_id);
CREATE INDEX IF NOT EXISTS idx_variation_options_type_id ON public.product_variation_options(variation_type_id);
CREATE INDEX IF NOT EXISTS idx_variation_options_product_id ON public.product_variation_options(product_id);
