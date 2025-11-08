-- Create order_cancellations table
CREATE TABLE public.order_cancellations (
  cancellation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  cancelled_by uuid NOT NULL,
  cancelled_by_role text NOT NULL,
  reason text NULL,
  refund_status text NULL DEFAULT 'pending'::text,
  cancelled_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT order_cancellations_pkey PRIMARY KEY (cancellation_id),
  CONSTRAINT order_cancellations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id),
  CONSTRAINT order_cancellations_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT order_cancellations_cancelled_by_role_check CHECK (
    cancelled_by_role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text])
  ),
  CONSTRAINT order_cancellations_refund_status_check CHECK (
    refund_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])
  )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON public.order_cancellations USING btree (order_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_order_cancellations_cancelled_by ON public.order_cancellations USING btree (cancelled_by) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "sellers_view_own_order_cancellations" ON public.order_cancellations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.order_id = order_cancellations.order_id 
      AND o.seller_id = (SELECT id FROM sellers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "buyers_view_own_order_cancellations" ON public.order_cancellations
  FOR ALL USING (cancelled_by = auth.uid());