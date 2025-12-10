-- Drop old P0 validation trigger that expects TEXT fields
-- This trigger is incompatible with the new JSON schema
DROP TRIGGER IF EXISTS trg_validate_variant_p0_fields ON listing_variants;
DROP FUNCTION IF EXISTS validate_variant_p0_fields();

-- The new validation is handled by:
-- 1. trg_validate_variant_json trigger with validate_variant_json_fields() function
-- 2. Check constraints on listing_variants table
-- 3. The is_p0_compliant generated column

-- Verify triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'listing_variants'
ORDER BY trigger_name;
