-- 1. Add allocation_percentage to bundle_items to define how much of the bundle price this item represents.
ALTER TABLE bundle_items 
ADD COLUMN IF NOT EXISTS allocation_percentage numeric CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);

-- 2. Add variant_id to bundle_items so we know exactly which product variant is included.
ALTER TABLE bundle_items 
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES listing_variants(variant_id);

-- 3. Add bundle_id to cart_items to track that an item in the cart belongs to a specific bundle.
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES bundles(bundle_id);

-- 4. Add bundle_id to order_items to track that a purchased item came from a bundle.
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES bundles(bundle_id);
