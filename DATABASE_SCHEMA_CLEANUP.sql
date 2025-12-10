BEGIN;

-- ============================
-- 0. Drop dependent view (will recreate later)
-- ============================
DROP VIEW IF EXISTS variant_complete_details CASCADE;

-- ============================
-- 1. Remove redundant column
-- ============================
ALTER TABLE public.seller_product_listings
  DROP COLUMN IF EXISTS seller_ingredients;

COMMENT ON TABLE public.seller_product_listings IS
'Product listings by sellers. Ingredients are now stored at variant level in listing_variants table.';

-- ============================
-- 2. Find trigger(s) enforcing P0 validation on listing_variants
--    We will disable only those triggers temporarily.
-- ============================
-- This returns trigger names that reference the function validate_variant_p0_fields or that are BEFORE INSERT OR UPDATE on listing_variants.
-- You can inspect results before the script continues if desired.
-- (We also capture into a temp table for deterministic disabling/enabling.)
CREATE TEMP TABLE tmp_triggers_to_toggle (trigger_name text);

INSERT INTO tmp_triggers_to_toggle (trigger_name)
SELECT tg.tgname
FROM pg_trigger tg
JOIN pg_proc p ON tg.tgfoid = p.oid
WHERE tg.tgrelid = 'public.listing_variants'::regclass
  AND tg.tgenabled = 'O' -- ordinary enabled triggers
  AND NOT tg.tgisinternal -- exclude internal/system triggers
  AND (
    p.proname = 'validate_variant_p0_fields'   -- common function name from your error
    OR pg_get_triggerdef(tg.oid) ILIKE '%validate_variant_p0_fields%'
  );

-- If nothing was found above, fall back to any BEFORE INSERT OR UPDATE triggers on the table (user-defined only)
INSERT INTO tmp_triggers_to_toggle (trigger_name)
SELECT tg.tgname
FROM pg_trigger tg
WHERE tg.tgrelid = 'public.listing_variants'::regclass
  AND tg.tgenabled = 'O'
  AND NOT tg.tgisinternal -- exclude internal/system triggers (FK, etc)
  AND tg.tgname NOT IN (SELECT trigger_name FROM tmp_triggers_to_toggle)
  AND (tg.tgtype & (1<<0) <> 0) -- row-level (tgtype low bit)
  AND (tg.tgtype & (1<<2) <> 0 OR tg.tgtype & (1<<3) <> 0); -- BEFORE INSERT or BEFORE UPDATE (approximation)

-- Disable only the found triggers
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT trigger_name FROM tmp_triggers_to_toggle LOOP
    -- Check if trigger exists before disabling
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = r.trigger_name AND tgrelid = 'public.listing_variants'::regclass) THEN
      EXECUTE format('ALTER TABLE public.listing_variants DISABLE TRIGGER %I;', r.trigger_name);
    END IF;
  END LOOP;
END$$;

-- ============================
-- 3. Drop is_p0_compliant generated column (will recreate later)
-- ============================
ALTER TABLE public.listing_variants
  DROP COLUMN IF EXISTS is_p0_compliant;

-- ============================
-- 4. Convert ingredient_list (TEXT) -> JSONB (safe two-step)
-- ============================
-- Add temp jsonb column if not exists
ALTER TABLE public.listing_variants
  ADD COLUMN IF NOT EXISTS ingredient_list_tmp JSONB;

-- Populate tmp column only if ingredient_list is text and not null/empty
UPDATE public.listing_variants
SET ingredient_list_tmp = CASE
  WHEN ingredient_list IS NULL THEN NULL
  WHEN trim(ingredient_list) = '' THEN NULL
  ELSE jsonb_build_object(
    'ingredients',
      (
        SELECT jsonb_agg(trim(x))
        FROM unnest(string_to_array(ingredient_list, ',')) AS x
      ),
    'updated_at', to_jsonb(now())
  )
END
WHERE ingredient_list_tmp IS DISTINCT FROM CASE
  WHEN ingredient_list IS NULL THEN NULL
  WHEN trim(ingredient_list) = '' THEN NULL
  ELSE jsonb_build_object(
    'ingredients',
      (
        SELECT jsonb_agg(trim(x))
        FROM unnest(string_to_array(ingredient_list, ',')) AS x
      ),
    'updated_at', to_jsonb(now())
  )
END;

-- ============================
-- 5. Convert allergen_info (TEXT) -> JSONB (safe two-step)
-- ============================
ALTER TABLE public.listing_variants
  ADD COLUMN IF NOT EXISTS allergen_info_tmp JSONB;

UPDATE public.listing_variants
SET allergen_info_tmp = CASE
  WHEN allergen_info IS NULL THEN NULL
  WHEN trim(allergen_info) = '' THEN NULL
  WHEN allergen_info = 'NA' THEN jsonb_build_object(
    'allergens', '[]'::jsonb,
    'contains_allergens', false,
    'updated_at', to_jsonb(now())
  )
  ELSE jsonb_build_object(
    'allergens',
      (
        SELECT jsonb_agg(trim(x))
        FROM unnest(string_to_array(allergen_info, ',')) AS x
      ),
    'contains_allergens', true,
    'updated_at', to_jsonb(now())
  )
END
WHERE allergen_info_tmp IS DISTINCT FROM CASE
  WHEN allergen_info IS NULL THEN NULL
  WHEN trim(allergen_info) = '' THEN NULL
  WHEN allergen_info = 'NA' THEN jsonb_build_object(
    'allergens', '[]'::jsonb,
    'contains_allergens', false,
    'updated_at', to_jsonb(now())
  )
  ELSE jsonb_build_object(
    'allergens',
      (
        SELECT jsonb_agg(trim(x))
        FROM unnest(string_to_array(allergen_info, ',')) AS x
      ),
    'contains_allergens', true,
    'updated_at', to_jsonb(now())
  )
END;

-- ============================
-- 6. Validate counts (manual inspection recommended)
--    Run these SELECTs and inspect results before proceeding if you want to verify.
-- ============================
-- Rows where original non-null but tmp null (unexpected)
-- SELECT count(*) AS orig_not_null_tmp_null FROM public.listing_variants WHERE (ingredient_list IS NOT NULL AND ingredient_list_tmp IS NULL) OR (allergen_info IS NOT NULL AND allergen_info_tmp IS NULL);

-- Rows with populated tmp
-- SELECT count(*) AS ingredient_tmp_populated FROM public.listing_variants WHERE ingredient_list_tmp IS NOT NULL;
-- SELECT count(*) AS allergen_tmp_populated FROM public.listing_variants WHERE allergen_info_tmp IS NOT NULL;

-- ============================
-- 7. Drop any CHECK constraints that reference allergen_info or ingredient_list as text
--    We search for constraints mentioning those columns and drop them.
-- ============================
DO $$
DECLARE
  c RECORD;
  defs text;
BEGIN
  FOR c IN
    SELECT conname, oid, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.listing_variants'::regclass
      AND contype = 'c'
  LOOP
    defs := c.def;
    IF defs ILIKE '%allergen_info%' OR defs ILIKE '%ingredient_list%' THEN
      EXECUTE format('ALTER TABLE public.listing_variants DROP CONSTRAINT IF EXISTS %I;', c.conname);
    END IF;
  END LOOP;
END$$;

-- ============================
-- 8. Swap columns: drop old TEXT columns and rename tmp -> final names
-- ============================
-- Drop original columns (be careful: this is destructive to original textual data)
ALTER TABLE public.listing_variants
  DROP COLUMN IF EXISTS ingredient_list,
  DROP COLUMN IF EXISTS allergen_info;

-- Rename tmp to final names (must be separate statements)
ALTER TABLE public.listing_variants
  RENAME COLUMN ingredient_list_tmp TO ingredient_list;
  
ALTER TABLE public.listing_variants
  RENAME COLUMN allergen_info_tmp TO allergen_info;

-- Ensure columns are JSONB type (must be separate statements)
ALTER TABLE public.listing_variants
  ALTER COLUMN ingredient_list SET DATA TYPE jsonb USING ingredient_list::jsonb;
  
ALTER TABLE public.listing_variants
  ALTER COLUMN allergen_info SET DATA TYPE jsonb USING allergen_info::jsonb;

-- Remove any defaults referencing text 'NA'
ALTER TABLE public.listing_variants ALTER COLUMN allergen_info DROP DEFAULT;
ALTER TABLE public.listing_variants ALTER COLUMN ingredient_list DROP DEFAULT;

-- ============================
-- 9. Recreate is_p0_compliant generated column with JSON-aware logic
-- ============================
ALTER TABLE public.listing_variants
  ADD COLUMN IF NOT EXISTS is_p0_compliant BOOLEAN GENERATED ALWAYS AS (
    ingredient_list IS NOT NULL
    AND allergen_info IS NOT NULL
    AND product_image_url IS NOT NULL
    AND ingredient_image_url IS NOT NULL
    AND nutrient_table_image_url IS NOT NULL
    AND fssai_label_image_url IS NOT NULL
    AND fssai_number IS NOT NULL
    AND nutritional_info IS NOT NULL
  ) STORED;

-- ============================
-- 10. Add JSON-aware check constraint(s)
-- ============================
ALTER TABLE public.listing_variants
  ADD CONSTRAINT listing_variants_allergen_info_json_structure CHECK (
    allergen_info IS NULL
    OR (
      jsonb_typeof(allergen_info) = 'object'
      AND (allergen_info ? 'allergens')
      AND (allergen_info ? 'contains_allergens')
    )
  );

ALTER TABLE public.listing_variants
  ADD CONSTRAINT listing_variants_ingredient_list_json_structure CHECK (
    ingredient_list IS NULL
    OR (
      jsonb_typeof(ingredient_list) = 'object'
      AND (ingredient_list ? 'ingredients')
    )
  );

-- ============================
-- 11. Recreate/replace JSON validation trigger/function
--    (We create validate_variant_json_fields and its trigger as requested)
-- ============================
CREATE OR REPLACE FUNCTION validate_variant_json_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nutritional_info IS NOT NULL THEN
        IF NOT (NEW.nutritional_info ? 'servingSize') THEN
            RAISE EXCEPTION 'nutritional_info must contain servingSize';
        END IF;
    END IF;

    IF NEW.ingredient_list IS NOT NULL THEN
        IF NOT (NEW.ingredient_list ? 'ingredients') THEN
            RAISE EXCEPTION 'ingredient_list must contain ingredients array';
        END IF;
    END IF;

    IF NEW.allergen_info IS NOT NULL THEN
        IF NOT (NEW.allergen_info ? 'allergens' AND NEW.allergen_info ? 'contains_allergens') THEN
            RAISE EXCEPTION 'allergen_info must contain allergens and contains_allergens fields';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_variant_json ON public.listing_variants;
CREATE TRIGGER trg_validate_variant_json
  BEFORE INSERT OR UPDATE ON public.listing_variants
  FOR EACH ROW
  EXECUTE FUNCTION validate_variant_json_fields();

-- ============================
-- 12. Re-enable previously disabled triggers (only those we disabled)
-- ============================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT trigger_name FROM tmp_triggers_to_toggle LOOP
    -- Re-enable trigger (if trigger still exists)
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = r.trigger_name AND tgrelid = 'public.listing_variants'::regclass) THEN
      EXECUTE format('ALTER TABLE public.listing_variants ENABLE TRIGGER %I;', r.trigger_name);
    END IF;
  END LOOP;
END$$;

-- Clean up temp table
DROP TABLE IF EXISTS tmp_triggers_to_toggle;

COMMIT;

-- ============================
-- 13. Recreate variant_complete_details view
-- ============================
CREATE OR REPLACE VIEW public.variant_complete_details AS
SELECT 
    lv.variant_id,
    lv.listing_id,
    lv.sku,
    lv.variant_name,
    lv.size,
    lv.flavor,
    lv.serving_count,
    lv.price,
    lv.original_price,
    lv.stock_quantity,
    lv.reserved_quantity,
    lv.manufacture_date,
    lv.batch_number,
    lv.expiry_date,
    lv.health_score,
    lv.is_available,
    
    -- P0 Fields (now JSONB)
    lv.ingredient_list,
    lv.allergen_info,
    lv.accuracy_attested,
    lv.attested_at,
    lv.attested_by,
    
    -- FSSAI fields
    lv.fssai_number,
    lv.fssai_expiry_date,
    
    -- Nutritional info (already JSONB)
    lv.nutritional_info,
    lv.nutrient_breakdown,
    
    -- Images
    lv.product_image_url,
    lv.ingredient_image_url,
    lv.nutrient_table_image_url,
    lv.fssai_label_image_url,
    
    -- P0 compliance
    lv.is_p0_compliant,
    
    -- Product listing info
    spl.seller_title,
    spl.business_name,
    
    lv.created_at,
    lv.updated_at
    
FROM public.listing_variants lv
LEFT JOIN public.seller_product_listings spl ON lv.listing_id = spl.listing_id;

COMMENT ON VIEW public.variant_complete_details IS
'Complete variant details with P0 compliance fields. ingredient_list and allergen_info are now JSONB format.';

-- ============================
-- 14. Verification queries (run manually / inspect)
-- ============================
-- SELECT count(*) AS ingredient_jsonb_rows FROM public.listing_variants WHERE ingredient_list IS NOT NULL;
-- SELECT count(*) AS allergen_jsonb_rows FROM public.listing_variants WHERE allergen_info IS NOT NULL;
-- SELECT count(*) AS missing_product_image FROM public.listing_variants WHERE product_image_url IS NULL OR trim(product_image_url) = '';

-- End of migration script