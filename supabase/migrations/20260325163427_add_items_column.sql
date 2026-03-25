-- Migration: Add items column to appointments
-- Description: Adds a JSONB column to store a list of services and products associated with an appointment.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;

-- Comment to explain the structure
COMMENT ON COLUMN public.appointments.items IS 'List of items (services/products) in the appointment. Structure: [{type: "SERVICE"|"PRODUCT", id: string, name: string, price: number, quantity: number}]';
