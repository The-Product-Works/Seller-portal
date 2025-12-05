-- Fix Low Stock Notifications for Seller Product Listings
-- Missing trigger for seller_product_listings.total_stock_quantity

-- First, ensure the notifications table has the correct structure
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_product_id UUID;

-- The related_seller_id should reference sellers.id (not auth.users.id)
-- This is correct according to the current database schema

-- Create low stock check function for seller product listings
CREATE OR REPLACE FUNCTION check_seller_listing_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name TEXT;
    v_seller_id UUID;
BEGIN
    -- Get product name and seller_id from the listing
    SELECT 
        gp.product_name,
        spl.seller_id
    INTO v_product_name, v_seller_id
    FROM seller_product_listings spl
    LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
    WHERE spl.listing_id = NEW.listing_id;

    -- If stock quantity is 10 or less and no unread notification exists
    IF (NEW.total_stock_quantity <= 10) AND 
       v_seller_id IS NOT NULL AND
       NOT EXISTS (
           SELECT 1 FROM notifications 
           WHERE related_seller_id = v_seller_id 
           AND type = 'low_stock'
           AND related_product_id = NEW.listing_id::UUID
           AND is_read = false
       ) THEN
        -- Create notification
        INSERT INTO notifications (related_seller_id, type, title, message, related_product_id, metadata)
        VALUES (
            v_seller_id,
            'low_stock',
            'Low Stock Alert - ' || COALESCE(v_product_name, 'Product'),
            'Product "' || COALESCE(NEW.seller_title, v_product_name, 'Untitled Product') || '" is running low on stock (' || NEW.total_stock_quantity || ' remaining). Stock threshold is 10 units.',
            NEW.listing_id::UUID,
            jsonb_build_object(
                'listing_id', NEW.listing_id,
                'seller_title', NEW.seller_title,
                'current_stock', NEW.total_stock_quantity,
                'product_name', COALESCE(v_product_name, 'Product'),
                'threshold', 10
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for seller product listings low stock check
DROP TRIGGER IF EXISTS check_seller_listing_stock ON seller_product_listings;
CREATE TRIGGER check_seller_listing_stock
    AFTER INSERT OR UPDATE OF total_stock_quantity
    ON seller_product_listings
    FOR EACH ROW
    EXECUTE FUNCTION check_seller_listing_stock();

-- Fix the bundle low stock function to use sellers.user_id instead of sellers.id
CREATE OR REPLACE FUNCTION check_bundle_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    -- Get seller_id directly from bundle
    v_seller_id := NEW.seller_id;

    -- If stock quantity is 10 or less and no unread notification exists
    IF (NEW.total_stock_quantity <= 10) AND 
       v_seller_id IS NOT NULL AND
       NOT EXISTS (
           SELECT 1 FROM notifications 
           WHERE related_seller_id = v_seller_id 
           AND type = 'low_stock'
           AND related_bundle_id = NEW.bundle_id
           AND is_read = false
       ) THEN
        -- Create notification
        INSERT INTO notifications (related_seller_id, type, title, message, related_bundle_id, metadata)
        VALUES (
            v_seller_id,
            'low_stock',
            'Low Stock Alert - Bundle',
            'Bundle "' || NEW.bundle_name || '" is running low on stock (' || NEW.total_stock_quantity || ' remaining). Stock threshold is 10 units.',
            NEW.bundle_id,
            jsonb_build_object(
                'bundle_id', NEW.bundle_id,
                'bundle_name', NEW.bundle_name,
                'current_stock', NEW.total_stock_quantity,
                'threshold', 10
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for bundles
DROP TRIGGER IF EXISTS check_bundle_stock ON bundles;
CREATE TRIGGER check_bundle_stock
    AFTER INSERT OR UPDATE OF total_stock_quantity
    ON bundles
    FOR EACH ROW
    EXECUTE FUNCTION check_bundle_stock();

-- Fix the variant stock function to use sellers.user_id 
CREATE OR REPLACE FUNCTION check_listing_variant_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_product_name TEXT;
BEGIN
    -- Get seller_id and product name from listing
    SELECT 
        sp.seller_id, 
        gp.product_name
    INTO v_seller_id, v_product_name
    FROM listing_variants lv
    LEFT JOIN seller_product_listings sp ON lv.listing_id = sp.listing_id
    LEFT JOIN global_products gp ON sp.global_product_id = gp.global_product_id
    WHERE lv.listing_id = NEW.listing_id;

    -- If stock quantity is 10 or less and no unread notification exists
    IF (NEW.stock_quantity <= 10) AND 
       v_seller_id IS NOT NULL AND
       NOT EXISTS (
           SELECT 1 FROM notifications 
           WHERE related_seller_id = v_seller_id 
           AND type = 'low_stock'
           AND related_product_id = NEW.listing_id::UUID
           AND is_read = false
           AND metadata->>'variant_id' = NEW.variant_id::text
       ) THEN
        -- Create notification
        INSERT INTO notifications (related_seller_id, type, title, message, related_product_id, metadata)
        VALUES (
            v_seller_id,
            'low_stock',
            'Low Stock Alert - ' || COALESCE(v_product_name, 'Product'),
            'Variant "' || NEW.variant_name || '" is running low on stock (' || NEW.stock_quantity || ' remaining). Stock threshold is 10 units.',
            NEW.listing_id::UUID,
            jsonb_build_object(
                'listing_id', NEW.listing_id,
                'variant_id', NEW.variant_id,
                'variant_name', NEW.variant_name,
                'current_stock', NEW.stock_quantity,
                'product_name', COALESCE(v_product_name, 'Product'),
                'threshold', 10
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for variants
DROP TRIGGER IF EXISTS check_listing_variant_stock ON listing_variants;
CREATE TRIGGER check_listing_variant_stock
    AFTER INSERT OR UPDATE OF stock_quantity
    ON listing_variants
    FOR EACH ROW
    EXECUTE FUNCTION check_listing_variant_stock();

-- Add some comments for clarity
COMMENT ON FUNCTION check_seller_listing_stock() IS 'Triggers low stock notifications when seller_product_listings.total_stock_quantity <= 10';
COMMENT ON FUNCTION check_bundle_stock() IS 'Triggers low stock notifications when bundles.total_stock_quantity <= 10';
COMMENT ON FUNCTION check_listing_variant_stock() IS 'Triggers low stock notifications when listing_variants.stock_quantity <= 10';