-- Initialize allergen_info for all listing_variants
-- Run this in your Supabase SQL Editor

-- Update all variants that have NULL allergen_info
UPDATE listing_variants 
SET allergen_info = jsonb_build_object(
  'allergen_ids', '[]'::jsonb,
  'custom_allergens', '[]'::jsonb,
  'contains_allergens', false,
  'updated_at', now()::text
)
WHERE allergen_info IS NULL;

-- Verify the update
SELECT 
  variant_id,
  variant_name,
  allergen_info
FROM listing_variants
LIMIT 10;
