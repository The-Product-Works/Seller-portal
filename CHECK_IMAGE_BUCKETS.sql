-- Check current image URLs to see which bucket they're in
SELECT 
  variant_id,
  variant_name,
  ingredient_image_url,
  nutrient_table_image_url,
  fssai_label_image_url,
  -- Extract bucket name from URL
  split_part(ingredient_image_url, '/storage/v1/object/public/', 2) as ingredient_path,
  split_part(nutrient_table_image_url, '/storage/v1/object/public/', 2) as nutrient_path,
  split_part(fssai_label_image_url, '/storage/v1/object/public/', 2) as fssai_path
FROM listing_variants
WHERE ingredient_image_url IS NOT NULL 
   OR nutrient_table_image_url IS NOT NULL 
   OR fssai_label_image_url IS NOT NULL
LIMIT 5;
