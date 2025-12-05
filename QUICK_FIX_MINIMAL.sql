-- IMMEDIATE WORKAROUND: If you can't run the full fix, this minimal fix might help
-- Run this in Supabase SQL Editor first to allow product editing:

-- Just fix the most critical constraint
ALTER TABLE seller_payout_items 
DROP CONSTRAINT IF EXISTS seller_payout_items_order_item_id_fkey;

-- Recreate with more permissive constraint
ALTER TABLE seller_payout_items
ADD CONSTRAINT seller_payout_items_order_item_id_fkey 
FOREIGN KEY (order_item_id) 
REFERENCES order_items(order_item_id) 
ON DELETE SET NULL;

-- Check if this fixes your immediate issue
SELECT 'Constraint updated successfully' as result;