-- Update order_returns status CHECK constraint to remove 'refunded'
-- Sellers should not be able to set status to 'refunded' directly

ALTER TABLE public.order_returns
DROP CONSTRAINT IF EXISTS order_returns_status_check;

ALTER TABLE public.order_returns
ADD CONSTRAINT order_returns_status_check
CHECK (status = ANY (ARRAY[
  'initiated'::text,
  'seller_review'::text,
  'pickup_scheduled'::text,
  'picked_up'::text,
  'quality_check'::text,
  'approved'::text,
  'rejected'::text,
  'completed'::text
]));