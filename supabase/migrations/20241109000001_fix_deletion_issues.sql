-- Fix deletion issues for products, variants, and bundles

-- 1. Add missing RLS policies for seller_product_listings
-- First, enable RLS if it's not enabled
ALTER TABLE seller_product_listings ENABLE ROW LEVEL SECURITY;

-- Create DELETE policy for seller_product_listings
CREATE POLICY "Sellers can delete own listings" ON public.seller_product_listings 
FOR DELETE TO authenticated 
USING (auth.uid() = seller_id);

-- 2. Fix bundle table naming consistency
-- The bundles table uses 'id' as primary key but frontend expects 'bundle_id'
-- Add a computed column alias or fix the table structure
-- Option A: Add a computed column (safer)
ALTER TABLE bundles ADD COLUMN bundle_id UUID;
UPDATE bundles SET bundle_id = id WHERE bundle_id IS NULL;
ALTER TABLE bundles ALTER COLUMN bundle_id SET NOT NULL;
ALTER TABLE bundles ALTER COLUMN bundle_id SET DEFAULT gen_random_uuid();

-- Option B: Create a view with the expected column name (fallback)
-- This is commented out - use only if Option A doesn't work
/*
CREATE OR REPLACE VIEW bundles_with_bundle_id AS
SELECT 
  id as bundle_id,
  name as bundle_name,
  description,
  discount_percentage,
  seller_id,
  total_price as base_price,
  discounted_price,
  total_stock_quantity,
  created_at,
  status
FROM bundles;
*/

-- 3. Ensure proper CASCADE deletes for variants
-- Make sure foreign key constraints are set up properly
DO $$
BEGIN
  -- Check if the constraint exists and recreate it with CASCADE if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'listing_variants_listing_id_fkey' 
    AND table_name = 'listing_variants'
  ) THEN
    ALTER TABLE listing_variants 
    DROP CONSTRAINT listing_variants_listing_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE listing_variants 
  ADD CONSTRAINT listing_variants_listing_id_fkey 
  FOREIGN KEY (listing_id) 
  REFERENCES seller_product_listings(listing_id) 
  ON DELETE CASCADE;
END $$;

-- 4. Add RLS policies for listing_variants if they don't exist
ALTER TABLE listing_variants ENABLE ROW LEVEL SECURITY;

-- Policy for deleting variants (through listing ownership)
CREATE POLICY "Sellers can delete own listing variants" ON public.listing_variants 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM seller_product_listings spl 
    WHERE spl.listing_id = listing_variants.listing_id 
    AND spl.seller_id = auth.uid()
  )
);

-- 5. Ensure bundles have proper RLS for deletion
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can delete own bundles" ON public.bundles 
FOR DELETE TO authenticated 
USING (auth.uid() = seller_id);

-- 6. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listing_variants_listing_id ON listing_variants(listing_id);
CREATE INDEX IF NOT EXISTS idx_bundles_seller_id ON bundles(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_product_listings_seller_id ON seller_product_listings(seller_id);

-- 7. Create a function to safely delete listings with all related data
CREATE OR REPLACE FUNCTION delete_listing_safely(p_listing_id UUID, p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  listing_exists BOOLEAN;
BEGIN
  -- Check if listing exists and belongs to seller
  SELECT EXISTS(
    SELECT 1 FROM seller_product_listings 
    WHERE listing_id = p_listing_id AND seller_id = p_seller_id
  ) INTO listing_exists;
  
  IF NOT listing_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Delete the listing (CASCADE will handle variants and related data)
  DELETE FROM seller_product_listings 
  WHERE listing_id = p_listing_id AND seller_id = p_seller_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create a function to safely delete bundles
CREATE OR REPLACE FUNCTION delete_bundle_safely(p_bundle_id UUID, p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  bundle_exists BOOLEAN;
BEGIN
  -- Check if bundle exists and belongs to seller
  SELECT EXISTS(
    SELECT 1 FROM bundles 
    WHERE id = p_bundle_id AND seller_id = p_seller_id
  ) INTO bundle_exists;
  
  IF NOT bundle_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Delete the bundle (CASCADE will handle bundle_products)
  DELETE FROM bundles 
  WHERE id = p_bundle_id AND seller_id = p_seller_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION delete_listing_safely(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_bundle_safely(UUID, UUID) TO authenticated;