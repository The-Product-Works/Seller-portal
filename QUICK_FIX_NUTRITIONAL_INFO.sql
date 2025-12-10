-- ============================================================
-- QUICK FIX: Add servingSize to existing nutritional_info
-- ============================================================
-- This fixes the "nutritional_info must contain servingSize" error
-- that occurs during restock and edit operations
-- ============================================================

-- Add servingSize to all nutritional_info that don't have it
UPDATE listing_variants
SET nutritional_info = jsonb_set(
  nutritional_info,
  '{servingSize}',
  '"100g"'
)
WHERE nutritional_info IS NOT NULL
  AND NOT (nutritional_info ? 'servingSize');

-- Verification: Check that all nutritional_info now have servingSize
SELECT 
  variant_id,
  variant_name,
  nutritional_info ? 'servingSize' as has_serving_size,
  nutritional_info
FROM listing_variants
WHERE nutritional_info IS NOT NULL
LIMIT 10;

-- Count how many were updated
SELECT 
  COUNT(*) as total_variants,
  COUNT(CASE WHEN nutritional_info IS NOT NULL THEN 1 END) as with_nutritional_info,
  COUNT(CASE WHEN nutritional_info ? 'servingSize' THEN 1 END) as with_serving_size
FROM listing_variants;
