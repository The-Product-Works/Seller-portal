/* 
   URGENT FIX: Copy and paste this SQL into your Supabase SQL editor to fix the foreign key constraint issue
   Go to: Supabase Dashboard > SQL Editor > New query > Paste this code > Run
*/

-- Fix foreign key constraints for seller_payout_items to allow order_items updates/deletes
-- This fixes the error: "violates foreign key constraint seller_payout_items_order_item_id_fkey"

-- 1. Drop existing restrictive constraints
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

-- 3. Fix variant constraints in order_items
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

ALTER TABLE order_items
ADD CONSTRAINT order_items_variant_id_fkey 
FOREIGN KEY (variant_id) 
REFERENCES listing_variants(variant_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 4. Fix listing constraints in order_items 
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_listing_id_fkey;

ALTER TABLE order_items
ADD CONSTRAINT order_items_listing_id_fkey 
FOREIGN KEY (listing_id) 
REFERENCES seller_product_listings(listing_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Verify the fix worked
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('seller_payout_items', 'order_items')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;