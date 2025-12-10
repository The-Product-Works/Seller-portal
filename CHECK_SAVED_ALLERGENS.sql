-- Check if allergen_info is actually being saved with allergen_ids
SELECT 
  variant_id,
  variant_name,
  allergen_info,
  allergen_info->'allergen_ids' as allergen_ids_array,
  jsonb_array_length(allergen_info->'allergen_ids') as allergen_count
FROM listing_variants
WHERE allergen_info IS NOT NULL
LIMIT 10;
