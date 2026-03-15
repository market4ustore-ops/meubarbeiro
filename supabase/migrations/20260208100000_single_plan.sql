-- Add max_products column to saas_plans if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saas_plans' AND column_name = 'max_products') THEN
        ALTER TABLE saas_plans ADD COLUMN max_products INTEGER DEFAULT 50;
    END IF;
END $$;

-- Update existing plans or insert the new single plan
-- We'll archieve others and keep/create the Profissional one as the single choice.

-- 1. Archive everyone else
UPDATE saas_plans SET status = 'ARCHIVED' WHERE name != 'Profissional';

-- 2. Upsert the Profissional plan with the new requirements
INSERT INTO saas_plans (
    id, 
    name, 
    price, 
    billing_cycle, 
    description, 
    max_barbers, 
    max_products, 
    features, 
    status, 
    is_popular
)
VALUES (
    'plan_profissional_5990',
    'Profissional',
    59.90,
    'MONTHLY',
    'Plano único com todos os recursos liberados para sua barbearia decolar.',
    3, -- Owner + 2 barbers
    50,
    '{"whatsapp": true, "inventory": true, "reports": true, "digitalCard": true, "multiBranch": true}'::jsonb,
    'ACTIVE',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    max_barbers = EXCLUDED.max_barbers,
    max_products = EXCLUDED.max_products,
    features = EXCLUDED.features,
    status = EXCLUDED.status,
    is_popular = EXCLUDED.is_popular;

-- If 'plan_profissional_5990' is not the ID of an existing "Profissional" plan, 
-- and we want to consolidate by name:
UPDATE saas_plans SET
    price = 59.90,
    max_barbers = 3,
    max_products = 50,
    features = '{"whatsapp": true, "inventory": true, "reports": true, "digitalCard": true, "multiBranch": true}'::jsonb,
    status = 'ACTIVE',
    is_popular = true
WHERE name = 'Profissional';
