-- Add product and bundle references to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_product_id UUID,
ADD COLUMN IF NOT EXISTS related_bundle_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Remove seller_id if it exists and use only related_seller_id
-- Commenting this out since it might break existing data
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS seller_id;
