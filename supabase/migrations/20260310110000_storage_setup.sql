-- Create Storage Buckets for Profiles and Catalog
-- These are required for image uploads in Logo, Banners, Services and Products.

-- 1. Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog', 'catalog', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "profiles Public Access" ON storage.objects;
DROP POLICY IF EXISTS "profiles Tenant Management" ON storage.objects;
DROP POLICY IF EXISTS "catalog Public Access" ON storage.objects;
DROP POLICY IF EXISTS "catalog Tenant Management" ON storage.objects;

-- 3. Set up RLS policies for 'profiles' bucket
-- Allow public read access
CREATE POLICY "profiles Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- Allow authenticated users to manage files in their own tenant folder
-- Path structure: tenant_id/folder/filename
CREATE POLICY "profiles Tenant Management"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'profiles' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  bucket_id = 'profiles' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.users WHERE id = auth.uid())
);

-- 4. Set up RLS policies for 'catalog' bucket
-- Allow public read access
CREATE POLICY "catalog Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalog');

-- Allow authenticated users to manage files in their own tenant folder
-- Path structure: tenant_id/folder/filename
CREATE POLICY "catalog Tenant Management"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'catalog' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  bucket_id = 'catalog' AND 
  (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.users WHERE id = auth.uid())
);
