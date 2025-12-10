-- Simple check of what data exists
-- Run in Supabase SQL Editor

-- 1. Show actual image URLs from listing_variants
SELECT 
  variant_id,
  variant_name,
  ingredient_image_url,
  nutrient_table_image_url,
  fssai_label_image_url
FROM listing_variants
WHERE ingredient_image_url IS NOT NULL 
LIMIT 3;

-- 2. Show actual image URLs from listing_images (product display photos)
SELECT 
  image_id,
  listing_id,
  variant_id,
  image_url,
  is_primary
FROM listing_images
LIMIT 10;

-- 3. Count images
SELECT 
  (SELECT COUNT(*) FROM listing_images) as total_listing_images,
  (SELECT COUNT(*) FROM listing_variants WHERE ingredient_image_url IS NOT NULL) as variants_with_ingredient_image,
  (SELECT COUNT(*) FROM listing_variants WHERE allergen_info IS NOT NULL) as variants_with_allergen_info;
