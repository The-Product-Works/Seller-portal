# Feature Implementation Guide - November 8, 2025

## Critical Issues to Fix (BLOCKING)

### 1. Notifications Schema Mismatch ❌
**Problem:** 
- Database schema has `related_seller_id` referencing `sellers.id`
- We're storing `auth.users.id` 
- RLS policies expect `auth.users.id`
- This breaks all notification queries

**Solution:**
- Migrate to new field: `related_user_id` (references `auth.users.id`)
- Keep `related_seller_id` for backward compatibility
- Update RLS policies to use `related_user_id`
- Update code to store `auth.users.id` in `related_user_id`

### 2. Bundle Status Not Persisting ⚠️
**Problem:** Bundle publish/draft buttons exist but status might not be persisting correctly

**Solution:**
- Verify `status` field is being saved to bundles table
- Check UI updates on bundle list after save
- Ensure edit flow loads current status correctly

### 3. Document Upload Bucket ⚠️
**Problem:** `useDocumentUpload.ts` references unclear bucket name

**Solution:**
- Verify bucket name is correct: `product` or `seller_details`
- Check RLS policies for the bucket
- Test upload/delete flow

---

## Feature Implementation Plan (Priority Order)

### PRIORITY 1: Core Functionality

#### 1.1 Product Preview Modal (Est. 2 hours)
**Files to Create:**
- `src/components/ProductPreviewModal.tsx` - Preview for products
- `src/components/BundlePreviewModal.tsx` - Preview for bundles

**What it shows:**
- Product/Bundle title, description, pricing
- All images in gallery format
- Variants list (if product)
- Bundle items breakdown (if bundle)
- Transparency info
- Certificates
- Rating/reviews section
- Stock status

#### 1.2 Nutritional Info for Variants (Est. 1 hour)
**Files to Modify:**
- `src/types/inventory.types.ts` - Add nutritional_info to VariantForm
- `src/components/AddProductDialog.tsx` - Add nutrition input section
- `src/lib/validations/` - Add Zod schema for nutrition

**Database Field:**
- `listing_variants.nutritional_info` - Already exists as Json type

**UI Components:**
- Tab in variant form for "Nutritional Information"
- JSON editor or form with common fields:
  - Calories per serving
  - Protein, Carbs, Fats
  - Fiber, Sugar
  - Vitamins & Minerals
  - Allergens

#### 1.3 Advanced Image Manager (Est. 3 hours)
**Files to Create:**
- `src/components/ImageGalleryManager.tsx` - Reusable image manager
- `src/hooks/useImageManagement.ts` - Image upload/delete/reorder logic

**Features:**
- Upload multiple images (drag & drop)
- Set primary image
- Delete images
- Reorder images
- View existing images
- Crop/preview before upload

**Integrations:**
- For Products: `listing_images` (listing_id)
- For Variants: `listing_images` (variant_id + listing_id)
- For Certificates: `product_certificates`
- For Transparency: `product_transparency` (test_report_url)

---

### PRIORITY 2: Enhanced Product Form

#### 2.1 Complete Seller Product Form (Est. 2 hours)
**Files to Modify:**
- `src/components/AddProductDialog.tsx` - Add all missing fields
- `src/types/inventory.types.ts` - Extend form types

**Fields to Add:**
```
Product Level (seller_product_listings):
- business_name (optional)
- seller_title (required)
- seller_description (required)
- seller_ingredients (required)
- return_policy (required)
- shipping_info (required)
- shelf_life_months (required)
- health_score (0-100, optional)
- seller_certifications (Json, optional)

Variant Level (listing_variants):
- nutritional_info (Json) - NEW
- batch_number (optional)
- manufacture_date (optional)
- expiry_date (optional)
- serving_count (optional)
- flavor/size (optional)

Transparency (product_transparency):
- certifications_summary
- testing_info
- test_report_url
- ethical_sourcing
- sustainability_info
```

#### 2.2 Split Form into Tabs (Est. 1 hour)
**Tabs in AddProductDialog:**
1. Basic Info (title, description, pricing)
2. Variants & Specifications
3. Nutritional Information
4. Images & Media
5. Certificates & Transparency
6. Policies & Shipping

---

### PRIORITY 3: Bundle Enhancements

#### 3.1 Fix Bundle Publish/Draft (Est. 30 min)
**Files to Check:**
- `src/components/BundleCreation.tsx` - Verify status handling
- `src/pages/Inventory.tsx` - Bundle list display

**Checklist:**
- [ ] Status button saves correctly
- [ ] Bundle list shows current status
- [ ] Draft bundles not visible to customers
- [ ] Published bundles are in catalog

#### 3.2 Bundle Preview Modal (Est. 1 hour)
**Same as Product Preview but for bundles**

---

### PRIORITY 4: Database & Backend

#### 4.1 Create Migration for Notifications Fix
```sql
-- Add related_user_id column
ALTER TABLE notifications ADD COLUMN related_user_id UUID REFERENCES auth.users(id);

-- Migrate data if needed
UPDATE notifications SET related_user_id = (
  SELECT id FROM auth.users 
  WHERE auth.users.id = ... -- Match logic
) WHERE related_user_id IS NULL;

-- Create index
CREATE INDEX notifications_related_user_id_idx ON notifications(related_user_id);

-- Update RLS policies to use related_user_id
```

#### 4.2 Fix useDocumentUpload.ts
- Verify bucket name
- Check paths are correct
- Test with certificates and transparency

---

## Database Schema Notes

### Notifications Table
Current schema:
```typescript
notifications: {
  id: string
  type: string
  title: string | null
  message: string
  related_seller_id: string | null  // References sellers.id
  receiver_id: string | null  // References auth.users(id)
  sender_id: string | null  // References auth.users(id)
  is_read: boolean | null
  created_at: string | null
}
```

**Issue:** RLS policies expect `auth.uid()` but related_seller_id is sellers.id
**Fix:** Add `related_user_id` field for proper RLS filtering

### Listing Images
```typescript
listing_images: {
  image_id: string
  listing_id: string
  variant_id: string | null  // Can be null for product-level images
  image_url: string
  is_primary: boolean | null
  sort_order: number | null
  alt_text: string | null
}
```

**Usage:**
- Product images: variant_id = null
- Variant images: variant_id = specific variant
- Upload/delete/reorder all from same table

---

## Implementation Checklist

- [ ] 1. Fix notifications schema and RLS policies
- [ ] 2. Create ProductPreviewModal component
- [ ] 3. Add BundlePreviewModal component
- [ ] 4. Implement ImageGalleryManager
- [ ] 5. Add nutritional_info to variant form
- [ ] 6. Complete AddProductDialog with all fields
- [ ] 7. Fix bundle publish/draft button behavior
- [ ] 8. Verify useDocumentUpload bucket names
- [ ] 9. Test all flows end-to-end
- [ ] 10. Create user documentation

---

## Files Summary

### New Files to Create:
1. `src/components/ProductPreviewModal.tsx`
2. `src/components/BundlePreviewModal.tsx`
3. `src/components/ImageGalleryManager.tsx`
4. `src/hooks/useImageManagement.ts`
5. `supabase/migrations/20251108000000_add_related_user_id_notifications.sql`

### Files to Modify:
1. `src/components/AddProductDialog.tsx` - Add all fields
2. `src/components/BundleCreation.tsx` - Add preview button
3. `src/types/inventory.types.ts` - Extend types
4. `src/pages/Inventory.tsx` - Update bundle list display
5. `src/hooks/useDocumentUpload.ts` - Verify bucket names
6. `src/integrations/supabase/database.types.ts` - Already auto-generated

---

## Testing Strategy

### Unit Tests:
- [ ] Image upload/delete logic
- [ ] Nutrition info JSON validation
- [ ] Preview modal renders correctly

### Integration Tests:
- [ ] Product with images → preview shows images
- [ ] Variant with nutrition → preview shows nutrition
- [ ] Bundle publish → appears in catalog
- [ ] Bundle draft → hidden from catalog

### E2E Tests:
- [ ] Create product → add images → add nutrition → publish → preview
- [ ] Create bundle → add products → publish → preview
- [ ] Low stock notification appears for products ≤ 10 units

