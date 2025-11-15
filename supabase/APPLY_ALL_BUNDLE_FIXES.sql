-- Run this complete migration in Supabase SQL Editor to fix all bundle issues
-- This combines all three migrations into one file

-- ============================================================================
-- MIGRATION 1: Fix bundle stock notification trigger
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 2: Add missing columns and cleanup stale notifications
-- ============================================================================

-- First ensure the related_bundle_id column exists
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_bundle_id UUID;

-- Add metadata column if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- One-time cleanup: Dismiss stale bundle low stock notifications where stock is now above threshold
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

-- ============================================================================
-- MIGRATION 3: Fix RLS policies for bundles table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Sellers can insert their own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can view their own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can update their own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can delete their own bundles" ON bundles;
DROP POLICY IF EXISTS "Anyone can view published bundles" ON bundles;
DROP POLICY IF EXISTS "Anyone can view active bundles" ON bundles;
DROP POLICY IF EXISTS "Anyone can view bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can insert own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can update own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can delete own bundles" ON bundles;

-- Recreate policies with correct auth check through sellers table
CREATE POLICY "Sellers can insert their own bundles"
  ON bundles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view their own bundles"
  ON bundles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own bundles"
  ON bundles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete their own bundles"
  ON bundles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

-- Anyone can view active bundles
CREATE POLICY "Anyone can view active bundles"
  ON bundles FOR SELECT
  USING (status = 'active');

-- ============================================================================
-- Verification: Show current state of bundle notifications
-- ============================================================================

SELECT 
    n.id,
    n.title,
    n.message,
    n.is_read,
    n.related_bundle_id,
    b.bundle_name,
    b.total_stock_quantity,
    b.seller_id
FROM notifications n
INNER JOIN bundles b ON n.related_bundle_id = b.bundle_id
WHERE n.type = 'low_stock'
AND n.related_bundle_id IS NOT NULL
ORDER BY n.created_at DESC
LIMIT 50;
