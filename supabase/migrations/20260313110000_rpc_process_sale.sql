-- Migration: Create process_sale RPC for atomic transactions
-- Description: Handles financial transaction, appointment/order updates, and inventory reduction in one transaction.

CREATE OR REPLACE FUNCTION process_sale(
  p_transaction JSONB,
  p_inventory_items JSONB DEFAULT '[]'::jsonb,
  p_appointment_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to update inventory
AS $$
DECLARE
  v_transaction_id UUID;
  v_item RECORD;
  v_result JSONB;
BEGIN
  -- 1. Insert Financial Transaction
  INSERT INTO financial_transactions (
    tenant_id,
    type,
    category,
    amount,
    description,
    date,
    status,
    client_id,
    barber_id,
    appointment_id,
    payment_method,
    items,
    discount_amount
  ) VALUES (
    (p_transaction->>'tenant_id')::UUID,
    p_transaction->>'type',
    p_transaction->>'category',
    (p_transaction->>'amount')::NUMERIC,
    p_transaction->>'description',
    (p_transaction->>'date')::DATE,
    p_transaction->>'status',
    (p_transaction->>'client_id')::UUID,
    (p_transaction->>'barber_id')::UUID,
    p_appointment_id,
    p_transaction->>'payment_method',
    (p_transaction->'items'),
    (p_transaction->>'discount_amount')::NUMERIC
  )
  RETURNING id INTO v_transaction_id;

  -- 2. Update Appointment if provided
  IF p_appointment_id IS NOT NULL THEN
    UPDATE appointments 
    SET status = 'COMPLETED' 
    WHERE id = p_appointment_id;
  END IF;

  -- 3. Update Product Order if provided
  IF p_order_id IS NOT NULL THEN
    UPDATE product_orders 
    SET status = 'COMPLETED' 
    WHERE id = p_order_id;
  END IF;

  -- 4. Process Inventory Items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_inventory_items) AS x(id UUID, quantity INT)
  LOOP
    UPDATE products
    SET stock = COALESCE(stock, 0) - v_item.quantity
    WHERE id = v_item.id;
    
    -- Optional: Check if stock went negative and you want to prevent it
    -- IF (SELECT stock FROM products WHERE id = v_item.id) < 0 THEN
    --   RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_item.id;
    -- END IF;
  END LOOP;

  -- Build result
  SELECT jsonb_build_object(
    'id', v_transaction_id,
    'status', 'success'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically in PostgreSQL functions on exception
  RAISE EXCEPTION 'Erro ao processar venda: %', SQLERRM;
END;
$$;
