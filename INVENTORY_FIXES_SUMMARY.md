# Inventory System Fixes - Summary

## Issues Fixed

### 1. **Foreign Key Constraint Violation**
**Problem**: When adding a product, you were getting a foreign key constraint error because `seller_product_listings.global_product_id` must reference a valid entry in `global_products` table.

**Solution**:
- Added validation to ensure both brand and global product are selected before saving
- Added brand-product mismatch validation
- Ensured the flow: Select Brand → Select/Create Product → Add Variants → Save
- Added better error messages to guide users

### 2. **Brand & Product Selection UX**
**Problem**: Search-based popup interface was confusing and didn't show all available options.

**Solution**:
- Replaced search-based Popover/Command components with simple Select dropdowns
- Added `getAllBrands()` and `getAllGlobalProducts()` functions to load all options on dialog open
- Products dropdown now filters by selected brand automatically
- Added "+" buttons next to each dropdown to create new brands/products
- Shows selected brand/product name below dropdowns for confirmation

### 3. **Restock Feature**
**Added**: New restock functionality for managing inventory

**Features**:
- New `RestockDialog` component (`src/components/RestockDialog.tsx`)
- "Restock" button on each variant in the inventory grid
- Can increase or decrease stock with +/- buttons or direct input
- Shows current stock, restock amount, and new stock total
- Auto-recalculates listing's `total_stock_quantity` after update
- Visual indicators for low stock (< 10 units shows in red)

## Files Modified

1. **`src/lib/inventory-helpers.ts`**
   - Added `getAllGlobalProducts()` - Fetches all products ordered by name
   - Added `getAllBrands()` - Fetches all brands ordered by name

2. **`src/components/AddProductDialog.tsx`**
   - Replaced Popover/Command UI with Select dropdowns
   - Added brand/product validation before saving
   - Loads all brands and products on mount
   - Filters products by selected brand
   - Added create buttons with prompts
   - Commented out `listing_allergens` insert (table doesn't exist in database.types.ts yet)

3. **`src/components/RestockDialog.tsx`** (NEW)
   - Standalone restock dialog component
   - Increment/decrement controls
   - Updates variant stock
   - Recalculates total listing stock
   - Toast notifications

4. **`src/pages/Inventory.tsx`**
   - Added RestockDialog import
   - Added `restockTarget` state
   - Added "Restock" button to each variant
   - Renders RestockDialog when variant selected

## How to Test

### Testing Product Creation:

1. **Open Inventory Page**
   - Click "Add Product" button

2. **Select Brand**
   - Use the dropdown to select an existing brand
   - OR click the "+" button to create a new brand

3. **Select Product**
   - After selecting brand, product dropdown enables
   - Products are filtered to show only those from selected brand
   - OR click the "+" button to create a new product

4. **Fill Required Fields**
   - Description (required)
   - At least one variant (required)

5. **Save**
   - Click "Save as Draft" or "Publish Now"
   - Should save successfully without foreign key errors!

### Testing Restock Feature:

1. **Find a Variant**
   - Go to Inventory page
   - Expand a product card's variants section

2. **Click Restock**
   - Click "Restock" button on any variant
   - Dialog opens showing current stock

3. **Adjust Stock**
   - Use +/- buttons to adjust by 10 units
   - OR type a number directly
   - Can use negative numbers to reduce stock
   - New stock total shows in real-time

4. **Update**
   - Click "Update Stock"
   - Success toast appears
   - Product card refreshes with new stock count

## Known Issues

- `listing_allergens` table insert is commented out because the table doesn't exist in `database.types.ts`
- You'll need to run the migration `supabase/migrations/20251105000000_add_listing_allergens_and_helpers.sql` and regenerate types

## Database Requirements

Make sure these tables exist and have proper relationships:
- `brands` (brand_id, name, is_active)
- `global_products` (global_product_id, product_name, brand_id, is_active)
- `seller_product_listings` (listing_id, global_product_id, seller_id, ...)
- `listing_variants` (variant_id, listing_id, stock_quantity, ...)

## Next Steps

To commit these changes:
```powershell
git add .
git commit -m "fix: resolve foreign key constraint, add dropdowns and restock feature"
git push
```

## Testing Checklist

- [ ] Can select existing brand from dropdown
- [ ] Can create new brand with + button
- [ ] Products dropdown filters by selected brand
- [ ] Can create new product with + button
- [ ] Can add product successfully (no foreign key errors)
- [ ] Can save as draft
- [ ] Can publish product
- [ ] Can restock variants
- [ ] Stock totals update correctly
- [ ] Can reduce stock with negative numbers
- [ ] Validation messages show for missing fields
