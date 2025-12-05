-- Fix foreign key constraints for seller_payout_items to allow order_items updates/deletes
-- This fixes the error: "violates foreign key constraint seller_payout_items_order_item_id_fkey"

-- The issue: seller_payout_items references order_items with ON DELETE RESTRICT
-- This prevents editing product/variant details because it tries to update order_items

-- Solution: Change the foreign key constraints to ON DELETE SET NULL
-- This allows order_items to be updated/deleted while preserving payout history

-- 1. Drop existing foreign key constraints that are too restrictive
ALTER TABLE seller_payout_items 
DROP CONSTRAINT IF EXISTS seller_payout_items_order_item_id_fkey;

ALTER TABLE seller_payout_items 
DROP CONSTRAINT IF EXISTS seller_payout_items_order_id_fkey;

-- 2. Recreate with ON DELETE SET NULL to allow updates
ALTER TABLE seller_payout_items
ADD CONSTRAINT seller_payout_items_order_item_id_fkey 
FOREIGN KEY (order_item_id) 
REFERENCES order_items(order_item_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE seller_payout_items
ADD CONSTRAINT seller_payout_items_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES orders(order_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 3. Also fix the variant constraint in order_items if it hasn't been fixed
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

ALTER TABLE order_items
ADD CONSTRAINT order_items_variant_id_fkey 
FOREIGN KEY (variant_id) 
REFERENCES listing_variants(variant_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 4. Fix the listing constraint in order_items 
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_listing_id_fkey;

ALTER TABLE order_items
ADD CONSTRAINT order_items_listing_id_fkey 
FOREIGN KEY (listing_id) 
REFERENCES seller_product_listings(listing_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- This allows:
-- 1. Editing product details without constraint violations
-- 2. Updating variant information freely
-- 3. Deleting products/variants even if they have orders/payouts
-- 4. Preserving payout history (payout records remain, just with NULL references)
-- 5. Historical data integrity (amounts and dates are preserved)