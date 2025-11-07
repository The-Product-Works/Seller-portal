-- Update notifications table to add seller and product references
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS related_product_id UUID,
ADD COLUMN IF NOT EXISTS related_bundle_id UUID;

-- Drop old seller_id column and make related_seller_id the primary seller reference
ALTER TABLE public.notifications
DROP COLUMN IF EXISTS seller_id;

-- Create an improved low stock check function for listing_variants
CREATE OR REPLACE FUNCTION check_listing_variant_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_product_name TEXT;
BEGIN
    -- Get seller_id and product name from listing
    SELECT sp.seller_id, gp.product_name
    INTO v_seller_id, v_product_name
    FROM seller_product_listings sp
    LEFT JOIN global_products gp ON sp.global_product_id = gp.product_id
    WHERE sp.listing_id = NEW.listing_id;

    -- If stock quantity is 10 or less and no unread notification exists
    IF (NEW.stock_quantity <= 10) AND 
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
            'Variant "' || NEW.variant_name || '" is running low on stock (' || NEW.stock_quantity || ' remaining). Stock threshold is 10 units.',
            NEW.listing_id::UUID,
            jsonb_build_object(
                'product_id', NEW.listing_id,
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

-- Drop old trigger if it exists
DROP TRIGGER IF EXISTS check_product_stock ON products;

-- Create trigger for listing variants low stock check
DROP TRIGGER IF EXISTS check_listing_variant_stock ON listing_variants;
CREATE TRIGGER check_listing_variant_stock
    AFTER INSERT OR UPDATE OF stock_quantity
    ON listing_variants
    FOR EACH ROW
    EXECUTE FUNCTION check_listing_variant_stock();

-- Create similar function for bundles
CREATE OR REPLACE FUNCTION check_bundle_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    -- Get seller_id from bundle
    SELECT seller_id INTO v_seller_id FROM bundles WHERE bundle_id = NEW.bundle_id;

    -- If stock quantity is 10 or less and no unread notification exists
    IF (NEW.total_stock_quantity <= 10) AND 
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

-- Create trigger for bundles low stock check
DROP TRIGGER IF EXISTS check_bundle_stock ON bundles;
CREATE TRIGGER check_bundle_stock
    AFTER INSERT OR UPDATE OF total_stock_quantity
    ON bundles
    FOR EACH ROW
    EXECUTE FUNCTION check_bundle_stock();
