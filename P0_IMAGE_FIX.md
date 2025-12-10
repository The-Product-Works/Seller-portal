# P0 Image Upload Fix - Blob URL Issue

## Problem Identified ✅

The P0 compliance images (product photo, ingredient, nutrition facts, FSSAI) were showing "No Image" in the Details tab because:

1. **Blob URLs saved instead of storage URLs**: When users selected P0 images, the code was saving temporary browser blob URLs (e.g., `blob:http://localhost:8080/5cd27059...`) to the database instead of uploading files to Supabase storage.

2. **Property name mismatch**: The UI was setting file properties as `ingredientImageFile`, `nutrientImageFile`, `fssaiImageFile` but the upload code was looking for `ingredientImage`, `nutritionImage`, `fssaiImage`.

3. **Blob URLs don't persist**: Blob URLs only work in the browser session where they were created. After page reload, they become invalid, causing "No Image" to display.

## Root Cause

In `AddProductDialog.tsx` Media tab P0 image handlers (around line 1985-2065):

```typescript
// ❌ OLD CODE (BROKEN)
onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    updatedVariants[index] = {
      ...updatedVariants[index],
      ingredientImageFile: file,              // Wrong property name
      ingredient_image_url: URL.createObjectURL(file)  // Blob URL saved to DB!
    };
  }
}}
```

The `ingredient_image_url` blob URL was being saved directly to the database in the variant state, and the upload code never ran because it looked for `ingredientImage` not `ingredientImageFile`.

## Solution Applied ✅

### 1. Fixed Property Names
Changed file properties to match what upload code expects:
- `productImageFile` → `productImage` ✅
- `ingredientImageFile` → `ingredientImage` ✅
- `nutrientImageFile` → `nutritionImage` ✅
- `fssaiImageFile` → `fssaiImage` ✅

### 2. Separated Preview from Database URL
Created separate preview properties:
- `productImagePreview` - for UI display only
- `ingredientImagePreview` - for UI display only
- `nutritionImagePreview` - for UI display only
- `fssaiImagePreview` - for UI display only

### 3. Updated Code (Fixed)

```typescript
// ✅ NEW CODE (FIXED)
onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    updatedVariants[index] = {
      ...updatedVariants[index],
      ingredientImage: file,                      // Correct property name
      ingredientImagePreview: URL.createObjectURL(file)  // Preview only
    };
    // ingredient_image_url NOT SET - will be set after upload
  }
}}
```

Now the flow works correctly:
1. User selects file → `ingredientImage` property set with File object
2. Upload code finds `ingredientImage` → uploads to Supabase storage
3. After successful upload → real storage URL saved to `ingredient_image_url`
4. Database gets permanent URL, not blob URL ✅

## Database Cleanup Required

Existing "chocos" variant has blob URLs that need to be cleared:

```sql
-- Run this in Supabase SQL Editor
UPDATE listing_variants
SET 
  image_url = NULL,
  ingredient_image_url = NULL,
  nutrient_table_image_url = NULL,
  fssai_label_image_url = NULL
WHERE variant_name = 'chocos'
  AND (
    image_url LIKE 'blob:%'
    OR ingredient_image_url LIKE 'blob:%' 
    OR nutrient_table_image_url LIKE 'blob:%' 
    OR fssai_label_image_url LIKE 'blob:%'
  );
```

See `CLEANUP_BLOB_URLS.sql` for full cleanup script.

## Testing Steps

1. **Clean database**: Run `CLEANUP_BLOB_URLS.sql` to remove blob URLs
2. **Edit product**: Open "chocos" product in edit mode
3. **Go to Media tab**: Select the "chocos" variant
4. **Upload P0 images**:
   - Product Photo
   - Ingredient List Image
   - Nutrition Facts Table Image
   - FSSAI Label Image
5. **Save product**: Wait for success message
6. **Reload page**: Open product in Details view
7. **Verify**: All 4 P0 images should now display correctly! ✅

## Files Modified

- `src/components/AddProductDialog.tsx`:
  - Line ~820: Product image upload logic added
  - Line ~1978: Product Photo input field added
  - Line ~2010: Ingredient image handler fixed
  - Line ~2050: Nutrition image handler fixed  
  - Line ~2085: FSSAI image handler fixed
- `src/components/ProductDetailModal.tsx`:
  - Line ~80: Product image added to gallery P0 images
  - Line ~635: Product Photo display fixed (image_url)
- `src/pages/Inventory.tsx`:
  - Line ~1440: Product image added to P0 images array

## Expected Outcome

After fix:
- ✅ All 4 P0 images upload to Supabase storage (product bucket)
- ✅ Real storage URLs saved to database
- ✅ Images persist across page reloads
- ✅ Details tab displays all 4 P0 compliance images (Product Photo, Ingredient, Nutrition, FSSAI)
- ✅ Inventory scroller includes all P0 images
- ✅ Image gallery shows P0 images when switching variants

## Why This Happened

The original code was setting the database URL field directly with the preview blob URL, which bypassed the upload logic entirely. The files never got uploaded to Supabase storage, so after the browser session ended, the blob URLs became invalid.

Now the flow is:
1. Select file → Store in `ingredientImage` property + create preview
2. Save → Upload code finds `ingredientImage` → uploads to storage
3. Get public URL → Save to `ingredient_image_url` in database
4. Display → Load from database → show real storage URL ✅
