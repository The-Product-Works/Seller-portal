# Stock Notifications & Product Details - Bug Fix Summary

## Issues Identified & Fixed

### Root Cause
The notifications feature was failing because of a **critical mismatch between how the database was designed and how the code was implemented**:

1. **Original Design** (Migration 20251029000001):
   - `seller_id UUID REFERENCES auth.users(id)` - meant to store `auth.users.id`
   - RLS policies check `auth.uid() = seller_id`

2. **Code Implementation** (RestockDialog, BundleRestockDialog):
   - Was using `getAuthenticatedSellerId()` which returns `sellers.id` (NOT `auth.users.id`)
   - Storing the wrong ID in notifications table

3. **Result**:
   - Notifications inserts would contain `sellers.id` but RLS expects `auth.users.id`
   - Queries would return 0 rows because RLS silently filters based on wrong column value
   - Users would never see notifications, only "All Stock Levels Good" message

## Changes Made

### 1. **src/lib/seller-helpers.ts** - Added new function
```typescript
export async function getAuthenticatedUserId(): Promise<string | null>
```
- Returns `auth.users.id` (for RLS policies and auth-related operations)
- Separate from `getAuthenticatedSellerId()` which returns `sellers.id` (for seller operations)

### 2. **src/components/RestockDialog.tsx** - Updated notification creation
- Changed from: `const sellerId = await getAuthenticatedSellerId();`
- Changed to: `const authUserId = await getAuthenticatedUserId();`
- Now correctly stores `auth.users.id` in notifications table

### 3. **src/components/BundleRestockDialog.tsx** - Updated notification creation  
- Same change as RestockDialog
- Ensures bundle stock alerts work correctly

### 4. **src/components/LowStockNotifications.tsx** - Updated notification querying
- Changed from: `const sellerId = await getAuthenticatedSellerId();`
- Changed to: `const authUserId = await getAuthenticatedUserId();`
- Now correctly queries notifications using `auth.users.id`
- Updated both `loadNotifications()` and `handleDismissAll()` functions

### 5. **supabase/migrations/20251107000002_fix_notifications_rls_policies.sql** - Created migration
- Fixes RLS policies to use `related_seller_id` instead of non-existent `seller_id`
- Updates SELECT, UPDATE, and INSERT policies
- **MUST be applied** to the Supabase project for everything to work

## How It Works Now

### Stock Alert Creation Flow:
1. User adjusts product/bundle stock to ≤10
2. RestockDialog/BundleRestockDialog gets `auth.users.id` via `getAuthenticatedUserId()`
3. Creates notification with `related_seller_id = auth.users.id`
4. RLS policy allows INSERT (checks `auth.uid() = related_seller_id`)
5. Notification appears in database

### Stock Alert Display Flow:
1. LowStockNotifications component loads
2. Gets `auth.users.id` via `getAuthenticatedUserId()`
3. Queries: `SELECT * FROM notifications WHERE related_seller_id = auth.users.id AND type = 'low_stock'`
4. RLS policy allows SELECT (checks `auth.uid() = related_seller_id` ✓)
5. Notifications display to user

## Required Actions

### ⚠️ **CRITICAL: Apply Migration to Supabase**
The following migration MUST be applied to your Supabase project:
- File: `supabase/migrations/20251107000002_fix_notifications_rls_policies.sql`

Run via Supabase CLI:
```bash
npx supabase push
```

Or manually in Supabase SQL Editor:
```sql
-- Drop old policies that reference seller_id (non-existent column)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Create new policies that use related_seller_id
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = related_seller_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = related_seller_id);

CREATE POLICY "Users can create own notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = related_seller_id);
```

## Testing the Fix

After applying the migration:

1. **Test Stock Alert Creation**:
   - Navigate to Inventory page
   - Open Restock dialog
   - Set stock to 8 units or less
   - Check if notification appears in LowStockNotifications component
   - Expected: See the new low stock alert

2. **Test Stock Alert Display**:
   - After creating alerts, refresh the page
   - LowStockNotifications should still show the alerts
   - Expected: Alerts persist (not just "All Stock Levels Good")

3. **Test Bundle Alerts**:
   - Same as above but for bundles
   - Open bundle editor, adjust stock, save
   - Expected: Bundle alert appears if ≤10

4. **Debug Console Logs**:
   - Open browser DevTools (F12)
   - Console should show:
     ```
     === LowStockNotifications DEBUG ===
     loadNotifications called with authUserId: [UUID]
     Querying notifications table with authUserId: [UUID]
     Query response - Data: [array of notifications]
     Query response - Error: null
     === END DEBUG ===
     ```

## Important Notes

### Why Two Different IDs?
- `auth.users.id` - The user's authentication ID (from Supabase Auth)
- `sellers.id` - The seller's business profile ID (from sellers table)
- These are DIFFERENT but linked via `sellers.user_id = auth.users.id`
- RLS policies MUST use `auth.uid()` which returns `auth.users.id`
- The notifications table was designed to store `auth.users.id` for RLS to work

### What Happens to `related_seller_id` Field?
- Stores `auth.users.id` (the authenticated user's UUID)
- Used in RLS policies: `USING (auth.uid() = related_seller_id)`
- This is the design pattern for Supabase RLS policies
- NOT to be confused with the seller profile ID (`sellers.id`)

## Verification Checklist

- [x] Added `getAuthenticatedUserId()` function to seller-helpers.ts
- [x] Updated RestockDialog to use `getAuthenticatedUserId()`
- [x] Updated BundleRestockDialog to use `getAuthenticatedUserId()`
- [x] Updated LowStockNotifications to use `getAuthenticatedUserId()`
- [x] Created migration to fix RLS policies
- [ ] **TODO: Apply migration 20251107000002 to Supabase project**
- [ ] **TODO: Test notifications after migration applied**
