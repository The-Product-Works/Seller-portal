-- Simple Manual Low Stock Notification Creator
-- This will manually create notifications for testing the dashboard display

-- Create notifications for products with stock <= 10
DO $$
DECLARE
    seller_record RECORD;
    product_record RECORD;
BEGIN
    -- Loop through sellers and their low stock products
    FOR seller_record IN 
        SELECT DISTINCT s.id as seller_id, s.name as seller_name
        FROM sellers s
        JOIN seller_product_listings spl ON s.id = spl.seller_id
        WHERE spl.total_stock_quantity <= 10 
        AND spl.status = 'active'
        LIMIT 5
    LOOP
        -- For each seller, create notifications for their low stock products
        FOR product_record IN
            SELECT 
                spl.listing_id,
                spl.seller_title,
                spl.total_stock_quantity,
                gp.product_name
            FROM seller_product_listings spl
            JOIN sellers s ON spl.seller_id = s.id
            LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
            WHERE s.id = seller_record.seller_id
            AND spl.total_stock_quantity <= 10
            AND spl.status = 'active'
            LIMIT 3
        LOOP
            -- Insert notification if it doesn't exist
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
                seller_record.seller_id,
                'low_stock',
                'Low Stock Alert - ' || COALESCE(product_record.product_name, 'Product'),
                'Product "' || COALESCE(product_record.seller_title, product_record.product_name, 'Untitled Product') || '" is running low on stock (' || product_record.total_stock_quantity || ' remaining). Stock threshold is 10 units.',
                product_record.listing_id::UUID,
                jsonb_build_object(
                    'listing_id', product_record.listing_id,
                    'seller_title', product_record.seller_title,
                    'current_stock', product_record.total_stock_quantity,
                    'product_name', COALESCE(product_record.product_name, 'Product'),
                    'threshold', 10
                ),
                false
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE related_seller_id = seller_record.seller_id 
                AND type = 'low_stock'
                AND related_product_id = product_record.listing_id::UUID
                AND is_read = false
            );
            
            RAISE NOTICE 'Created notification for seller % product %', seller_record.seller_name, product_record.seller_title;
        END LOOP;
    END LOOP;
END $$;

-- Create notifications for bundles with stock <= 10
DO $$
DECLARE
    seller_record RECORD;
    bundle_record RECORD;
BEGIN
    -- Loop through sellers and their low stock bundles
    FOR seller_record IN 
        SELECT DISTINCT s.id as seller_id, s.name as seller_name
        FROM sellers s
        JOIN bundles b ON s.id = b.seller_id
        WHERE b.total_stock_quantity <= 10 
        AND b.status = 'active'
        LIMIT 5
    LOOP
        -- For each seller, create notifications for their low stock bundles
        FOR bundle_record IN
            SELECT 
                b.bundle_id,
                b.bundle_name,
                b.total_stock_quantity
            FROM bundles b
            JOIN sellers s ON b.seller_id = s.id
            WHERE s.id = seller_record.seller_id
            AND b.total_stock_quantity <= 10
            AND b.status = 'active'
            LIMIT 3
        LOOP
            -- Insert bundle notification if it doesn't exist
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
                seller_record.seller_id,
                'low_stock',
                'Low Stock Alert - Bundle',
                'Bundle "' || bundle_record.bundle_name || '" is running low on stock (' || bundle_record.total_stock_quantity || ' remaining). Stock threshold is 10 units.',
                bundle_record.bundle_id,
                jsonb_build_object(
                    'bundle_id', bundle_record.bundle_id,
                    'bundle_name', bundle_record.bundle_name,
                    'current_stock', bundle_record.total_stock_quantity,
                    'threshold', 10
                ),
                false
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE related_seller_id = seller_record.seller_id 
                AND type = 'low_stock'
                AND related_bundle_id = bundle_record.bundle_id
                AND is_read = false
            );
            
            RAISE NOTICE 'Created bundle notification for seller % bundle %', seller_record.seller_name, bundle_record.bundle_name;
        END LOOP;
    END LOOP;
END $$;

-- Show results
SELECT 
    n.*,
    s.name as seller_name,
    CASE 
        WHEN n.related_product_id IS NOT NULL THEN 'Product'
        WHEN n.related_bundle_id IS NOT NULL THEN 'Bundle'
        ELSE 'Other'
    END as notification_type
FROM notifications n
LEFT JOIN sellers s ON n.related_seller_id = s.id
WHERE n.type = 'low_stock' 
AND n.is_read = false
ORDER BY n.created_at DESC;