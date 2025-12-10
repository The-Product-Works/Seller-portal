-- Clean up blob URLs from P0 compliance images
-- These are temporary browser URLs that don't work after page reload
-- Need to re-upload these images through the UI with the fixed code

-- First, check how many variants have blob URLs
SELECT 
  COUNT(*) as variants_with_blob_urls,
  COUNT(CASE WHEN image_url LIKE 'blob:%' THEN 1 END) as product_blobs,
  COUNT(CASE WHEN ingredient_image_url LIKE 'blob:%' THEN 1 END) as ingredient_blobs,
  COUNT(CASE WHEN nutrient_table_image_url LIKE 'blob:%' THEN 1 END) as nutrient_blobs,
  COUNT(CASE WHEN fssai_label_image_url LIKE 'blob:%' THEN 1 END) as fssai_blobs
FROM listing_variants
WHERE 
  image_url LIKE 'blob:%'
  OR ingredient_image_url LIKE 'blob:%' 
  OR nutrient_table_image_url LIKE 'blob:%' 
  OR fssai_label_image_url LIKE 'blob:%';

-- Show which variants need re-uploading
SELECT 
  variant_id,
  variant_name,
  sku,
  CASE WHEN image_url LIKE 'blob:%' THEN '❌ Need to re-upload' ELSE '✓ OK' END as product_status,
  CASE WHEN ingredient_image_url LIKE 'blob:%' THEN '❌ Need to re-upload' ELSE '✓ OK' END as ingredient_status,
  CASE WHEN nutrient_table_image_url LIKE 'blob:%' THEN '❌ Need to re-upload' ELSE '✓ OK' END as nutrient_status,
  CASE WHEN fssai_label_image_url LIKE 'blob:%' THEN '❌ Need to re-upload' ELSE '✓ OK' END as fssai_status
FROM listing_variants
WHERE 
  image_url LIKE 'blob:%'
  OR ingredient_image_url LIKE 'blob:%' 
  OR nutrient_table_image_url LIKE 'blob:%' 
  OR fssai_label_image_url LIKE 'blob:%';

-- Clear blob URLs (set to NULL so user knows to re-upload)
UPDATE listing_variants
SET 
  image_url = CASE 
    WHEN image_url LIKE 'blob:%' THEN NULL 
    ELSE image_url 
  END,
  ingredient_image_url = CASE 
    WHEN ingredient_image_url LIKE 'blob:%' THEN NULL 
    ELSE ingredient_image_url 
  END,
  nutrient_table_image_url = CASE 
    WHEN nutrient_table_image_url LIKE 'blob:%' THEN NULL 
    ELSE nutrient_table_image_url 
  END,
  fssai_label_image_url = CASE 
    WHEN fssai_label_image_url LIKE 'blob:%' THEN NULL 
    ELSE fssai_label_image_url 
  END
WHERE 
  image_url LIKE 'blob:%'
  OR ingredient_image_url LIKE 'blob:%' 
  OR nutrient_table_image_url LIKE 'blob:%' 
  OR fssai_label_image_url LIKE 'blob:%';

-- Verify cleanup
SELECT 
  variant_name,
  image_url,
  ingredient_image_url,
  nutrient_table_image_url,
  fssai_label_image_url
FROM listing_variants
WHERE variant_name = 'chocos';
