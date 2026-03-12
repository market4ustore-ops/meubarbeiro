-- Add has_variations column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_variations boolean DEFAULT false;
