-- Create general email_notifications table for tracking all email notifications
CREATE TABLE IF NOT EXISTS public.email_notifications (
  notification_id UUID NOT NULL DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL DEFAULT 'email', -- 'email', 'sms', 'push'
  recipient_type VARCHAR(20) NOT NULL, -- 'admin', 'buyer', 'seller'
  recipient_id UUID NULL, -- user_id or seller_id
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  alert_type VARCHAR(100) NOT NULL, -- See alert_type constraint for valid values
  related_order_id UUID NULL,
  related_product_id UUID NULL, -- For product-related notifications
  related_seller_id UUID NULL, -- For seller-related notifications
  related_entity_id UUID NULL, -- Can be dispute_id, review_id, report_id, etc.
  tracking_id TEXT NULL, -- Shipping tracking ID
  transaction_id TEXT NULL, -- Payment/Refund transaction ID
  sent_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
  metadata JSONB NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT email_notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT email_notifications_related_order_id_fkey FOREIGN KEY (related_order_id) 
    REFERENCES orders (order_id) ON DELETE SET NULL,
  CONSTRAINT email_notifications_recipient_id_fkey FOREIGN KEY (recipient_id)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT email_notifications_alert_type_check CHECK (
    alert_type IN (
      -- BUYER NOTIFICATIONS
      'order_confirmed',
      'payment_successful',
      'payment_failed',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'return_requested',
      'refund_initiated',
      'refund_completed',
      'welcome',
      'profile_updated',
      
      -- SELLER NOTIFICATIONS
      'new_order_received',
      'order_canceled_by_buyer',
      'return_request_received',
      'seller_refund_completed',
      'low_stock_alert',
      'product_out_of_stock',
      'account_approved',
      'new_review_rating',
      'payout_processed',
      
      -- ADMIN NOTIFICATIONS
      'admin_payment_failed',
      'admin_order_cancellation',
      'admin_return_request',
      'admin_return_received',
      'admin_dispute_raised',
      'admin_new_seller_registration',
      'admin_seller_kyc_submitted',
      'admin_report_received'
    )
  )
) TABLESPACE pg_default;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_notifications_notification_type 
  ON public.email_notifications USING btree (notification_type);

CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_type 
  ON public.email_notifications USING btree (recipient_type);

CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_id 
  ON public.email_notifications USING btree (recipient_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_alert_type 
  ON public.email_notifications USING btree (alert_type);

CREATE INDEX IF NOT EXISTS idx_email_notifications_related_order_id 
  ON public.email_notifications USING btree (related_order_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_related_product_id 
  ON public.email_notifications USING btree (related_product_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_related_seller_id 
  ON public.email_notifications USING btree (related_seller_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at 
  ON public.email_notifications USING btree (sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status 
  ON public.email_notifications USING btree (status);

-- Add comments
COMMENT ON TABLE public.email_notifications IS 'General tracking table for all email notifications (admin, buyer, seller)';
COMMENT ON COLUMN public.email_notifications.notification_type IS 'Type of notification: email, sms, push, etc.';
COMMENT ON COLUMN public.email_notifications.recipient_type IS 'Type of recipient: admin, buyer, seller';
COMMENT ON COLUMN public.email_notifications.recipient_id IS 'User ID or Seller ID of the recipient';
COMMENT ON COLUMN public.email_notifications.recipient_email IS 'Email address where notification was sent';
COMMENT ON COLUMN public.email_notifications.subject IS 'Email subject line';
COMMENT ON COLUMN public.email_notifications.alert_type IS 'Specific alert type - see constraint for full list of valid values';
COMMENT ON COLUMN public.email_notifications.related_order_id IS 'Associated order ID if notification is order-related';
COMMENT ON COLUMN public.email_notifications.related_product_id IS 'Associated product ID for product-related notifications';
COMMENT ON COLUMN public.email_notifications.related_seller_id IS 'Associated seller ID for seller-related notifications';
COMMENT ON COLUMN public.email_notifications.related_entity_id IS 'ID of related entity (dispute_id, review_id, report_id, etc.)';
COMMENT ON COLUMN public.email_notifications.tracking_id IS 'Shipping tracking ID for order shipment notifications';
COMMENT ON COLUMN public.email_notifications.transaction_id IS 'Payment or refund transaction ID';
COMMENT ON COLUMN public.email_notifications.status IS 'Delivery status: sent, delivered, failed, bounced';
COMMENT ON COLUMN public.email_notifications.metadata IS 'Additional data related to the notification';

-- Enable RLS
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Sellers can view their own email notifications
CREATE POLICY "Sellers can view their own email notifications"
ON public.email_notifications
FOR SELECT
USING (
  recipient_type = 'seller' AND 
  recipient_id = auth.uid()
);

-- Only service role can insert email notifications
CREATE POLICY "Service role can insert email notifications"
ON public.email_notifications
FOR INSERT
WITH CHECK (true);
