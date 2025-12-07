# 🎯 Variant P0 Fields Implementation Guide (Amazon Style)

## ✅ Current Database Status

Your database already has:
- ✅ `listing_variants` table with P0 fields
- ✅ `seller_variant_edit_logs` for change tracking
- ✅ `variant_complete_details` view
- ✅ Validation triggers for P0 compliance

## 📋 P0 Mandatory Fields (Per Variant)

### 1. **Images (4 Required)**
| Field | Type | Description | Storage |
|-------|------|-------------|---------|
| `product_image_url` | TEXT | Main product photo | Supabase Storage bucket: `products` |
| `ingredient_image_url` | TEXT | Ingredient list label photo | Supabase Storage bucket: `products` |
| `nutrient_table_image_url` | TEXT | Nutrition facts label photo | Supabase Storage bucket: `products` |
| `fssai_label_image_url` | TEXT | FSSAI certificate photo | Supabase Storage bucket: `products` |

### 2. **Text Fields**
| Field | Type | Description | Validation |
|-------|------|-------------|-----------|
| `ingredient_list` | TEXT | Complete ingredient list | NOT NULL, min 10 chars |
| `allergen_info` | TEXT | Allergen declaration | Default 'NA', NOT NULL |
| `fssai_number` | VARCHAR(14) | 14-digit FSSAI license | Regex: `^[0-9]{14}$` |

### 3. **Dates**
| Field | Type | Description | Validation |
|-------|------|-------------|-----------|
| `expiry_date` | DATE | Product expiry date | Must be future date |
| `fssai_expiry_date` | DATE | FSSAI license expiry | Optional |

### 4. **Nutrient Breakdown (JSONB)**
```json
{
  "servingSize": "100g",
  "energyKcal": 450,
  "energyKj": 1883,
  "macronutrients": {
    "protein": {"value": 12.5, "unit": "g"},
    "carbohydrate": {"value": 65.0, "unit": "g", "ofWhichSugars": 15.0},
    "fat": {"value": 15.0, "unit": "g", "saturated": 8.0, "trans": 0.5}
  },
  "micronutrients": {
    "sodium": {"value": 450, "unit": "mg"},
    "calcium": {"value": 120, "unit": "mg"},
    "iron": {"value": 2.5, "unit": "mg"},
    "zinc": {"value": 1.2, "unit": "mg"},
    "vitaminA": {"value": 800, "unit": "mcg"},
    "vitaminC": {"value": 25, "unit": "mg"},
    "vitaminD": {"value": 5, "unit": "mcg"},
    "vitaminE": {"value": 10, "unit": "mg"}
  },
  "fiber": {"value": 3.5, "unit": "g"},
  "cholesterol": {"value": 0, "unit": "mg"}
}
```

### 5. **Accuracy Attestation**
| Field | Type | Description |
|-------|------|-------------|
| `accuracy_attested` | BOOLEAN | Seller confirmation (must be TRUE) |
| `attested_by` | UUID | Seller ID who attested |
| `attested_at` | TIMESTAMPTZ | When attested |

### 6. **Auto-Computed**
| Field | Type | Description |
|-------|------|-------------|
| `is_p0_compliant` | BOOLEAN | Generated field - TRUE when all P0 fields are valid |

---

## 🔧 Database Schema Summary

### Foreign Keys

```sql
listing_variants
├─ listing_id → seller_product_listings(listing_id) [CASCADE DELETE]
└─ attested_by → sellers(id) [SET NULL]

seller_variant_edit_logs
├─ variant_id → listing_variants(variant_id) [CASCADE DELETE]
└─ changed_by → sellers(id) [CASCADE DELETE]
```

### Existing Triggers

1. **`trg_validate_variant_p0_fields`** (BEFORE INSERT/UPDATE)
   - Validates all P0 fields are present
   - Validates FSSAI number format (14 digits)
   - Validates expiry date is in future
   - Auto-sets allergen_info to 'NA' if empty

2. **`trg_log_variant_changes`** (AFTER UPDATE)
   - Logs all P0 field changes to `seller_variant_edit_logs`
   - Tracks who made changes and when

---

## 🎨 Frontend Implementation Plan

### Step 1: Update Add Product Form

**Remove from Basic Info Tab:**
- ❌ Ingredient list (move to variant level)
- ❌ Single product image (move to variant level)

**Keep in Basic Info Tab:**
- ✅ Product title & description
- ✅ Category & subcategory
- ✅ Brand information
- ✅ Base price (optional)

### Step 2: Variant Form with P0 Fields

Create comprehensive variant form with tabs:

#### **Tab 1: Basic Info**
- Variant name, SKU, size, flavor
- Price, stock quantity
- Manufacture date, batch number

#### **Tab 2: P0 Compliance** ⭐
- **4 Image Uploads:**
  1. Product Photo
  2. Ingredient Label Photo
  3. Nutrition Facts Photo
  4. FSSAI Certificate Photo
  
- **FSSAI Information:**
  - FSSAI Number (14 digits)
  - FSSAI Expiry Date
  - Product Expiry Date

- **Ingredient List:**
  - Text area (min 10 characters)
  - Validation for required format

- **Allergen Declaration:**
  - Dropdown or text input
  - Default: "NA"
  - Common options: Milk, Eggs, Nuts, Gluten, Soy, etc.

#### **Tab 3: Nutrient Breakdown** 📊
Dynamic form with sections:

**Serving Information:**
- Serving size (text)
- Energy (kcal & kJ)

**Macronutrients:**
- Protein (g)
- Carbohydrates (g)
  - Of which sugars (g)
- Fat (g)
  - Saturated fat (g)
  - Trans fat (g)
- Fiber (g)

**Micronutrients (Optional but recommended):**
- Sodium (mg)
- Calcium (mg)
- Iron (mg)
- Zinc (mg)
- Vitamins A, C, D, E (mcg/mg)

**Accuracy Attestation:**
- ✅ Checkbox: "I confirm that all information is accurate"
- Display seller name and timestamp

---

## 🛍️ Amazon-Style Variant Display

### Product Detail Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Product Images     │  Product Info                     │
│  (Carousel)         │  - Title                          │
│  ┌──────────────┐   │  - Rating & Reviews               │
│  │              │   │  - Price (from lowest variant)    │
│  │   Primary    │   │                                   │
│  │   Product    │   │  Variant Selection:               │
│  │   Image      │   │  ┌─────┬─────┬─────┐            │
│  │              │   │  │ 100g│ 250g│ 500g│            │
│  └──────────────┘   │  └─────┴─────┴─────┘            │
│  [●○○○]             │                                   │
└─────────────────────┴───────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📑 Tabs for Selected Variant                           │
│  ┌──────┬──────┬──────┬──────┬──────────┐             │
│  │ℹ️Info│📊Facts│🖼️Imgs│📝Ingr│🔄 Restock│             │
│  └──────┴──────┴──────┴──────┴──────────┘             │
│                                                          │
│  [Tab Content - Changes based on selected variant]      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Tab 1: ℹ️ Variant Info
```typescript
- Variant name, size, flavor
- Price & discount
- Stock: XX units available
- SKU, batch number
- Manufacture date
- Expiry date
- FSSAI number & validity
- ✅ Restock Button (if low stock)
```

### Tab 2: 📊 Nutrition Facts
```typescript
Display nutrient_breakdown in table format:

Nutrition Facts
Serving Size: 100g
────────────────────────────
Energy         450 kcal
Protein        12.5 g
Carbohydrates  65.0 g
  of which sugars: 15.0 g
Fat            15.0 g
  Saturated:   8.0 g
  Trans:       0.5 g
Fiber          3.5 g
────────────────────────────
Sodium         450 mg
Calcium        120 mg
Iron           2.5 mg
Zinc           1.2 mg
```

### Tab 3: 🖼️ Images
```typescript
Display all 4 P0 images in grid:
┌────────────┬────────────┐
│  Product   │ Ingredient │
│   Photo    │   Label    │
├────────────┼────────────┤
│ Nutrition  │   FSSAI    │
│   Facts    │ Certificate│
└────────────┴────────────┘
(Click to enlarge/lightbox)
```

### Tab 4: 📝 Ingredients & Allergens
```typescript
Ingredients:
[Full ingredient list text]

Allergens:
⚠️ [Allergen info or "No allergens (NA)"]

Accuracy:
✅ Verified by [Business Name]
📅 Last updated: [Date]
```

### Tab 5: 🔄 Restock (Seller Only)
```typescript
Current Stock: XX units
Reserved: XX units
Available: XX units

[Input: Add Stock Quantity]
[Button: Update Stock]

Recent Changes:
- Added 50 units on Dec 1, 2024
- Sold 25 units on Dec 2, 2024
```

---

## 📝 Implementation Checklist

### Backend (Database - Already Done ✅)
- [x] P0 columns added to `listing_variants`
- [x] Validation triggers created
- [x] Edit logging table created
- [x] View `variant_complete_details` created
- [x] RLS policies configured

### Frontend Components to Create

#### 1. **Image Upload Component** (P0 Images)
```typescript
// src/components/products/P0ImageUpload.tsx
interface P0ImageUploadProps {
  variantId?: string;
  imageType: 'product' | 'ingredient' | 'nutrient' | 'fssai';
  currentUrl?: string;
  onUpload: (url: string) => void;
  required?: boolean;
}
```

#### 2. **Nutrient Breakdown Form**
```typescript
// src/components/products/NutrientBreakdownForm.tsx
interface NutrientFormProps {
  value?: NutrientBreakdown;
  onChange: (data: NutrientBreakdown) => void;
}
```

#### 3. **Variant Tab View** (Amazon Style)
```typescript
// src/components/products/VariantDetailTabs.tsx
interface VariantTabsProps {
  variant: VariantCompleteDetails;
  onRestock?: (quantity: number) => void;
  isOwner: boolean;
}
```

#### 4. **P0 Compliance Indicator**
```typescript
// src/components/products/P0ComplianceBadge.tsx
interface ComplianceBadgeProps {
  isCompliant: boolean;
  missingFields?: string[];
}
```

#### 5. **Update Add Product Form**
```typescript
// src/pages/AddProduct.tsx
// Remove: ingredient list from basic info
// Update: Move to variant-level form
// Add: P0 validation before submission
```

---

## 🔄 Workflow: Adding a Product with Variants

### Step-by-Step Process

1. **Basic Product Info**
   - Enter title, description
   - Select category, brand
   - Upload cover image (optional - use first variant's image)

2. **Add First Variant** (P0 Required)
   - Enter variant details (name, SKU, price, stock)
   - **Upload 4 mandatory images**
   - Enter FSSAI number & dates
   - Enter ingredient list
   - Select/enter allergen info
   - **Fill nutrient breakdown form**
   - ✅ Check accuracy attestation box
   - Save variant

3. **Add More Variants** (Repeat P0 for each)
   - Each variant must have its own:
     - 4 images
     - Ingredient list (can copy from similar variants)
     - Nutrient breakdown
     - Allergen info
     - FSSAI compliance

4. **Submit Product**
   - Validate: At least 1 P0-compliant variant
   - Auto-compute: `is_p0_compliant` for each variant
   - Status: "draft" → "active" (only if P0 compliant)

---

## 🎯 Key Features to Implement

### 1. **Smart Image Upload**
- Direct upload to Supabase Storage bucket: `products`
- Path structure: `{seller_id}/{listing_id}/{variant_id}/{image_type}.jpg`
- Auto-resize/compress images
- Preview before upload

### 2. **Copy Variant Feature**
- "Duplicate variant" button
- Copy all P0 data from existing variant
- Update variant-specific fields (size, flavor, price)
- Re-attest accuracy

### 3. **Bulk Upload (Future Enhancement)**
- CSV import for nutrient data
- Template download
- Validate CSV format

### 4. **Real-time Validation**
- Show P0 compliance status in variant list
- Color-coded badges:
  - 🟢 Green: Compliant
  - 🔴 Red: Missing fields
  - 🟡 Yellow: Pending attestation

### 5. **Edit History Modal**
- Show recent changes from `seller_variant_edit_logs`
- Display who changed what and when
- Highlight P0 field changes

---

## 🚀 Next Steps

1. **Create image upload component** with Supabase Storage integration
2. **Build nutrient breakdown form** with validation
3. **Update Add Product page** - remove ingredient list from basic info
4. **Create variant detail tabs** (Amazon-style)
5. **Add P0 compliance badges** to product listing page
6. **Implement edit history modal**
7. **Add "Copy Variant" feature**
8. **Test P0 validation triggers**

---

## 📊 Database Query Examples

### Get variant with all P0 details:
```sql
SELECT * FROM variant_complete_details 
WHERE variant_id = 'xxx';
```

### Check P0 compliance:
```sql
SELECT variant_id, variant_name, is_p0_compliant,
  CASE 
    WHEN product_image_url IS NULL THEN 'Missing product image'
    WHEN ingredient_image_url IS NULL THEN 'Missing ingredient image'
    WHEN nutrient_table_image_url IS NULL THEN 'Missing nutrient image'
    WHEN fssai_label_image_url IS NULL THEN 'Missing FSSAI image'
    WHEN ingredient_list IS NULL THEN 'Missing ingredients'
    WHEN accuracy_attested = false THEN 'Not attested'
    ELSE 'Compliant'
  END as status
FROM listing_variants
WHERE listing_id = 'xxx';
```

### Get edit history:
```sql
SELECT * FROM seller_variant_edit_logs
WHERE variant_id = 'xxx'
ORDER BY changed_at DESC
LIMIT 10;
```

---

## ⚠️ Important Notes

1. **Trigger already validates P0 fields** - Frontend should match backend validation
2. **FSSAI number must be 14 digits** - Add input mask
3. **Expiry date must be future** - Disable past dates in date picker
4. **Accuracy attestation is mandatory** - Cannot save without checking box
5. **Each variant is independent** - P0 must be completed for each
6. **Images stored in Supabase Storage** - Use bucket: `products`
7. **Nutrient breakdown is flexible** - JSONB allows custom nutrients
8. **Edit logs are automatic** - Trigger handles all logging

---

## 🎨 UI/UX Recommendations

### Color Scheme for P0 Status
- ✅ **Compliant**: Green (#10B981)
- ⚠️ **Incomplete**: Yellow (#F59E0B)
- ❌ **Non-compliant**: Red (#EF4444)

### Icons
- 🖼️ Images: Camera icon
- 📊 Nutrients: Chart icon
- 🏷️ Ingredients: List icon
- ✅ Attestation: Checkbox shield icon
- 🔄 Restock: Refresh icon

### Responsive Design
- Desktop: Tabs horizontal
- Mobile: Tabs vertical/accordion
- Touch-friendly image upload
- Swipeable image gallery

---

**Ready to implement! All database changes are already in place. Now focus on building the frontend components.**
