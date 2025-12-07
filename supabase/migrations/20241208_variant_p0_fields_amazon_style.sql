-- =====================================================
-- VARIANT P0 MANDATORY FIELDS MIGRATION (Amazon Style)
-- Created: 2024-12-08
-- Purpose: Add mandatory product transparency fields at variant level
-- =====================================================

-- Step 1: Add new columns to listing_variants table
ALTER TABLE listing_variants
ADD COLUMN IF NOT EXISTS ingredient_list TEXT, -- P0: Mandatory ingredient list
ADD COLUMN IF NOT EXISTS ingredient_image_url TEXT, -- P0: Image of ingredient label
ADD COLUMN IF NOT EXISTS nutrient_image_url TEXT, -- P0: Image of nutrition facts
ADD COLUMN IF NOT EXISTS fssai_image_url TEXT, -- P0: FSSAI license image
ADD COLUMN IF NOT EXISTS product_image_url TEXT, -- P0: Main product image
ADD COLUMN IF NOT EXISTS allergen_info TEXT, -- P0: Allergen declaration (can be 'NA')
ADD COLUMN IF NOT EXISTS accuracy_confirmed BOOLEAN DEFAULT false, -- P0: Seller attestation
ADD COLUMN IF NOT EXISTS accuracy_confirmed_at TIMESTAMPTZ, -- When accuracy was confirmed
ADD COLUMN IF NOT EXISTS accuracy_confirmed_by UUID; -- Who confirmed accuracy

-- Step 2: Create detailed nutrient breakdown table (like Amazon)
CREATE TABLE IF NOT EXISTS variant_nutrient_details (
    nutrient_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL,
    
    -- Serving information
    serving_size VARCHAR(100), -- e.g., "1 cup (240ml)"
    servings_per_container NUMERIC,
    
    -- Macronutrients (per serving)
    calories NUMERIC,
    calories_from_fat NUMERIC,
    
    total_fat_g NUMERIC,
    saturated_fat_g NUMERIC,
    trans_fat_g NUMERIC,
    polyunsaturated_fat_g NUMERIC,
    monounsaturated_fat_g NUMERIC,
    
    cholesterol_mg NUMERIC,
    sodium_mg NUMERIC,
    
    total_carbohydrates_g NUMERIC,
    dietary_fiber_g NUMERIC,
    total_sugars_g NUMERIC,
    added_sugars_g NUMERIC,
    sugar_alcohol_g NUMERIC,
    
    protein_g NUMERIC,
    
    -- Vitamins
    vitamin_a_mcg NUMERIC,
    vitamin_c_mg NUMERIC,
    vitamin_d_mcg NUMERIC,
    vitamin_e_mg NUMERIC,
    vitamin_k_mcg NUMERIC,
    thiamin_mg NUMERIC,
    riboflavin_mg NUMERIC,
    niacin_mg NUMERIC,
    vitamin_b6_mg NUMERIC,
    folate_mcg NUMERIC,
    vitamin_b12_mcg NUMERIC,
    biotin_mcg NUMERIC,
    pantothenic_acid_mg NUMERIC,
    
    -- Minerals
    calcium_mg NUMERIC,
    iron_mg NUMERIC,
    phosphorus_mg NUMERIC,
    iodine_mcg NUMERIC,
    magnesium_mg NUMERIC,
    zinc_mg NUMERIC,
    selenium_mcg NUMERIC,
    copper_mg NUMERIC,
    manganese_mg NUMERIC,
    chromium_mcg NUMERIC,
    molybdenum_mcg NUMERIC,
    chloride_mg NUMERIC,
    potassium_mg NUMERIC,
    
    -- Other nutrients
    choline_mg NUMERIC,
    
    -- Additional info
    other_nutrients JSONB, -- For any additional nutrients
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT variant_nutrient_details_variant_id_fkey 
        FOREIGN KEY (variant_id) 
        REFERENCES listing_variants(variant_id) 
        ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_variant_nutrient_details_variant_id 
ON variant_nutrient_details(variant_id);

-- Step 3: Create variant images table (Amazon-style multi-image support)
CREATE TABLE IF NOT EXISTS variant_images (
    image_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL,
    
    image_type VARCHAR(50) NOT NULL CHECK (image_type IN (
        'product', -- Main product photo
        'ingredient_label', -- Ingredient list photo
        'nutrition_label', -- Nutrition facts photo
        'fssai_certificate', -- FSSAI license
        'expiry_date', -- Expiry date photo
        'product_back', -- Back of product
        'product_side', -- Side view
        'product_top', -- Top view
        'product_usage', -- Usage/serving suggestion
        'product_packaging', -- Packaging details
        'other' -- Any other image
    )),
    
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false, -- Primary image for this type
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    uploaded_by UUID, -- Seller who uploaded
    
    CONSTRAINT variant_images_variant_id_fkey 
        FOREIGN KEY (variant_id) 
        REFERENCES listing_variants(variant_id) 
        ON DELETE CASCADE,
        
    CONSTRAINT variant_images_uploaded_by_fkey 
        FOREIGN KEY (uploaded_by) 
        REFERENCES sellers(id) 
        ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_variant_images_variant_id 
ON variant_images(variant_id);

CREATE INDEX IF NOT EXISTS idx_variant_images_type 
ON variant_images(image_type);

-- Step 4: Create variant edit logs table (for tracking changes)
CREATE TABLE IF NOT EXISTS variant_edit_logs (
    log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL,
    changed_by UUID NOT NULL,
    
    field_changed VARCHAR(100), -- Which field was changed
    old_value TEXT, -- Old value (as JSON if complex)
    new_value TEXT, -- New value (as JSON if complex)
    
    change_type VARCHAR(50) CHECK (change_type IN (
        'ingredient_update',
        'nutrient_update',
        'allergen_update',
        'image_update',
        'accuracy_reconfirm',
        'other'
    )),
    
    change_reason TEXT, -- Why was it changed
    
    changed_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT variant_edit_logs_variant_id_fkey 
        FOREIGN KEY (variant_id) 
        REFERENCES listing_variants(variant_id) 
        ON DELETE CASCADE,
        
    CONSTRAINT variant_edit_logs_changed_by_fkey 
        FOREIGN KEY (changed_by) 
        REFERENCES sellers(id) 
        ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_variant_edit_logs_variant_id 
ON variant_edit_logs(variant_id);

CREATE INDEX IF NOT EXISTS idx_variant_edit_logs_changed_at 
ON variant_edit_logs(changed_at DESC);

-- Step 5: Create allergen master table (standardized allergen list)
CREATE TABLE IF NOT EXISTS allergen_master (
    allergen_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    allergen_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert common allergens
INSERT INTO allergen_master (allergen_name, description) VALUES
('Milk', 'Contains milk and dairy products'),
('Eggs', 'Contains eggs or egg products'),
('Fish', 'Contains fish or fish products'),
('Shellfish', 'Contains crustacean shellfish'),
('Tree Nuts', 'Contains tree nuts (almonds, cashews, walnuts, etc.)'),
('Peanuts', 'Contains peanuts or peanut products'),
('Wheat', 'Contains wheat or wheat products'),
('Soybeans', 'Contains soy or soy products'),
('Sesame', 'Contains sesame seeds or sesame products'),
('Mustard', 'Contains mustard or mustard products'),
('Celery', 'Contains celery or celery products'),
('Lupin', 'Contains lupin or lupin products'),
('Sulfites', 'Contains sulfites or sulfur dioxide'),
('Gluten', 'Contains gluten (wheat, barley, rye)'),
('NA', 'No allergens present')
ON CONFLICT (allergen_name) DO NOTHING;

-- Step 6: Create variant allergens junction table
CREATE TABLE IF NOT EXISTS variant_allergens (
    variant_allergen_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL,
    allergen_id UUID NOT NULL,
    
    severity VARCHAR(50) CHECK (severity IN ('contains', 'may_contain', 'processed_in_facility')),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT variant_allergens_variant_id_fkey 
        FOREIGN KEY (variant_id) 
        REFERENCES listing_variants(variant_id) 
        ON DELETE CASCADE,
        
    CONSTRAINT variant_allergens_allergen_id_fkey 
        FOREIGN KEY (allergen_id) 
        REFERENCES allergen_master(allergen_id) 
        ON DELETE CASCADE,
        
    UNIQUE(variant_id, allergen_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_variant_allergens_variant_id 
ON variant_allergens(variant_id);

-- =====================================================
-- VALIDATION FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Validate P0 mandatory fields before insert/update
CREATE OR REPLACE FUNCTION validate_variant_p0_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Check ingredient list
    IF NEW.ingredient_list IS NULL OR TRIM(NEW.ingredient_list) = '' THEN
        RAISE EXCEPTION 'P0 Violation: Ingredient list is mandatory for variant';
    END IF;
    
    -- Check allergen info (can be 'NA' but not null/empty)
    IF NEW.allergen_info IS NULL OR TRIM(NEW.allergen_info) = '' THEN
        RAISE EXCEPTION 'P0 Violation: Allergen declaration is mandatory (use "NA" if no allergens)';
    END IF;
    
    -- Check accuracy confirmation
    IF NEW.accuracy_confirmed IS NOT TRUE THEN
        RAISE EXCEPTION 'P0 Violation: Seller must confirm accuracy of ingredient information';
    END IF;
    
    -- Check expiry date
    IF NEW.expiry_date IS NULL THEN
        RAISE EXCEPTION 'P0 Violation: Expiry date is mandatory for variant';
    END IF;
    
    -- Set confirmation timestamp if not set
    IF NEW.accuracy_confirmed_at IS NULL AND NEW.accuracy_confirmed = TRUE THEN
        NEW.accuracy_confirmed_at := now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate P0 fields on insert/update
DROP TRIGGER IF EXISTS trg_validate_variant_p0_fields ON listing_variants;
CREATE TRIGGER trg_validate_variant_p0_fields
    BEFORE INSERT OR UPDATE ON listing_variants
    FOR EACH ROW 
    EXECUTE FUNCTION validate_variant_p0_fields();

-- Function: Validate mandatory images
CREATE OR REPLACE FUNCTION validate_variant_mandatory_images()
RETURNS TRIGGER AS $$
DECLARE
    has_product_img BOOLEAN;
    has_ingredient_img BOOLEAN;
    has_nutrient_img BOOLEAN;
    has_fssai_img BOOLEAN;
BEGIN
    -- Check if all mandatory image types exist
    SELECT EXISTS (
        SELECT 1 FROM variant_images 
        WHERE variant_id = NEW.variant_id AND image_type = 'product'
    ) INTO has_product_img;
    
    SELECT EXISTS (
        SELECT 1 FROM variant_images 
        WHERE variant_id = NEW.variant_id AND image_type = 'ingredient_label'
    ) INTO has_ingredient_img;
    
    SELECT EXISTS (
        SELECT 1 FROM variant_images 
        WHERE variant_id = NEW.variant_id AND image_type = 'nutrition_label'
    ) INTO has_nutrient_img;
    
    SELECT EXISTS (
        SELECT 1 FROM variant_images 
        WHERE variant_id = NEW.variant_id AND image_type = 'fssai_certificate'
    ) INTO has_fssai_img;
    
    IF NOT has_product_img THEN
        RAISE EXCEPTION 'P0 Violation: Product image is mandatory';
    END IF;
    
    IF NOT has_ingredient_img THEN
        RAISE EXCEPTION 'P0 Violation: Ingredient label image is mandatory';
    END IF;
    
    IF NOT has_nutrient_img THEN
        RAISE EXCEPTION 'P0 Violation: Nutrition facts image is mandatory';
    END IF;
    
    IF NOT has_fssai_img THEN
        RAISE EXCEPTION 'P0 Violation: FSSAI certificate image is mandatory';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Log variant changes
CREATE OR REPLACE FUNCTION log_variant_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log ingredient changes
    IF OLD.ingredient_list IS DISTINCT FROM NEW.ingredient_list THEN
        INSERT INTO variant_edit_logs (variant_id, changed_by, field_changed, old_value, new_value, change_type)
        VALUES (NEW.variant_id, NEW.accuracy_confirmed_by, 'ingredient_list', OLD.ingredient_list, NEW.ingredient_list, 'ingredient_update');
    END IF;
    
    -- Log allergen changes
    IF OLD.allergen_info IS DISTINCT FROM NEW.allergen_info THEN
        INSERT INTO variant_edit_logs (variant_id, changed_by, field_changed, old_value, new_value, change_type)
        VALUES (NEW.variant_id, NEW.accuracy_confirmed_by, 'allergen_info', OLD.allergen_info, NEW.allergen_info, 'allergen_update');
    END IF;
    
    -- Log accuracy reconfirmation
    IF OLD.accuracy_confirmed_at IS DISTINCT FROM NEW.accuracy_confirmed_at THEN
        INSERT INTO variant_edit_logs (variant_id, changed_by, field_changed, old_value, new_value, change_type)
        VALUES (NEW.variant_id, NEW.accuracy_confirmed_by, 'accuracy_confirmed_at', 
                OLD.accuracy_confirmed_at::TEXT, NEW.accuracy_confirmed_at::TEXT, 'accuracy_reconfirm');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log changes on update
DROP TRIGGER IF EXISTS trg_log_variant_changes ON listing_variants;
CREATE TRIGGER trg_log_variant_changes
    AFTER UPDATE ON listing_variants
    FOR EACH ROW 
    EXECUTE FUNCTION log_variant_changes();

-- Function: Update timestamp on nutrient changes
CREATE OR REPLACE FUNCTION update_variant_nutrient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp
DROP TRIGGER IF EXISTS trg_update_variant_nutrient_timestamp ON variant_nutrient_details;
CREATE TRIGGER trg_update_variant_nutrient_timestamp
    BEFORE UPDATE ON variant_nutrient_details
    FOR EACH ROW 
    EXECUTE FUNCTION update_variant_nutrient_timestamp();

-- =====================================================
-- HELPER VIEWS FOR FRONTEND
-- =====================================================

-- View: Complete variant details (Amazon-style)
CREATE OR REPLACE VIEW variant_complete_details AS
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
    
    -- P0 Fields
    lv.ingredient_list,
    lv.allergen_info,
    lv.accuracy_confirmed,
    lv.accuracy_confirmed_at,
    
    -- Nutrient summary
    vnd.calories,
    vnd.total_fat_g,
    vnd.total_carbohydrates_g,
    vnd.protein_g,
    vnd.sodium_mg,
    
    -- Images count by type
    (SELECT COUNT(*) FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'product') as product_image_count,
    (SELECT COUNT(*) FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'ingredient_label') as ingredient_image_count,
    (SELECT COUNT(*) FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'nutrition_label') as nutrition_image_count,
    (SELECT COUNT(*) FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'fssai_certificate') as fssai_image_count,
    
    -- Primary images
    (SELECT image_url FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'product' AND is_primary = true LIMIT 1) as primary_product_image,
    (SELECT image_url FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'ingredient_label' LIMIT 1) as ingredient_label_image,
    (SELECT image_url FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'nutrition_label' LIMIT 1) as nutrition_label_image,
    (SELECT image_url FROM variant_images WHERE variant_id = lv.variant_id AND image_type = 'fssai_certificate' LIMIT 1) as fssai_certificate_image,
    
    -- Allergens
    (SELECT json_agg(am.allergen_name) 
     FROM variant_allergens va 
     JOIN allergen_master am ON va.allergen_id = am.allergen_id 
     WHERE va.variant_id = lv.variant_id) as allergen_list,
    
    -- Product listing info
    spl.seller_title,
    spl.seller_description,
    spl.business_name,
    spl.rating,
    spl.review_count,
    
    lv.created_at,
    lv.updated_at
    
FROM listing_variants lv
LEFT JOIN variant_nutrient_details vnd ON lv.variant_id = vnd.variant_id
LEFT JOIN seller_product_listings spl ON lv.listing_id = spl.listing_id;

-- =====================================================
-- RLS POLICIES (Security)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE variant_nutrient_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_edit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergen_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_allergens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read allergen master
CREATE POLICY "Allow public read access to allergen_master"
    ON allergen_master FOR SELECT
    TO public
    USING (true);

-- Policy: Sellers can manage their own variant nutrients
CREATE POLICY "Sellers can manage their variant nutrients"
    ON variant_nutrient_details FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM listing_variants lv
            JOIN seller_product_listings spl ON lv.listing_id = spl.listing_id
            WHERE lv.variant_id = variant_nutrient_details.variant_id
            AND spl.seller_id = auth.uid()
        )
    );

-- Policy: Sellers can manage their variant images
CREATE POLICY "Sellers can manage their variant images"
    ON variant_images FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM listing_variants lv
            JOIN seller_product_listings spl ON lv.listing_id = spl.listing_id
            WHERE lv.variant_id = variant_images.variant_id
            AND spl.seller_id = auth.uid()
        )
    );

-- Policy: Sellers can view their edit logs
CREATE POLICY "Sellers can view their variant edit logs"
    ON variant_edit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM listing_variants lv
            JOIN seller_product_listings spl ON lv.listing_id = spl.listing_id
            WHERE lv.variant_id = variant_edit_logs.variant_id
            AND spl.seller_id = auth.uid()
        )
    );

-- Policy: Sellers can manage their variant allergens
CREATE POLICY "Sellers can manage their variant allergens"
    ON variant_allergens FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM listing_variants lv
            JOIN seller_product_listings spl ON lv.listing_id = spl.listing_id
            WHERE lv.variant_id = variant_allergens.variant_id
            AND spl.seller_id = auth.uid()
        )
    );

-- =====================================================
-- HELPER FUNCTIONS FOR FRONTEND
-- =====================================================

-- Function: Get complete variant details with all images
CREATE OR REPLACE FUNCTION get_variant_complete_info(p_variant_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'variant_info', (
            SELECT row_to_json(vcd.*)
            FROM variant_complete_details vcd
            WHERE vcd.variant_id = p_variant_id
        ),
        'all_images', (
            SELECT json_agg(
                json_build_object(
                    'image_id', vi.image_id,
                    'image_type', vi.image_type,
                    'image_url', vi.image_url,
                    'alt_text', vi.alt_text,
                    'is_primary', vi.is_primary,
                    'sort_order', vi.sort_order
                )
                ORDER BY vi.sort_order
            )
            FROM variant_images vi
            WHERE vi.variant_id = p_variant_id
        ),
        'nutrient_details', (
            SELECT row_to_json(vnd.*)
            FROM variant_nutrient_details vnd
            WHERE vnd.variant_id = p_variant_id
        ),
        'allergens', (
            SELECT json_agg(
                json_build_object(
                    'allergen_name', am.allergen_name,
                    'severity', va.severity,
                    'notes', va.notes
                )
            )
            FROM variant_allergens va
            JOIN allergen_master am ON va.allergen_id = am.allergen_id
            WHERE va.variant_id = p_variant_id
        ),
        'edit_history', (
            SELECT json_agg(
                json_build_object(
                    'changed_at', vel.changed_at,
                    'field_changed', vel.field_changed,
                    'change_type', vel.change_type,
                    'change_reason', vel.change_reason
                )
                ORDER BY vel.changed_at DESC
            )
            FROM variant_edit_logs vel
            WHERE vel.variant_id = p_variant_id
            LIMIT 10
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comments for documentation
COMMENT ON TABLE variant_nutrient_details IS 'Detailed nutritional breakdown for each product variant (P0 requirement)';
COMMENT ON TABLE variant_images IS 'Multi-image support for variants including mandatory P0 images (ingredient, nutrition, FSSAI, product)';
COMMENT ON TABLE variant_edit_logs IS 'Audit trail for all changes to variant P0 fields';
COMMENT ON TABLE allergen_master IS 'Standardized list of allergens for consistent declaration';
COMMENT ON TABLE variant_allergens IS 'Junction table linking variants to their allergens';

COMMENT ON COLUMN listing_variants.ingredient_list IS 'P0: Mandatory complete ingredient list in descending order by weight';
COMMENT ON COLUMN listing_variants.allergen_info IS 'P0: Allergen declaration (use "NA" if no allergens present)';
COMMENT ON COLUMN listing_variants.accuracy_confirmed IS 'P0: Seller attestation confirming ingredient accuracy';
COMMENT ON COLUMN listing_variants.expiry_date IS 'P0: Mandatory expiry/best before date';
