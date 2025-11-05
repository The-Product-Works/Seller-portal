# Comprehensive Inventory Management System

## Overview
This is a complete multi-vendor inventory management system with global product catalog, seller-specific listings, variants, allergen management, transparency data, and advanced filtering.

## Features Implemented

### ✅ Product Management
- **Global Product Search**: Search existing products or create new ones
- **Brand Management**: Search brands or create new brands with validation
- **Category Selection**: Assign products to categories
- **Seller Customization**: Customize product titles and descriptions
- **Health Score Calculation**: Automatic scoring based on certificates, allergens, nutrition info

### ✅ Variant Management
- Add multiple variants per product (size, flavor, etc.)
- Individual pricing and stock for each variant
- Discount calculation (original price vs selling price)
- Batch numbers, manufacture dates, expiry dates
- Nutritional information per variant

### ✅ Allergen Management
- Select from existing allergens
- Create new allergens on the fly
- Visual tag-based selection

### ✅ Media Management
- Product images upload (organized by seller ID)
- Certificates upload
- Trust certificates upload
- Storage organized in folders: `{sellerId}/product-images/`, `{sellerId}/certificates/`, `{sellerId}/trust-certificates/`

### ✅ Transparency & Trust
- Clinical data
- Ingredient sourcing information
- Manufacturing details
- Testing information
- Third-party testing details
- Quality assurance
- Certifications summary
- Sustainability info
- Ethical sourcing

### ✅ Draft & Publish
- Save products as drafts
- Publish products when ready
- Edit draft products before publishing

### ✅ Advanced Filtering
- **Search by**: Product name, Brand name, or Variant name
- **Filter by**: 
  - Price range (slider)
  - Discount percentage (slider)
  - Stock quantity (slider)
  - Status (active/draft/inactive)
- **Visual filter count badge**
- **Clear all filters** button

### ✅ Inventory Display
- Card-based grid layout
- Product images
- Brand name
- Product name
- Price with discount display
- Stock quantity
- Variant count
- Health score badge
- Status badge
- Discount percentage badge

### ✅ Edit & Delete
- Edit entire product listing
- Delete product with confirmation dialog
- Delete individual variants with confirmation
- Cascade deletes (removing product removes all variants)

## Database Schema

### Tables Used
- `brands` - Brand master catalog
- `global_products` - Canonical product catalog
- `seller_product_listings` - Seller-specific product listings
- `listing_variants` - Product variants (size, flavor, etc.)
- `listing_images` - Product images
- `listing_allergens` - Junction table for allergens
- `allergens` - Master allergen list
- `product_transparency` - Transparency and quality data
- `categories` - Product categories

## Setup Instructions

### 1. Run Database Migrations

```bash
# Apply the migration to create listing_allergens table
supabase db push
```

Or manually run the migration file:
```sql
-- Run: supabase/migrations/20251105000000_add_listing_allergens_and_helpers.sql
```

### 2. Create Storage Bucket

In Supabase Dashboard:
1. Go to **Storage** → Create bucket named `product`
2. Make it **public** (for product images)

### 3. Add Storage Policies

In Supabase Dashboard → Storage → product bucket → Policies:

```sql
-- Policy: Restrict uploads to valid subfolders
CREATE POLICY "Restrict uploads to valid subfolders"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product'
  AND (
    name LIKE auth.uid()::text || '/product-images/%'
    OR name LIKE auth.uid()::text || '/certificates/%'
    OR name LIKE auth.uid()::text || '/trust-certificates/%'
  )
);

-- Policy: Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'product'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 4. Update Routes

Add the new inventory page to your router:

```tsx
// In your router file (e.g., App.tsx or routes)
import NewInventory from "@/pages/NewInventory";

// Add route
<Route path="/inventory" element={<NewInventory />} />
```

### 5. Update Navigation

Update your Navbar to link to the new inventory:

```tsx
<Link to="/inventory">Inventory</Link>
```

## File Structure

```
src/
├── components/
│   └── AddProductDialog.tsx          # Comprehensive product add/edit dialog
├── lib/
│   └── inventory-helpers.ts          # Helper functions for inventory
├── types/
│   └── inventory.types.ts            # TypeScript types
└── pages/
    └── NewInventory.tsx              # Main inventory page

supabase/
└── migrations/
    └── 20251105000000_add_listing_allergens_and_helpers.sql
```

## Usage Guide

### Adding a New Product

1. Click "Add Product" button
2. **Basic Info Tab**:
   - Search and select a brand (or create new)
   - Search and select global product (or create new)
   - Select category
   - Add custom title (optional)
   - Write description
   - List ingredients
   - Set return policy
   - Set shipping info
   - Set shelf life

3. **Variants Tab**:
   - Click "Add Variant"
   - Fill in SKU, name, size, flavor
   - Set original price and selling price (discount calculated automatically)
   - Set stock quantity
   - Add manufacture/expiry dates
   - Toggle availability

4. **Allergens Tab**:
   - Click allergen tags to select/deselect
   - Create new allergen if needed

5. **Media Tab**:
   - Upload product images
   - Upload certificates
   - Upload trust certificates

6. **Transparency Tab**:
   - Add manufacturing info
   - Add testing information
   - Add quality assurance details
   - Check "Third Party Tested" if applicable

7. Click **"Save as Draft"** or **"Publish Now"**

### Filtering Products

1. Click the "Filters" button
2. Adjust sliders for:
   - Price range
   - Discount percentage
   - Stock quantity
3. Select status filter
4. Click "Apply Filters"

### Searching Products

1. Select search type (Product Name / Brand Name / Variant)
2. Type in the search box
3. Results filter automatically

### Editing Products

1. Click "Edit" button on any product card
2. Modify details in the dialog
3. Save changes

### Deleting Products

1. Click trash icon on product card (deletes entire listing)
2. Or click trash icon on individual variant (deletes only that variant)
3. Confirm deletion in the alert dialog

## Health Score Calculation

The health score (0-100) is calculated based on:
- **Base score**: 50 points
- **Certificates**: +5 points each (max +20)
- **Fewer allergens**: +15 points max (decreases by 2 per allergen)
- **Nutrition info**: +10 points
- **Transparency data**: +10 points
- **Ingredient count**: +5 points max

## Important Notes

1. **Products Table Not Used**: The old `products` table is completely bypassed. All new products use the `seller_product_listings` table.

2. **Global Products**: Products are created once in `global_products` and can be sold by multiple sellers with their own customizations.

3. **Cascading Deletes**: Deleting a listing automatically deletes all variants, images, and related data.

4. **Storage Organization**: Files are automatically organized by seller ID to prevent conflicts.

5. **Status Management**:
   - **Draft**: Saved but not visible to buyers
   - **Active**: Published and visible
   - **Inactive**: Temporarily hidden

## Troubleshooting

### Images not uploading
- Check storage bucket exists and is named `product`
- Verify storage policies are created
- Check file size limits

### Search not working
- Ensure indexes are created on `brands`, `global_products`, `seller_product_listings`
- Check RLS policies allow reading

### Health score not calculating
- Verify the `calculateHealthScore` function is imported correctly
- Check that certificates and allergens are being counted

## Future Enhancements

- [ ] Bulk product import (CSV)
- [ ] Image management (reorder, set primary)
- [ ] Variant-specific images
- [ ] Clone product functionality
- [ ] Export inventory to Excel
- [ ] Low stock alerts
- [ ] Price history tracking
- [ ] Competitor price comparison

## Support

For issues or questions, refer to the schema documentation:
- `MULTI_VENDOR_SCHEMA_REVIEW.md`
- `PRODUCT_TABLES_MIGRATION.sql`
