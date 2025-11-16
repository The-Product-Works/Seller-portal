-- Fix bundle stock notification trigger to auto-dismiss when stock increases above threshold
CREATE OR REPLACE FUNCTION check_bundle_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    -- Get seller_id from bundle
    SELECT seller_id INTO v_seller_id FROM bundles WHERE bundle_id = NEW.bundle_id;

    -- If stock quantity goes above 10, dismiss existing low stock notifications
    IF (NEW.total_stock_quantity > 10) THEN
        UPDATE notifications
        SET is_read = true
        WHERE related_seller_id = v_seller_id
        AND type = 'low_stock'
        AND related_bundle_id = NEW.bundle_id
        AND is_read = false;
    END IF;

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

-- Recreate trigger
DROP TRIGGER IF EXISTS check_bundle_stock ON bundles;
CREATE TRIGGER check_bundle_stock
    AFTER INSERT OR UPDATE OF total_stock_quantity
    ON bundles
    FOR EACH ROW
    EXECUTE FUNCTION check_bundle_stock();
