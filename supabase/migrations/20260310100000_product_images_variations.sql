-- Migration: Multiple Product Images & Variations
-- Adds support for up to 10 images per product and admin-configurable product variations.

-- ============================================================
-- 1. PRODUCT IMAGES TABLE
-- ============================================================
CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    url text NOT NULL,
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. PRODUCT VARIATION TYPES TABLE (e.g. "Tamanho", "Cor")
-- ============================================================
CREATE TABLE public.product_variation_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. PRODUCT VARIATION OPTIONS TABLE (e.g. "P", "M", "G")
-- ============================================================
CREATE TABLE public.product_variation_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    variation_type_id uuid NOT NULL REFERENCES public.product_variation_types(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_modifier numeric DEFAULT 0,
    stock integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_manage_product_images"
ON public.product_images FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "public_view_product_images"
ON public.product_images FOR SELECT TO anon
USING (true);

-- product_variation_types
ALTER TABLE public.product_variation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_manage_variation_types"
ON public.product_variation_types FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "public_view_variation_types"
ON public.product_variation_types FOR SELECT TO anon
USING (true);

-- product_variation_options
ALTER TABLE public.product_variation_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_manage_variation_options"
ON public.product_variation_options FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "public_view_variation_options"
ON public.product_variation_options FOR SELECT TO anon
USING (true);

-- ============================================================
-- 5. INDEXES for performance
-- ============================================================
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_position ON public.product_images(product_id, position);
CREATE INDEX idx_variation_types_product_id ON public.product_variation_types(product_id);
CREATE INDEX idx_variation_options_type_id ON public.product_variation_options(variation_type_id);
CREATE INDEX idx_variation_options_product_id ON public.product_variation_options(product_id);
