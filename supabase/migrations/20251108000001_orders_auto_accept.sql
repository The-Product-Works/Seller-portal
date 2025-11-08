-- Migration: Auto-accept orders and seller-only cancellation
-- This migration ensures orders are automatically accepted upon creation
-- and only sellers/buyers can cancel their own orders

-- 1. Update orders table to set default status to 'accepted'
-- (This is for new orders created after this migration)
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'accepted';

-- 2. Create function to automatically accept orders when they are created
CREATE OR REPLACE FUNCTION auto_accept_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Set status to 'accepted' if not explicitly provided
  IF NEW.status IS NULL OR NEW.status = 'pending' THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to call the auto-accept function before insert
DROP TRIGGER IF EXISTS auto_accept_order_trigger ON orders;
CREATE TRIGGER auto_accept_order_trigger
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_accept_order();

-- 4. Create function to handle order cancellation with proper checks
CREATE OR REPLACE FUNCTION can_cancel_order(order_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  order_seller_id UUID;
  order_buyer_id UUID;
  order_status TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get order details
  SELECT seller_id, buyer_id, status INTO order_seller_id, order_buyer_id, order_status
  FROM orders
  WHERE order_id = order_id_param;
  
  -- Check if order exists
  IF order_seller_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow cancellation only if:
  -- 1. Current user is the seller AND order is not already cancelled
  -- 2. Current user is the buyer AND order is not already cancelled
  RETURN (
    current_user_id = order_seller_id OR current_user_id = order_buyer_id
  ) AND order_status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create function for cancelling orders
CREATE OR REPLACE FUNCTION cancel_order(order_id_param UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  can_cancel BOOLEAN;
  current_user_id UUID;
  order_seller_id UUID;
  order_buyer_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if user can cancel
  can_cancel := can_cancel_order(order_id_param);
  
  IF NOT can_cancel THEN
    RETURN QUERY SELECT FALSE, 'You do not have permission to cancel this order'::TEXT;
    RETURN;
  END IF;
  
  -- Get seller and buyer info for the order
  SELECT seller_id, buyer_id INTO order_seller_id, order_buyer_id
  FROM orders
  WHERE order_id = order_id_param;
  
  -- Update order status to cancelled
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE order_id = order_id_param;
  
  RETURN QUERY SELECT TRUE, 'Order cancelled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Enable RLS on orders table if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Sellers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Buyers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

-- 8. Create policies for viewing orders
CREATE POLICY "Sellers can view their own orders" ON orders
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view their own orders" ON orders
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- 9. Create policy for creating orders (anyone authenticated can create)
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- 10. Create policy for cancelling orders (only owner can cancel)
CREATE POLICY "Users can cancel their own orders" ON orders
  FOR UPDATE
  USING (
    (auth.uid() = seller_id OR auth.uid() = buyer_id) AND status != 'cancelled'
  )
  WITH CHECK (
    (auth.uid() = seller_id OR auth.uid() = buyer_id) AND status IN ('cancelled', 'accepted', 'processing', 'delivered')
  );

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION auto_accept_order() TO authenticated;
GRANT EXECUTE ON FUNCTION can_cancel_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_order(UUID) TO authenticated;
