# Bundle Stock Calculation Fix - December 11, 2024

## Problem Statement
Bundles were showing incorrect stock quantities across Dashboard and Inventory pages. When sellers restocked bundles, the changes weren't reflected properly because:
1. Dashboard was incorrectly summing up product stocks instead of calculating available bundle units
2. Inventory page was using stale database values
3. Bundle restock dialog only updated database column without restocking actual products

## Root Cause
The bundle stock calculation had a fundamental flaw:
- **Incorrect Formula**: `total = (product_a_stock * quantity_a) + (product_b_stock * quantity_b)`
- **Correct Formula**: `total = min(product_a_stock / quantity_a, product_b_stock / quantity_b)`

Example:
- Bundle requires: 2x Product A, 1x Product B
- Product A has 10 units, Product B has 3 units
- **Wrong calculation**: 10×2 + 3×1 = 23 bundles ❌
- **Correct calculation**: min(10/2, 3/1) = min(5, 3) = 3 bundles ✅

## Changes Made

### 1. Fixed Bundle Stock Calculation in Inventory (`src/pages/Inventory.tsx`)
- Added `total_stock_quantity` to bundle items query
- Implemented dynamic stock calculation based on minimum available products
- Calculates how many complete bundles can be made from available product stock
- Bundles now display correctly even with 0 stock

**Logic**:
```typescript
const possibleBundles = bundleItems.map(item => {
  const productStock = item.seller_product_listings?.total_stock_quantity || 0;
  const requiredPerBundle = item.quantity || 1;
  return Math.floor(productStock / requiredPerBundle);
});
calculatedStock = Math.min(...possibleBundles);
```

### 2. Fixed Bundle Stock Calculation in Dashboard (`src/pages/Dashboard.tsx`)
- Updated `loadBundles()` function with correct calculation
- Updated `loadLowStockBundles()` function to calculate dynamically before filtering
- Removed incorrect summation logic
- Now properly identifies bundles with low stock

### 3. Fixed Bundle Stock in Dashboard Component (`src/components/DashboardProductStock.tsx`)
- Added bundle_items to query with product stock information
- Implemented same calculation logic as other components
- Ensures consistency across all dashboard views

### 4. Fixed Bundle Restock Dialog (`src/components/BundleRestockDialog.tsx`)
**Critical Fix**: The restock dialog was completely broken for the new system.

**Previous Behavior**:
- Only updated `bundles.total_stock_quantity` column in database
- Didn't actually restock products inside the bundle
- Changes weren't reflected because stock is now calculated dynamically

**New Behavior**:
- Fetches all bundle items and their current product stocks
- Calculates required stock increase for each product
- Updates each product's stock proportionally
- Example: Restocking bundle by 5 units:
  - Product A (needs 2 per bundle): +10 units
  - Product B (needs 1 per bundle): +5 units

**Code Changes**:
```typescript
// For each product in bundle
const stockToAdd = restockAmount * requiredPerBundle;
const newProductStock = currentProductStock + stockToAdd;
// Update seller_product_listings.total_stock_quantity
```

## Benefits
✅ Bundle stock accurately reflects available inventory
✅ Prevents overselling - shows true number of complete bundles
✅ Restocking bundles now actually restocks underlying products
✅ Consistent stock display across all pages (Dashboard, Inventory)
✅ Low stock alerts work correctly for bundles
✅ Automatic recalculation when products are restocked

## Testing Recommendations
1. Create a bundle with 2+ products at different stock levels
2. Verify bundle stock shows minimum possible complete bundles
3. Restock individual products and verify bundle stock updates
4. Use bundle restock dialog and verify all products increase proportionally
5. Check low stock notifications trigger at correct thresholds
6. Verify bundle displays in Inventory page even with 0 stock

## Technical Notes
- Bundle stock is now calculated dynamically on every load
- Database `bundles.total_stock_quantity` is updated for reference but not used for display
- All calculations use `Math.floor()` to ensure only complete bundles are counted
- Negative stock prevention implemented in restock dialog

## Files Modified
1. `src/pages/Inventory.tsx` - Bundle loading and stock calculation
2. `src/pages/Dashboard.tsx` - Bundle queries and calculations
3. `src/components/DashboardProductStock.tsx` - Bundle stock display
4. `src/components/BundleRestockDialog.tsx` - Restock logic completely rewritten
