-- ============================================================
-- MIGRATE EXISTING TEXT DATA TO JSON FORMAT
-- ============================================================
-- This script converts existing ingredient_list and allergen_info
-- from old TEXT format to new JSON format for variants that still
-- have unconverted data
-- ============================================================

-- STEP 1: Add servingSize to existing nutritional_info (CRITICAL FIX)
UPDATE listing_variants
SET nutritional_info = jsonb_set(
  nutritional_info,
  '{servingSize}',
  '"100g"'
)
WHERE nutritional_info IS NOT NULL
  AND NOT (nutritional_info ? 'servingSize');

-- STEP 2: Update ingredient_list: Convert TEXT to JSON
UPDATE listing_variants
SET ingredient_list = jsonb_build_object(
  'ingredients', string_to_array(ingredient_list::text, ','),
  'updated_at', NOW()::text
)
WHERE ingredient_list IS NOT NULL 
  AND jsonb_typeof(ingredient_list) = 'string';

-- STEP 3: Update allergen_info: Convert TEXT to JSON
-- For "NA" or empty values
UPDATE listing_variants
SET allergen_info = jsonb_build_object(
  'allergens', '[]'::jsonb,
  'contains_allergens', false,
  'updated_at', NOW()::text
)
WHERE allergen_info IS NOT NULL
  AND jsonb_typeof(allergen_info) = 'string'
  AND (UPPER(allergen_info::text) = '"NA"' OR allergen_info::text = '""');

-- For actual allergen values
UPDATE listing_variants
SET allergen_info = jsonb_build_object(
  'allergens', string_to_array(TRIM(BOTH '"' FROM allergen_info::text), ','),
  'contains_allergens', true,
  'updated_at', NOW()::text
)
WHERE allergen_info IS NOT NULL
  AND jsonb_typeof(allergen_info) = 'string'
  AND UPPER(allergen_info::text) != '"NA"' 
  AND allergen_info::text != '""';

-- Verification query
SELECT 
  variant_id,
  variant_name,
  jsonb_typeof(ingredient_list) as ingredient_type,
  jsonb_typeof(allergen_info) as allergen_type,
  ingredient_list,
  allergen_info
FROM listing_variants
WHERE ingredient_list IS NOT NULL OR allergen_info IS NOT NULL
LIMIT 10;
