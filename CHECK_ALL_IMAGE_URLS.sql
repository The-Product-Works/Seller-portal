-- Check actual image URLs and their storage locations

-- 1. Show full URLs from listing_images (product display photos)
SELECT 
  image_id,
  listing_id,
  variant_id,
  image_url,
  is_primary,
  -- Extract bucket name from URL
  CASE 
    WHEN image_url LIKE '%/storage/v1/object/public/%' 
    THEN split_part(split_part(image_url, '/storage/v1/object/public/', 2), '/', 1)
    ELSE 'Not using storage URL'
  END as bucket_name
FROM listing_images
LIMIT 10;

-- 2. Show full URLs from listing_variants (P0 compliance images)  
SELECT 
  variant_id,
  variant_name,
  ingredient_image_url,
  nutrient_table_image_url,
  fssai_label_image_url,
  -- Check if using product bucket
  CASE 
    WHEN ingredient_image_url LIKE '%/product/%' THEN 'product bucket'
    WHEN ingredient_image_url LIKE '%blob:%' THEN 'BLOB URL (not saved!)'
    ELSE 'unknown'
  END as ingredient_storage
FROM listing_variants
WHERE ingredient_image_url IS NOT NULL
LIMIT 5;

-- 3. Count images by type
SELECT 
  COUNT(*) as total_listing_images,
  COUNT(CASE WHEN image_url LIKE '%/product/%' THEN 1 END) as images_in_product_bucket,
  COUNT(CASE WHEN image_url LIKE '%blob:%' THEN 1 END) as blob_urls_not_saved
FROM listing_images;
