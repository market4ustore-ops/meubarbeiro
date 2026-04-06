-- 1. Add suspended_at column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

-- 2. Create RPC function for hard-deleting an expired tenant (cascading)
-- This function completely wipes a tenant and all its associated data.
CREATE OR REPLACE FUNCTION delete_tenant_cascade(p_tenant_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_status public.tenant_status;
    v_suspended_at timestamp with time zone;
    v_days_suspended integer;
BEGIN
    -- Check if tenant exists and gets its status
    SELECT status, suspended_at INTO v_status, v_suspended_at
    FROM public.tenants
    WHERE id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
    END IF;

    -- Calculate days since suspension
    IF v_status = 'SUSPENDED' AND v_suspended_at IS NOT NULL THEN
        v_days_suspended := extract(day from (now() - v_suspended_at));
    ELSE
        v_days_suspended := 0;
    END IF;

    -- Validate business logic: only allow deletion if suspended for > 30 days
    IF v_status != 'SUSPENDED' OR v_days_suspended < 30 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'A exclusão total só é permitida após 30 dias de suspensão contínua.',
            'days_suspended', v_days_suspended
        );
    END IF;

    -- Proceed with cascading delete
    -- Delete order items (foreign key to product_orders)
    DELETE FROM public.product_order_items WHERE order_id IN (
        SELECT id FROM public.product_orders WHERE tenant_id = p_tenant_id
    );

    -- Delete orders
    DELETE FROM public.product_orders WHERE tenant_id = p_tenant_id;

    -- Delete appointments
    DELETE FROM public.appointments WHERE tenant_id = p_tenant_id;

    -- Delete products
    DELETE FROM public.products WHERE tenant_id = p_tenant_id;

    -- Delete categories
    DELETE FROM public.categories WHERE tenant_id = p_tenant_id;

    -- Delete services
    DELETE FROM public.barber_services WHERE tenant_id = p_tenant_id;
    DELETE FROM public.services WHERE tenant_id = p_tenant_id;
    
    -- Delete opening hours & schedules
    DELETE FROM public.opening_hours WHERE tenant_id = p_tenant_id;
    DELETE FROM public.barber_schedules WHERE tenant_id = p_tenant_id;

    -- Delete subscription data
    DELETE FROM public.subscription_payments WHERE subscription_id IN (
        SELECT id FROM public.subscriptions WHERE tenant_id = p_tenant_id
    );
    DELETE FROM public.subscriptions WHERE tenant_id = p_tenant_id;

    -- Delete whatsapp config
    DELETE FROM public.saas_whatsapp_config WHERE tenant_id = p_tenant_id;

    -- Delete clients
    DELETE FROM public.clients WHERE tenant_id = p_tenant_id;

    -- Delete users
    DELETE FROM public.users WHERE tenant_id = p_tenant_id;

    -- Finally, delete the tenant
    DELETE FROM public.tenants WHERE id = p_tenant_id;

    RETURN jsonb_build_object('success', true, 'message', 'Tenant e todos os dados associados foram excluídos com sucesso.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
