-- Fix foreign key constraints to allow variant updates/deletes even when orders exist
-- Change ON DELETE RESTRICT to ON DELETE SET NULL for order_items.variant_id

-- Drop existing constraint
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE order_items
ADD CONSTRAINT order_items_variant_id_fkey 
FOREIGN KEY (variant_id) 
REFERENCES listing_variants(variant_id) 
ON DELETE SET NULL;

-- This allows:
-- 1. Deleting variants even if they have orders (variant_id becomes NULL in orders)
-- 2. Updating variant images without constraint violations
-- 3. Historical orders remain intact but variant reference becomes NULL
