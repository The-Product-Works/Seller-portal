# Changes Made on December 11, 2025

## 1. Bundle Stock Calculation Fix 🎯

### Problem
- Bundles showed incorrect stock in Dashboard and Inventory
- Dashboard was adding up product stocks (wrong: `10*2 + 3*1 = 23`)
- Inventory used stale database values
- Restocking bundles didn't update actual product stocks

### Solution
**Correct Calculation**: Bundle stock = minimum number of complete bundles that can be made
- Example: Bundle needs 2x Product A (10 stock) + 1x Product B (3 stock)
- Correct: `min(10/2, 3/1) = min(5, 3) = 3` bundles ✅

### Files Modified
1. **`src/pages/Inventory.tsx`**
   - Added dynamic bundle stock calculation from bundle items
   - Included bundles even with 0 stock

2. **`src/pages/Dashboard.tsx`**
   - Fixed `loadBundles()` to calculate minimum available bundles
   - Fixed `loadLowStockBundles()` with same logic

3. **`src/components/DashboardProductStock.tsx`**
   - Added bundle_items query
   - Calculate stock dynamically

4. **`src/components/BundleRestockDialog.tsx`** ⭐ MAJOR FIX
   - Now actually restocks products inside the bundle proportionally
   - Before: Only updated `bundles.total_stock_quantity` (useless)
   - After: Fetches bundle items and adds stock to each product
   - Example: Restock bundle by 5 → Product A gets +10 (5×2), Product B gets +5 (5×1)

---

## 2. FSSAI Certificate Upload Feature 📄

### Problem
- KYC had FSSAI license number field but no way to upload certificate
- Certificate document (PDF or image) was not stored

### Solution
Added FSSAI certificate upload to KYC page

### Database Changes
**Migration**: `supabase/migrations/20251211_add_fssai_certificate.sql`
- Added `fssai_certificate_url` column to `sellers` table
- Updated `seller_documents.doc_type` constraint to include `'fssai_certificate'`

### Code Changes

1. **`src/types/seller.types.ts`**
   - Added `"fssai_certificate"` to `DocumentType` enum

2. **`src/lib/validations/document.schema.ts`**
   - Added `"fssai_certificate"` to document type validation
   - Already supports PDF files (`application/pdf`)

3. **`src/pages/KYC.tsx`**
   - Added `fssaiCertificate` state
   - Added `fssai_certificate` to `uploadedDocuments` interface
   - Added FSSAI certificate to document loading logic
   - Added FSSAI certificate upload in form submission (new & update)
   - Added UI component for FSSAI certificate upload (accepts PDF or images)
   - Added to admin email notification

### Storage Details
- **Bucket**: `seller_details`
- **Path**: `{seller_id}/fssai_certificate/{timestamp}_{filename}`
- **Database**: `seller_documents` table with `doc_type = 'fssai_certificate'`
- **Signed URL**: Valid for 100 years (same as other documents)

### UI Features
- Accepts PDF or image files (max 10MB)
- Shows file preview for selected file
- Shows "View Uploaded Certificate" link for existing uploads
- Remove button to replace certificate
- Required field (marked with *)

---

## Testing Instructions

### Bundle Stock
1. Check Dashboard - bundles should show correct stock based on product availability
2. Check Inventory - bundles should display even with 0 stock
3. Restock a bundle → verify products inside get restocked proportionally
4. Low stock notifications should work correctly

### FSSAI Certificate
1. Go to KYC page
2. Fill in FSSAI License Number (14 digits)
3. Set FSSAI License Expiry Date
4. Upload FSSAI Certificate (PDF or image)
5. Submit KYC
6. Check Supabase:
   - `seller_documents` table should have `doc_type = 'fssai_certificate'`
   - `storage_path` should contain signed URL
7. Reload KYC page - certificate should display as "View Uploaded Certificate"

---

## Summary
✅ Bundle stock calculation fixed across all components
✅ Bundle restock now actually restocks products
✅ FSSAI certificate upload added to KYC
✅ Database migration for FSSAI certificate storage
✅ Proper validation and file type support (PDF + images)
