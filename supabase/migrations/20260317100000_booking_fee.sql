-- Add booking fee columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS booking_fee_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS booking_fee_type TEXT DEFAULT 'percentage' CHECK (booking_fee_type IN ('percentage', 'fixed'));
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS booking_fee_value NUMERIC DEFAULT 0;
