-- Add min_stock to product_variation_options
ALTER TABLE public.product_variation_options 
ADD COLUMN min_stock integer DEFAULT 5;
