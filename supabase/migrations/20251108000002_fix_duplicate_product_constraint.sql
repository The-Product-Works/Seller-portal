-- Migration: Remove unique constraint on (global_product_id, seller_id)
-- This allows sellers to have multiple listings of the same product with different variants/prices

-- Drop the unique constraint if it exists
ALTER TABLE seller_product_listings 
DROP CONSTRAINT IF EXISTS unique_seller_product;

-- Add a new comment explaining why this is allowed
COMMENT ON TABLE seller_product_listings IS 'Seller product listings - a seller can have multiple listings of the same global product with different variants, prices, or seller titles';
