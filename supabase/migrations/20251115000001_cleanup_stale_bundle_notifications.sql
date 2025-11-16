-- First ensure the related_bundle_id column exists
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_bundle_id UUID;

-- Add metadata column if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- One-time cleanup: Dismiss stale bundle low stock notifications where stock is now above threshold
-- This finds all low stock notifications for bundles that currently have stock > 10
UPDATE notifications
SET is_read = true
WHERE id IN (
    SELECT n.id
    FROM notifications n
    INNER JOIN bundles b ON n.related_bundle_id = b.bundle_id
    WHERE n.type = 'low_stock'
    AND n.is_read = false
    AND b.total_stock_quantity > 10
);

-- Verify the cleanup - show current state of bundle notifications
SELECT 
    n.id,
    n.title,
    n.message,
    n.is_read,
    n.related_bundle_id,
    b.bundle_name,
    b.total_stock_quantity
FROM notifications n
INNER JOIN bundles b ON n.related_bundle_id = b.bundle_id
WHERE n.type = 'low_stock'
AND n.related_bundle_id IS NOT NULL
ORDER BY n.created_at DESC
LIMIT 50;
