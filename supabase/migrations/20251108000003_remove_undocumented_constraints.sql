-- Migration: Remove undocumented constraints and fix schema
-- CRITICAL: Remove undocumented unique constraint that was blocking product creation
-- This constraint was created directly in Supabase and not tracked in migrations
-- It prevented sellers from having multiple listings of the same global product

ALTER TABLE seller_product_listings 
DROP CONSTRAINT IF EXISTS unique_seller_product;

-- After removal, seller_product_listings constraints should be:
-- 1. listing_id: PRIMARY KEY (from listing_id UUID DEFAULT gen_random_uuid())
-- 2. slug: UNIQUE (documented in original schema)
-- 3. Foreign keys to global_products and sellers
-- This allows:
--   - Multiple sellers to list the same product
--   - One seller to list the same product with different variants/prices
