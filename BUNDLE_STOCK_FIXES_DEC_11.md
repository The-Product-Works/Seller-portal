# Bundle Stock Calculation Fixes - December 11, 2025

## 🎯 Problem Summary

Bundles were showing **incorrect stock quantities** across Dashboard and Inventory pages:
- Bundle showing 30 stock in database but 0 in Dashboard
- Bundles not visible in Inventory page
- Restocking bundles didn't update the displayed stock
- Bundle stock calculation was fundamentally broken

## 🔧 Root Cause

The bundle stock system had multiple critical flaws:

1. **Incorrect Calculation Formula**: Dashboard was **adding up** all product stocks instead of calculating minimum bundles
   - ❌ Wrong: `10*2 + 3*1 = 23` 
   - ✅ Correct: `min(10/2, 3/1) = min(5, 3) = 3`

2. **Stale Database Values**: Inventory was displaying the `bundles.total_stock_quantity` column which was never updated when products were restocked

3. **Broken Restock Dialog**: `BundleRestockDialog` only updated the database column, not the actual products inside the bundle

## ✅ Solutions Implemented

### 1. Fixed Bundle Stock Calculation Logic (3 files)

**Correct Formula**: Bundle stock = minimum number of **complete bundles** that can be made from available products.

**Example**: 
- Bundle contains: 2x Product A + 1x Product B
- Product A stock: 10 units → can make 5 bundles (10/2)
- Product B stock: 3 units → can make 3 bundles (3/1)
- **Bundle stock: min(5, 3) = 3 bundles** ✅

#### Files Modified:

**`src/pages/Inventory.tsx`** (lines 276-340)
- Added `total_stock_quantity` to bundle items query
- Calculate bundle stock dynamically: `Math.floor(productStock / requiredPerBundle)`
- Find minimum across all products: `Math.min(...possibleBundles)`
- Show all bundles regardless of stock level (0 stock bundles now visible)

**`src/pages/Dashboard.tsx`** (lines 241-300)
- Fixed `loadBundles()` - Changed from sum to minimum calculation
- Fixed `loadLowStockBundles()` - Calculate stock dynamically then filter
- Added `BundleWithItems` TypeScript interface for type safety
- Updated all bundle state variables to use correct type

**`src/components/DashboardProductStock.tsx`** (lines 100-180)
- Added `bundle_items` with product stock to query
- Calculate bundle stock from minimum available products
- Update low stock count based on calculated values

### 2. Fixed Bundle Restock Functionality

**`src/components/BundleRestockDialog.tsx`** (complete rewrite)

**Previous Behavior** ❌:
- Only updated `bundles.total_stock_quantity` column in database
- Did NOT restock actual products
- Changes ignored by new dynamic calculation

**New Behavior** ✅:
- Fetches all bundle items with current stock
- Calculates required stock per product: `restockAmount × requiredPerBundle`
- Updates each product's stock proportionally
- Example: Restock bundle by 5 units
  - Product A (needs 2 per bundle): Add 5 × 2 = 10 units
  - Product B (needs 1 per bundle): Add 5 × 1 = 5 units
- Bundle stock automatically reflects new totals

Key changes:
```typescript
// OLD: Only updated bundle table (useless)
await supabase.from("bundles").update({ total_stock_quantity: newStock })

// NEW: Updates all products in bundle
for (const item of bundleItems) {
  const stockToAdd = restockAmount * item.quantity;
  await supabase.from("seller_product_listings")
    .update({ total_stock_quantity: currentStock + stockToAdd })
}
```

## 📊 Impact

### Before Fixes:
- ❌ Bundle "daisyyy": DB shows 30, Dashboard shows 0
- ❌ Bundles with 0 stock hidden in Inventory
- ❌ Restocking bundle to 30 → no visible change
- ❌ Bundle stock didn't update when products restocked

### After Fixes:
- ✅ Bundle stock calculated correctly everywhere
- ✅ All bundles visible in Inventory (even 0 stock)
- ✅ Restocking bundle → products restocked → bundle stock updates
- ✅ Automatic updates when individual products restocked
- ✅ Consistent behavior across Dashboard, Inventory, and DashboardProductStock

## 🧪 Testing Checklist

- [x] Bundle stock displays correctly in Dashboard
- [x] Bundle stock displays correctly in Inventory
- [x] Bundles with 0 stock are visible
- [x] Restock bundle dialog updates product stocks
- [x] Bundle stock updates after product restock
- [x] Low stock bundle notifications work
- [x] All TypeScript types correct
- [x] No ESLint errors (only style warnings remain)

## 🔄 Migration Notes

**No database migration required** - changes are purely in calculation logic.

However, existing `bundles.total_stock_quantity` values in database may be stale. The system now calculates dynamically, so:
- Old DB values are **ignored** for display
- DB column still updated for reference/audit trail
- System will auto-calculate correct values on page load

## 📝 Technical Details

### Stock Calculation Algorithm
```typescript
function calculateBundleStock(bundleItems) {
  const possibleBundles = bundleItems.map(item => {
    const productStock = item.seller_product_listings.total_stock_quantity;
    const requiredPerBundle = item.quantity;
    return Math.floor(productStock / requiredPerBundle);
  });
  return Math.min(...possibleBundles);
}
```

### Type Definitions
```typescript
interface BundleWithItems extends Bundle {
  bundle_items?: Array<{
    quantity: number;
    listing_id: string;
    seller_product_listings?: {
      total_stock_quantity: number;
      // ... other fields
    };
  }>;
}
```

## 🚀 Deployment

All changes are **backward compatible**:
- ✅ No breaking changes to API
- ✅ No database schema changes
- ✅ Safe to deploy immediately
- ✅ Will fix existing data issues automatically

## 👥 Developer Notes

If you need to add bundle features in future:
1. Always calculate bundle stock dynamically (don't trust DB column)
2. Use the `calculateBundleStock` pattern shown above
3. When updating bundle stock, update **product stocks**, not bundle table
4. Include `bundle_items` with `total_stock_quantity` in all bundle queries

---

**Files Changed**: 4 files
**Lines Modified**: ~250 lines
**Tests Passing**: ✅ All TypeScript checks pass
**Ready for Production**: ✅ Yes
