-- Check allergen relationships and product images
-- Run this in Supabase SQL Editor to verify your data

-- 1. Check all allergens in the system
SELECT 
  allergen_id,
  name,
  description
FROM allergens
ORDER BY name;

-- 2. Check listing_variants with their allergen_info
SELECT 
  lv.variant_id,
  lv.variant_name,
  lv.allergen_info,
  lv.ingredient_image_url,
  lv.nutrient_table_image_url,
  lv.fssai_label_image_url
FROM listing_variants lv
LIMIT 10;

-- 3. Check listing_images (product display images) for each variant
SELECT 
  li.image_id,
  li.listing_id,
  li.variant_id,
  li.image_url,
  li.is_primary,
  lv.variant_name
FROM listing_images li
LEFT JOIN listing_variants lv ON li.variant_id = lv.variant_id
ORDER BY li.listing_id, li.variant_id;

-- 4. Check which variants have allergen_info populated
SELECT 
  COUNT(*) as total_variants,
  COUNT(allergen_info) as variants_with_allergen_info,
  COUNT(*) - COUNT(allergen_info) as variants_without_allergen_info
FROM listing_variants;

-- 5. View specific variant allergens (expanded)
SELECT 
  lv.variant_id,
  lv.variant_name,
  lv.allergen_info,
  jsonb_array_elements_text((lv.allergen_info->'allergen_ids')::jsonb) as allergen_id
FROM listing_variants lv
WHERE lv.allergen_info IS NOT NULL 
  AND jsonb_array_length((lv.allergen_info->'allergen_ids')::jsonb) > 0
LIMIT 20;

-- 6. Check product bucket image paths
SELECT 
  variant_id,
  variant_name,
  CASE 
    WHEN ingredient_image_url LIKE '%/product/%' THEN 'Uses product bucket'
    ELSE 'Different bucket: ' || split_part(ingredient_image_url, '/', 5)
  END as ingredient_bucket,
  CASE 
    WHEN nutrient_table_image_url LIKE '%/product/%' THEN 'Uses product bucket'
    ELSE 'Different bucket: ' || split_part(nutrient_table_image_url, '/', 5)
  END as nutrient_bucket,
  CASE 
    WHEN fssai_label_image_url LIKE '%/product/%' THEN 'Uses product bucket'
    ELSE 'Different bucket: ' || split_part(fssai_label_image_url, '/', 5)
  END as fssai_bucket
FROM listing_variants
WHERE ingredient_image_url IS NOT NULL 
   OR nutrient_table_image_url IS NOT NULL 
   OR fssai_label_image_url IS NOT NULL
LIMIT 10;
