# FSSAI Expiry Check - Buyer Portal Implementation Guide

## Overview

This document provides implementation instructions for the buyer portal to check and update FSSAI expiry status when a user views a product detail page.

## Purpose

- Prevent products with expired FSSAI from being sold
- Automatically update product status from 'active' to 'expired' when FSSAI date has passed
- Ensure compliance with food safety regulations
- **Note:** Only products with `status = 'active'` are shown on the buyer portal. The FSSAI check detects expired licenses and updates the status, which automatically hides the product from buyers.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│   Buyer Portal      │     │      Supabase            │
│  Product Detail     │────▶│  check_and_update_       │
│  (Active Products)  │     │  fssai_expiry()          │
└─────────────────────┘     └──────────────────────────┘
        │                              │
        │                              ▼
        │                   ┌──────────────────────────┐
        │                   │ If FSSAI expired:        │
        │                   │ - Updates status to      │
        │                   │   'expired'              │
        │                   │ - Creates notification   │
        │                   │   for seller             │
        │                   │ - Product removed from   │
        │                   │   buyer portal           │
        │                   └──────────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Result Actions:     │
│ - If expired: hide  │
│   product, show     │
│   "unavailable" msg │
│ - Else: allow cart  │
└─────────────────────┘
```

**Important:** The buyer portal only displays products with `status = 'active'`. This check serves as a real-time validation that transitions active products to expired status when their FSSAI has expired, immediately removing them from the buyer portal.

## Implementation Steps

### Step 1: Create Supabase Client Function

```typescript
// src/lib/supabase/fssai-check.ts

import { supabase } from './client';

interface FSSAIExpiryResult {
  success: boolean;
  status_updated?: boolean;
  previous_status?: string;
  new_status?: string;
  current_status?: string;
  has_expired_fssai?: boolean;
  expired_variants?: Array<{
    variant_id: string;
    variant_name: string;
    fssai_number: string;
    fssai_expiry_date: string;
  }>;
  message?: string;
  error?: string;
}

/**
 * Checks and updates FSSAI expiry status for a product listing.
 * Call this function when a user views the product detail page.
 * 
 * @param listingId - The UUID of the product listing
 * @returns Result object with status update information
 */
export async function checkAndUpdateFSSAIExpiry(
  listingId: string
): Promise<FSSAIExpiryResult> {
  try {
    const { data, error } = await supabase.rpc('check_and_update_fssai_expiry', {
      p_listing_id: listingId
    });

    if (error) {
      console.error('FSSAI check error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return data as FSSAIExpiryResult;
  } catch (err) {
    console.error('FSSAI check exception:', err);
    return {
      success: false,
      error: 'Failed to check FSSAI status'
    };
  }
}

/**
 * Read-only version - only checks status without updating.
 * Use this for preview/quick checks.
 */
export async function getFSSAIExpiryStatus(
  listingId: string
): Promise<FSSAIExpiryResult> {
  try {
    const { data, error } = await supabase.rpc('get_fssai_expiry_status', {
      p_listing_id: listingId
    });

    if (error) {
      console.error('FSSAI status error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return data as FSSAIExpiryResult;
  } catch (err) {
    console.error('FSSAI status exception:', err);
    return {
      success: false,
      error: 'Failed to get FSSAI status'
    };
  }
}
```

### Step 2: Update Product Detail Page Component

```tsx
// In your ProductDetail.tsx or ProductPage.tsx

import { useEffect, useState } from 'react';
import { checkAndUpdateFSSAIExpiry } from '@/lib/supabase/fssai-check';

interface ProductDetailProps {
  listingId: string;
}

export function ProductDetail({ listingId }: ProductDetailProps) {
  const [product, setProduct] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [expiredVariants, setExpiredVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      
      // 1. Load product data (only active products are shown)
      const productData = await fetchProduct(listingId);
      
      if (!productData || productData.status !== 'active') {
        // Product not found or not active - redirect or show error
        setLoading(false);
        return;
      }
      
      setProduct(productData);
      
      // 2. Check FSSAI expiry in real-time
      // This updates the status if expired, removing it from active listings
      const fssaiResult = await checkAndUpdateFSSAIExpiry(listingId);
      
      if (fssaiResult.success) {
        // If status was just updated to expired, the product should be hidden
        if (fssaiResult.status_updated && fssaiResult.new_status === 'expired') {
          setIsExpired(true);
          setExpiredVariants(fssaiResult.expired_variants || []);
          // Product will be removed from listings on next page load/refresh
        }
      }
      
      setLoading(false);
    }

    if (listingId) {
      loadProduct();
    }
  }, [listingId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // If product became expired during viewing
  if (isExpired) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Product No Longer Available
          </h2>
          <p className="text-red-700">
            This product's FSSAI license has expired and it has been removed from sale.
            The seller has been notified to update the license information.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return <ProductNotFound />;
  }

  return (
    <div className="product-detail">
      {/* Product content - only shown for active products */}
      <ProductInfo product={product} />
      
      {/* Variant selector */}
      <VariantSelector variants={product.variants} />
      
      {/* Add to Cart - product is active and available */}
      <AddToCartButton productId={listingId} />
    </div>
  );
}
```

### Step 3: Add Product Listing Query Filter

```typescript
// product-listing-service.ts - Ensure only active products are shown

export async function getActiveProducts(filters?: ProductFilters) {
  const query = supabase
    .from('seller_product_listings')
    .select(`
      *,
      listing_variants(*),
      listing_images(*),
      global_products(
        product_name,
        brands(name, logo_url)
      )
    `)
    .eq('status', 'active')  // CRITICAL: Only show active products
    .gt('total_stock_quantity', 0);  // And in stock

  // Apply additional filters (category, price range, etc.)
  if (filters?.category) {
    query.eq('category_id', filters.category);
  }

  const { data, error } = await query;
  
  return { products: data || [], error };
}

export async function getProductDetail(listingId: string) {
  const { data, error } = await supabase
    .from('seller_product_listings')
    .select(`
      *,
      listing_variants(*),
      listing_images(*),
      global_products(
        product_name,
        brands(name, logo_url)
      )
    `)
    .eq('listing_id', listingId)
    .eq('status', 'active')  // Only return if active
    .single();

  return { product: data, error };
}
```

### Step 4: Handle Variant-Level Expiry (Simplified)

### Step 4: Handle Variant-Level Expiry (Simplified)

**Note:** Since products with any expired variant are marked as 'expired' status and hidden from the buyer portal, variant-level checking is primarily informational for edge cases where expiry happens during a user's session.

```tsx
// VariantSelector.tsx - Basic variant selector for active products

interface VariantSelectorProps {
  variants: Variant[];
}

export function VariantSelector({ variants }: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]);

  return (
    <div className="variant-selector">
      {variants.map(variant => (
        <button
          key={variant.variant_id}
          onClick={() => setSelectedVariant(variant)}
          className={`
            variant-option
            ${selectedVariant?.variant_id === variant.variant_id ? 'selected' : ''}
          `}
        >
          <span>{variant.variant_name}</span>
          <span className="text-sm text-gray-600">{variant.size}</span>
        </button>
      ))}
    </div>
  );
}
```

### Step 5: Prevent Cart Addition for Expired Products

```typescript
// cart-service.ts - Server-side validation as safety net

export async function addToCart(
  userId: string,
  listingId: string,
  variantId: string,
  quantity: number
) {
  // CRITICAL: Double-check product is still active
  const { data: product } = await supabase
    .from('seller_product_listings')
    .select('status')
    .eq('listing_id', listingId)
    .single();

  if (!product || product.status !== 'active') {
    throw new Error('Product is no longer available for purchase');
  }

  // Additional validation: check variant FSSAI hasn't expired
  const { data: variant } = await supabase
    .from('listing_variants')
    .select('fssai_expiry_date')
    .eq('variant_id', variantId)
    .single();

  if (variant?.fssai_expiry_date && new Date(variant.fssai_expiry_date) < new Date()) {
    // Trigger FSSAI check to update product status
    await supabase.rpc('check_and_update_fssai_expiry', {
      p_listing_id: listingId
    });
    throw new Error('Product license has expired and cannot be purchased');
  }

  // Proceed with cart addition - product is verified active and valid
  return await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      listing_id: listingId,
      variant_id: variantId,
      quantity
    });
}
```

## Workflow Summary

1. **Product Listing Page:** Query only shows products with `status = 'active'`
2. **Product Detail Page:** 
   - Loads product (must be active)
   - Calls `check_and_update_fssai_expiry()` to validate FSSAI
   - If FSSAI expired: status → 'expired', product hidden from listings
3. **Add to Cart:** Server-side validation ensures product is still active
4. **Background:** Optional cron job runs `check_and_update_all_product_fssai_status()` daily to proactively update expired products

## API Reference

### `check_and_update_fssai_expiry(p_listing_id UUID)`

**Purpose:** Checks FSSAI expiry and updates product status if expired.

**Parameters:**
- `p_listing_id`: The UUID of the product listing

**Returns:** JSONB object with:
- `success`: boolean
- `status_updated`: boolean - true if status was changed
- `previous_status`: string - status before update
- `new_status`: string - new status (if updated)
- `expired_variants`: array of expired variant details
- `message`: string - human-readable message

**Example Response (Status Updated):**
```json
{
  "success": true,
  "status_updated": true,
  "previous_status": "active",
  "new_status": "expired",
  "expired_variants": [
    {
      "variant_id": "uuid-here",
      "variant_name": "500g Pack",
      "fssai_number": "12345678901234",
      "fssai_expiry_date": "2024-12-01"
    }
  ],
  "message": "Product status updated to expired due to FSSAI expiry"
}
```

### `get_fssai_expiry_status(p_listing_id UUID)`

**Purpose:** Read-only check of FSSAI status (doesn't update).

**Parameters:**
- `p_listing_id`: The UUID of the product listing

**Returns:** JSONB object with:
- `success`: boolean
- `current_status`: string
- `has_expired`: boolean
- `has_expiring_soon`: boolean
- `expired_variants`: array
- `expiring_soon_variants`: array (within 30 days)

## Testing Checklist

- [ ] **Product Listing:** Only products with `status = 'active'` appear
- [ ] **FSSAI Check:** Viewing product triggers FSSAI validation
- [ ] **Status Transition:** Product with expired FSSAI changes from 'active' to 'expired'
- [ ] **Product Removal:** Expired product disappears from buyer portal on refresh
- [ ] **Cart Validation:** Cannot add expired product to cart (server-side check)
- [ ] **Seller Notification:** Seller receives notification when product expires
- [ ] **Error Handling:** Graceful handling when product expires during user session
- [ ] **Edge Case:** Product that expires while user is viewing shows appropriate message

## Error Handling

```typescript
try {
  const result = await checkAndUpdateFSSAIExpiry(listingId);
  if (!result.success) {
    console.error('FSSAI check failed:', result.error);
    // Fall back to local check using product data
  }
} catch (err) {
  // Handle network/timeout errors
  console.error('Network error:', err);
  // Show user-friendly message
}
```

## Performance Notes

1. The FSSAI check is performed once when the product page loads
2. Results are cached in component state for the session
3. The function uses Postgres SECURITY DEFINER for consistent permissions
4. Database indexes on `listing_id` and `fssai_expiry_date` improve query performance

## Related Files

- **Seller Portal:**
  - `src/types/inventory.types.ts` - Updated with 'expired' status
  - `src/pages/Inventory.tsx` - Shows expired product count
  - `src/pages/Dashboard.tsx` - Shows expired product stats
  - `src/components/AddProductDialog.tsx` - Shows expired warning

- **Database:**
  - `FSSAI_EXPIRED_STATUS_MIGRATION.sql` - Supabase functions

---

*Last Updated: December 13, 2025*
