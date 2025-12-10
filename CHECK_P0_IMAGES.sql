-- Check P0 compliance images for all variants

SELECT 
  lv.variant_id,
  lv.variant_name,
  lv.sku,
  lv.ingredient_image_url,
  lv.nutrient_table_image_url,
  lv.fssai_label_image_url,
  -- Check if URLs are null or have values
  CASE 
    WHEN lv.ingredient_image_url IS NOT NULL THEN '✓ Has Image'
    ELSE '✗ Missing'
  END as ingredient_status,
  CASE 
    WHEN lv.nutrient_table_image_url IS NOT NULL THEN '✓ Has Image'
    ELSE '✗ Missing'
  END as nutrient_status,
  CASE 
    WHEN lv.fssai_label_image_url IS NOT NULL THEN '✓ Has Image'
    ELSE '✗ Missing'
  END as fssai_status
FROM listing_variants lv
WHERE lv.variant_name = 'chocos'
ORDER BY lv.variant_name;

-- Also check the full variant data
SELECT * FROM listing_variants WHERE variant_name = 'chocos';
