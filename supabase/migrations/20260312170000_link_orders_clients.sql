-- Migration to link product_orders to clients

-- 1. Add client_id column to product_orders
ALTER TABLE public.product_orders ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- 2. Update RPC to handle client_id
CREATE OR REPLACE FUNCTION public.create_product_order(
    p_tenant_id uuid, 
    p_client_name text, 
    p_client_phone text, 
    p_total numeric, 
    p_items jsonb,
    p_client_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- Insert Order
  INSERT INTO public.product_orders (tenant_id, client_id, client_name, client_phone, total, status)
  VALUES (p_tenant_id, p_client_id, p_client_name, p_client_phone, p_total, 'PENDING')
  RETURNING id INTO v_order_id;

  -- Insert Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.product_order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'product_name'),
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_order_id, 'status', 'PENDING');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
