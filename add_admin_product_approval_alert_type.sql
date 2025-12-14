-- Migration: Add 'admin_product_approval_required' to email_notifications alert_type constraint
-- Date: December 12, 2025
-- Description: Adds new alert type for admin product approval notifications when sellers submit/update products

-- Step 1: Drop existing constraint
ALTER TABLE email_notifications
DROP CONSTRAINT IF EXISTS email_notifications_alert_type_check;

-- Step 2: Add updated constraint with new alert type
ALTER TABLE email_notifications
ADD CONSTRAINT email_notifications_alert_type_check
CHECK (alert_type::text = ANY (ARRAY[
  -- Buyer notifications
  'order_confirmed'::character varying::text,
  'payment_successful'::character varying::text,
  'payment_failed'::character varying::text,
  'order_shipped'::character varying::text,
  'order_delivered'::character varying::text,
  'order_cancelled'::character varying::text,
  'return_requested'::character varying::text,
  'refund_initiated'::character varying::text,
  'refund_completed'::character varying::text,
  'welcome'::character varying::text,
  'profile_updated'::character varying::text,
  
  -- Seller notifications
  'new_order_received'::character varying::text,
  'order_canceled_by_buyer'::character varying::text,
  'return_request_received'::character varying::text,
  'seller_refund_completed'::character varying::text,
  'low_stock_alert'::character varying::text,
  'product_out_of_stock'::character varying::text,
  'account_approved'::character varying::text,
  'new_review_rating'::character varying::text,
  'payout_processed'::character varying::text,
  
  -- Admin notifications
  'admin_payment_failed'::character varying::text,
  'admin_order_cancellation'::character varying::text,
  'admin_return_request'::character varying::text,
  'admin_return_received'::character varying::text,
  'admin_dispute_raised'::character varying::text,
  'admin_new_seller_registration'::character varying::text,
  'admin_seller_kyc_submitted'::character varying::text,
  'admin_report_received'::character varying::text,
  'admin_product_approval_required'::character varying::text  -- NEW: Product approval notification
]));

-- Verify the constraint was added successfully
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'email_notifications_alert_type_check'
  AND conrelid = 'email_notifications'::regclass;
