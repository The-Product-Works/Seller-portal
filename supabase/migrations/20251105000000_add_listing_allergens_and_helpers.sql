-- Migration: Add listing_allergens junction table and update storage policies
-- Date: November 5, 2025

-- ============================================================================
-- STEP 1: CREATE LISTING_ALLERGENS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.listing_allergens (
  listing_allergen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  allergen_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT listing_allergens_listing_fkey FOREIGN KEY (listing_id) REFERENCES seller_product_listings(listing_id) ON DELETE CASCADE,
  CONSTRAINT listing_allergens_allergen_fkey FOREIGN KEY (allergen_id) REFERENCES allergens(allergen_id) ON DELETE CASCADE,
  CONSTRAINT unique_listing_allergen UNIQUE(listing_id, allergen_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_allergens_listing ON public.listing_allergens(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_allergens_allergen ON public.listing_allergens(allergen_id);

COMMENT ON TABLE public.listing_allergens IS 'Junction table linking seller listings to allergens';

-- ============================================================================
-- STEP 2: STORAGE POLICIES (RUN THESE IN SUPABASE DASHBOARD)
-- ============================================================================
-- Note: These policies should be created in the Supabase dashboard under Storage > product bucket

-- Policy: Restrict uploads to valid subfolders
-- CREATE POLICY "Restrict uploads to valid subfolders"
-- ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   bucket_id = 'product'
--   AND (
--     name LIKE auth.uid()::text || '/product-images/%'
--     OR name LIKE auth.uid()::text || '/certificates/%'
--     OR name LIKE auth.uid()::text || '/trust-certificates/%'
--   )
-- );

-- Policy: Allow users to read their own files
-- CREATE POLICY "Users can read own files"
-- ON storage.objects
-- FOR SELECT
-- USING (
--   bucket_id = 'product'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Allow users to delete their own files
-- CREATE POLICY "Users can delete own files"
-- ON storage.objects
-- FOR DELETE
-- USING (
--   bucket_id = 'product'
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- ============================================================================
-- STEP 3: CREATE HELPFUL VIEWS
-- ============================================================================

-- View: Listing with full details
CREATE OR REPLACE VIEW listing_full_details AS
SELECT 
  spl.*,
  gp.product_name AS global_product_name,
  b.name AS brand_name,
  b.logo_url AS brand_logo,
  c.name AS category_name,
  COUNT(DISTINCT lv.variant_id) AS variant_count,
  COUNT(DISTINCT li.image_id) AS image_count,
  ARRAY_AGG(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL) AS allergen_names
FROM seller_product_listings spl
LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
LEFT JOIN brands b ON gp.brand_id = b.brand_id
LEFT JOIN categories c ON gp.category_id = c.category_id
LEFT JOIN listing_variants lv ON spl.listing_id = lv.listing_id
LEFT JOIN listing_images li ON spl.listing_id = li.listing_id
LEFT JOIN listing_allergens la ON spl.listing_id = la.listing_id
LEFT JOIN allergens a ON la.allergen_id = a.allergen_id
GROUP BY spl.listing_id, gp.product_name, b.name, b.logo_url, c.name;

COMMENT ON VIEW listing_full_details IS 'Comprehensive view of seller listings with all related data';

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update global product aggregates
CREATE OR REPLACE FUNCTION update_global_product_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE global_products
  SET
    total_listings_count = (
      SELECT COUNT(*)
      FROM seller_product_listings
      WHERE global_product_id = NEW.global_product_id
        AND status = 'active'
    ),
    avg_rating_across_sellers = (
      SELECT AVG(rating)
      FROM seller_product_listings
      WHERE global_product_id = NEW.global_product_id
        AND status = 'active'
        AND rating IS NOT NULL
    ),
    total_reviews_across_sellers = (
      SELECT SUM(review_count)
      FROM seller_product_listings
      WHERE global_product_id = NEW.global_product_id
        AND status = 'active'
    ),
    lowest_price = (
      SELECT MIN(base_price)
      FROM seller_product_listings
      WHERE global_product_id = NEW.global_product_id
        AND status = 'active'
    ),
    highest_price = (
      SELECT MAX(base_price)
      FROM seller_product_listings
      WHERE global_product_id = NEW.global_product_id
        AND status = 'active'
    ),
    avg_health_score = (
      SELECT AVG(health_score)
      FROM seller_product_listings
      WHERE global_product_id = NEW.global_product_id
        AND status = 'active'
        AND health_score IS NOT NULL
    ),
    updated_at = NOW()
  WHERE global_product_id = NEW.global_product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update global product aggregates
DROP TRIGGER IF EXISTS update_global_aggregates_on_listing ON seller_product_listings;
CREATE TRIGGER update_global_aggregates_on_listing
  AFTER INSERT OR UPDATE OR DELETE ON seller_product_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_global_product_aggregates();

-- ============================================================================
-- STEP 5: INSERT SAMPLE ALLERGENS
-- ============================================================================
INSERT INTO public.allergens (name, description, common_in) VALUES
('Milk', 'Contains dairy products', 'Whey protein, casein, milk chocolate'),
('Soy', 'Contains soy or soy derivatives', 'Soy protein isolate, lecithin'),
('Eggs', 'Contains egg or egg products', 'Egg protein, albumin'),
('Tree Nuts', 'Contains nuts from trees', 'Almonds, cashews, walnuts'),
('Peanuts', 'Contains peanuts or peanut products', 'Peanut butter, peanut flour'),
('Wheat', 'Contains wheat or gluten', 'Wheat protein, gluten'),
('Fish', 'Contains fish or fish products', 'Fish oil, omega-3'),
('Shellfish', 'Contains shellfish', 'Crustacean extracts')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.allergens IS 'Master list of common allergens for product labeling';
