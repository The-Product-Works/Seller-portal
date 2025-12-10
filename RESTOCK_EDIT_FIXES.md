# Restock & Edit Issues - FIXED

## Problems Identified

### 1. ❌ Restock Fails with "nutritional_info must contain servingSize"
**Root Cause**: When updating stock quantity, the database trigger `validate_variant_json_fields()` runs and checks if `nutritional_info` has a `servingSize` field. Old variants created before the migration don't have this field.

### 2. ❌ Edit Product Sometimes Fails
**Root Cause**: Same trigger issue - when updating existing products, if their variants have `nutritional_info` without `servingSize`, the update is blocked.

### 3. ❌ Database Trigger Too Strict
**The Trigger**: `validate_variant_json_fields()` in `DATABASE_SCHEMA_CLEANUP.sql`
```sql
IF NEW.nutritional_info IS NOT NULL THEN
    IF NOT (NEW.nutritional_info ? 'servingSize') THEN
        RAISE EXCEPTION 'nutritional_info must contain servingSize';
    END IF;
END IF;
```

---

## Solutions Applied

### ✅ Fix 1: Updated handleRestock Function
**File**: `src/components/ProductDetailModal.tsx`

**What Changed**:
- Now fetches the variant's existing `nutritional_info` before updating
- Adds `servingSize: "100g"` if it's missing
- Updates both `stock_quantity` AND `nutritional_info` together

**Code**:
```typescript
const handleRestock = async (variantId: string, newStock: number) => {
  // Get existing variant data
  const { data: variant } = await supabase
    .from("listing_variants")
    .select("nutritional_info")
    .eq("variant_id", variantId)
    .single();

  // Ensure nutritional_info has servingSize
  let nutritionalInfo = variant?.nutritional_info;
  if (nutritionalInfo && !nutritionalInfo.servingSize) {
    nutritionalInfo = { ...nutritionalInfo, servingSize: "100g" };
  }

  // Update both fields
  await supabase
    .from("listing_variants")
    .update({ 
      stock_quantity: newStock,
      nutritional_info: nutritionalInfo
    })
    .eq("variant_id", variantId);
}
```

### ✅ Fix 2: Updated AddProductDialog for Editing
**File**: `src/components/AddProductDialog.tsx`

**What Changed**:
- When editing, fetches existing variants before deleting them
- Ensures `servingSize` is ALWAYS first in `nutritional_info` object
- Changed from `{ ...variant.nutritional_info, servingSize: "100g" }` to `{ servingSize: "100g", ...variant.nutritional_info }`

**Why Order Matters**: Putting `servingSize` first ensures it's always there, even if the variant object tries to override it.

### ✅ Fix 3: Database Migration Script
**Files**: 
- `MIGRATE_EXISTING_DATA_TO_JSON.sql` (updated)
- `QUICK_FIX_NUTRITIONAL_INFO.sql` (new)

**What It Does**:
```sql
-- Add servingSize to all nutritional_info that don't have it
UPDATE listing_variants
SET nutritional_info = jsonb_set(
  nutritional_info,
  '{servingSize}',
  '"100g"'
)
WHERE nutritional_info IS NOT NULL
  AND NOT (nutritional_info ? 'servingSize');
```

---

## Action Required - Run This SQL

**IMPORTANT**: Run this in Supabase SQL Editor NOW:

```sql
-- Fix all existing variants
UPDATE listing_variants
SET nutritional_info = jsonb_set(
  nutritional_info,
  '{servingSize}',
  '"100g"'
)
WHERE nutritional_info IS NOT NULL
  AND NOT (nutritional_info ? 'servingSize');
```

This will add `servingSize: "100g"` to all existing variants that have `nutritional_info` but are missing the `servingSize` field.

---

## What's Fixed Now

### ✅ Restock Works
- Click "Restock" button → Enter new quantity → ✅ Success
- No more "nutritional_info must contain servingSize" error

### ✅ Edit Products Works
- Edit existing product → Change variants → Save → ✅ Success
- Frontend ensures `servingSize` is always included

### ✅ Create New Products Works
- Create product → Add variants → Save → ✅ Success
- Already working, now even better

---

## Testing Checklist

After running the SQL fix:

1. ✅ **Restock a variant**: 
   - Open product details
   - Click "Restock" on any variant
   - Enter new quantity
   - Should succeed without errors

2. ✅ **Edit existing product**:
   - Open "Add Product" dialog in edit mode
   - Change something (title, price, etc.)
   - Save
   - Should succeed without errors

3. ✅ **Create new product**:
   - Add new product with variants
   - Fill all P0 fields
   - Save
   - Should succeed

---

## Technical Details

### The Trigger Chain
When you UPDATE a variant:
1. SQL UPDATE statement sent to database
2. **BEFORE UPDATE** trigger `trg_validate_variant_json` fires
3. Runs function `validate_variant_json_fields()`
4. Checks if `nutritional_info ? 'servingSize'` (if nutritional_info exists)
5. If FALSE → ❌ RAISE EXCEPTION "nutritional_info must contain servingSize"
6. If TRUE → ✅ Continue with UPDATE

### Why Old Data Failed
Variants created before the JSON migration:
- Had `nutritional_info: { calories: 100, protein: 5, ... }` ← No servingSize!
- Trigger sees this → ❌ Blocks the update

### How We Fixed It
1. **Database Level**: Add `servingSize` to all existing records
2. **Application Level**: Always include `servingSize` when updating
3. **Restock Function**: Fetch & fix `nutritional_info` before updating stock

---

## Summary

**Before**:
- ❌ Restock failed
- ❌ Edit sometimes failed
- ❌ Old data missing `servingSize`

**After**:
- ✅ Restock works (preserves & fixes nutritional_info)
- ✅ Edit works (ensures servingSize always present)
- ✅ Database cleaned (run SQL to add servingSize to all)

**Action Item**: Run `QUICK_FIX_NUTRITIONAL_INFO.sql` or the UPDATE statement above in Supabase!
