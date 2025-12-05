-- Test Low Stock Notifications by Manually Creating Some Alerts
-- Use this to test the notification system while we fix the triggers

-- First, let's see what sellers and products we have
SELECT 
    s.id as seller_id, 
    s.user_id, 
    s.name as seller_name,
    spl.listing_id,
    spl.seller_title,
    spl.total_stock_quantity,
    gp.product_name
FROM sellers s
LEFT JOIN seller_product_listings spl ON s.id = spl.seller_id
LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
WHERE spl.status = 'active'
ORDER BY s.name, spl.seller_title
LIMIT 20;

-- Manually insert a test low stock notification for the first active seller
INSERT INTO notifications (
    related_seller_id, 
    type, 
    title, 
    message, 
    related_product_id, 
    metadata,
    is_read
) 
SELECT 
    s.user_id,
    'low_stock',
    'Low Stock Alert - ' || COALESCE(gp.product_name, 'Product'),
    'Product "' || COALESCE(spl.seller_title, gp.product_name, 'Untitled Product') || '" is running low on stock (' || spl.total_stock_quantity || ' remaining). Stock threshold is 10 units.',
    spl.listing_id::UUID,
    jsonb_build_object(
        'listing_id', spl.listing_id,
        'seller_title', spl.seller_title,
        'current_stock', spl.total_stock_quantity,
        'product_name', COALESCE(gp.product_name, 'Product'),
        'threshold', 10
    ),
    false
FROM sellers s
JOIN seller_product_listings spl ON s.id = spl.seller_id
LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
WHERE spl.status = 'active' 
AND spl.total_stock_quantity <= 10
AND NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE related_seller_id = s.user_id 
    AND type = 'low_stock'
    AND related_product_id = spl.listing_id::UUID
    AND is_read = false
)
LIMIT 5;

-- Test bundle low stock notifications
INSERT INTO notifications (
    related_seller_id,
    type,
    title,
    message,
    related_bundle_id,
    metadata,
    is_read
)
SELECT 
    s.user_id,
    'low_stock',
    'Low Stock Alert - Bundle',
    'Bundle "' || b.bundle_name || '" is running low on stock (' || b.total_stock_quantity || ' remaining). Stock threshold is 10 units.',
    b.bundle_id,
    jsonb_build_object(
        'bundle_id', b.bundle_id,
        'bundle_name', b.bundle_name,
        'current_stock', b.total_stock_quantity,
        'threshold', 10
    ),
    false
FROM sellers s
JOIN bundles b ON s.id = b.seller_id
WHERE b.status = 'active'
AND b.total_stock_quantity <= 10
AND NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE related_seller_id = s.user_id 
    AND type = 'low_stock'
    AND related_bundle_id = b.bundle_id
    AND is_read = false
)
LIMIT 5;

-- Check what notifications were created
SELECT 
    n.*,
    s.name as seller_name
FROM notifications n
LEFT JOIN sellers s ON n.related_seller_id = s.user_id
WHERE n.type = 'low_stock' 
AND n.is_read = false
ORDER BY n.created_at DESC
LIMIT 10;