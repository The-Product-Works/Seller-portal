-- Debug Low Stock Issue - Check Current State
-- Run this in your Supabase SQL Editor to see what's happening

-- 1. Check notifications table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any existing low_stock notifications
SELECT COUNT(*) as existing_low_stock_notifications
FROM notifications 
WHERE type = 'low_stock';

-- 3. Check some seller data to understand the relationship
SELECT 
    s.id as seller_id,
    s.user_id,
    s.name,
    COUNT(spl.listing_id) as product_count
FROM sellers s
LEFT JOIN seller_product_listings spl ON s.id = spl.seller_id
GROUP BY s.id, s.user_id, s.name
LIMIT 10;

-- 4. Check products with low stock
SELECT 
    spl.listing_id,
    spl.seller_title,
    spl.total_stock_quantity,
    s.name as seller_name,
    s.user_id
FROM seller_product_listings spl
JOIN sellers s ON spl.seller_id = s.id
WHERE spl.total_stock_quantity <= 10
AND spl.status = 'active'
LIMIT 10;

-- 5. Check bundles with low stock
SELECT 
    b.bundle_id,
    b.bundle_name,
    b.total_stock_quantity,
    s.name as seller_name,
    s.user_id
FROM bundles b
JOIN sellers s ON b.seller_id = s.id
WHERE b.total_stock_quantity <= 10
AND b.status = 'active'
LIMIT 10;

-- 6. Check existing triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
OR trigger_name LIKE '%notification%';