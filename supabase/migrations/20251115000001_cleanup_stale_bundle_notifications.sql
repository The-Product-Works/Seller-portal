-- One-time cleanup: Dismiss stale bundle low stock notifications where stock is now above threshold
-- Run this after applying the trigger fix migration

UPDATE notifications n
SET is_read = true
FROM bundles b
WHERE n.related_bundle_id = b.bundle_id
AND n.type = 'low_stock'
AND n.is_read = false
AND b.total_stock_quantity > 10;

-- Verify the cleanup
SELECT 
    n.id,
    n.title,
    n.message,
    n.is_read,
    n.related_bundle_id,
    b.bundle_name,
    b.total_stock_quantity
FROM notifications n
JOIN bundles b ON n.related_bundle_id = b.bundle_id
WHERE n.type = 'low_stock'
AND n.related_bundle_id IS NOT NULL
ORDER BY n.created_at DESC
LIMIT 50;
