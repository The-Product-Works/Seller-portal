# FSSAI Notification System - Quick Setup Guide

## ✅ What Was Done

### 1. Database Migration Created
**File**: `supabase/migrations/20241208_fssai_expiry_notification_system.sql`

Creates:
- `fssai_expiry_notifications` table
- Functions to check FSSAI expiry (seller KYC + product variants)
- Functions to get and update notifications
- RLS policies for security

### 2. React Component Created
**File**: `src/components/FSSAIExpiryNotifications.tsx`

Features:
- Displays FSSAI expiry alerts with priority badges
- Real-time subscription for instant updates
- Acknowledge/Dismiss buttons
- Expandable card UI

### 3. Dashboard Integration
**File**: `src/pages/Dashboard.tsx`

Changes:
- Line 15: Added import `import { FSSAIExpiryNotifications } from "@/components/FSSAIExpiryNotifications";`
- Line 819: Added component `<FSSAIExpiryNotifications />`

---

## 🚀 Setup Instructions (Step by Step)

### Step 1: Run the Updated Function in Supabase

Open **Supabase Dashboard** → SQL Editor and run this:

```sql
-- Fix the update function (corrected auth check)
CREATE OR REPLACE FUNCTION public.update_fssai_notification_status(
    p_notification_id UUID,
    p_new_status VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.fssai_expiry_notifications
    SET 
        notification_status = p_new_status,
        acknowledged_at = CASE WHEN p_new_status = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
        renewed_at = CASE WHEN p_new_status = 'renewed' THEN NOW() ELSE renewed_at END
    WHERE id = p_notification_id
      AND seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid());

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$;
```

### Step 2: Create Test Notification

Run this in Supabase SQL Editor to create a test notification:

```sql
-- Create test FSSAI notification
DO $$
DECLARE
    v_seller_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    RAISE NOTICE 'Current auth user ID: %', v_user_id;
    
    -- Get your seller ID
    SELECT id INTO v_seller_id FROM sellers WHERE user_id = v_user_id;
    RAISE NOTICE 'Found seller ID: %', v_seller_id;
    
    -- If no seller found, show error
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'No seller found for user %. Please check sellers table.', v_user_id;
    END IF;
    
    -- Delete old test notifications
    DELETE FROM fssai_expiry_notifications WHERE seller_id = v_seller_id;
    
    -- Insert critical test notification (expires in 7 days)
    INSERT INTO fssai_expiry_notifications (
        seller_id,
        notification_type,
        kyc_fssai_number,
        kyc_fssai_expiry_date,
        days_until_expiry,
        notification_message,
        priority,
        notification_status
    ) VALUES (
        v_seller_id,
        'seller_kyc_fssai',
        '12345678901234',
        CURRENT_DATE + 7,
        7,
        '⚠️ URGENT: Your FSSAI license (12345678901234) expires in 7 days. Please renew immediately.',
        'critical',
        'pending'
    );
    
    -- Insert high priority notification (expires in 15 days)
    INSERT INTO fssai_expiry_notifications (
        seller_id,
        notification_type,
        kyc_fssai_number,
        kyc_fssai_expiry_date,
        days_until_expiry,
        notification_message,
        priority,
        notification_status
    ) VALUES (
        v_seller_id,
        'seller_kyc_fssai',
        '98765432109876',
        CURRENT_DATE + 15,
        15,
        '⚠️ Your FSSAI license (98765432109876) expires in 15 days. Please renew soon.',
        'high',
        'pending'
    );
    
    RAISE NOTICE 'Created 2 test notifications for seller %', v_seller_id;
END $$;
```

**Alternative: If you get "No seller found" error, use this instead:**

```sql
-- Find your seller ID first
SELECT id, user_id, business_name, email FROM sellers WHERE user_id = auth.uid();

-- If the above returns nothing, check all sellers
SELECT id, user_id, business_name, email FROM sellers LIMIT 5;

-- Once you have your seller_id, insert directly:
INSERT INTO fssai_expiry_notifications (
    seller_id,
    notification_type,
    kyc_fssai_number,
    kyc_fssai_expiry_date,
    days_until_expiry,
    notification_message,
    priority,
    notification_status
) VALUES (
    'YOUR-SELLER-ID-HERE',  -- Replace with actual seller ID from query above
    'seller_kyc_fssai',
    '12345678901234',
    CURRENT_DATE + 7,
    7,
    '⚠️ URGENT: Your FSSAI license (12345678901234) expires in 7 days. Please renew immediately.',
    'critical',
    'pending'
);
```

### Step 3: Verify in Dashboard

1. Refresh your dashboard page
2. You should see an **orange FSSAI License Expiry Alerts card** 
3. It will show: "2 critical alert • 1 high priority alert" (or similar)
4. Click **"Show 2"** to expand and see details
5. Test the **Acknowledge** and **Dismiss** buttons

---

## 📊 What You'll See

### With No Notifications
```
┌─────────────────────────────────┐
│ ✓ FSSAI Expiry Alerts          │
│ All FSSAI licenses are up to   │
│ date                           │
└─────────────────────────────────┘
```

### With Notifications (Collapsed)
```
┌─────────────────────────────────────────┐
│ 🔔 FSSAI License Expiry Alerts  [Show 2]│
│ 2 critical alerts • 1 high priority     │
└─────────────────────────────────────────┘
```

### With Notifications (Expanded)
```
┌─────────────────────────────────────────┐
│ 🔔 FSSAI License Expiry Alerts  [Hide]  │
│ 2 critical alerts • 1 high priority     │
├─────────────────────────────────────────┤
│ ⚠️ Business FSSAI License  [CRITICAL]   │
│ ⚠️ URGENT: Your FSSAI license          │
│ (12345678901234) expires in 7 days.    │
│ 🕒 7 days remaining                     │
│ [Acknowledge] [Dismiss]                 │
├─────────────────────────────────────────┤
│ ⚠️ Business FSSAI License  [HIGH]       │
│ ⚠️ Your FSSAI license (98765432109876) │
│ expires in 15 days.                    │
│ 🕒 15 days remaining                    │
│ [Acknowledge] [Dismiss]                 │
└─────────────────────────────────────────┘
```

---

## 🎨 Priority Levels & Colors

| Priority | Days Until Expiry | Badge Color | Icon |
|----------|------------------|-------------|------|
| 🔴 **CRITICAL** | 0-7 days | Red | ⚠️ |
| 🟠 **HIGH** | 8-15 days | Red | ⚠️ |
| 🟡 **MEDIUM** | 16-30 days | Default | 🕒 |
| 🔵 **LOW** | 30+ days | Secondary | 🔔 |

---

## 🔍 Troubleshooting

### Issue: Card not showing at all
**Solution**: 
```sql
-- Check if table exists
SELECT * FROM fssai_expiry_notifications LIMIT 1;
```

### Issue: "function does not exist" error
**Solution**: Run the complete migration file again:
```bash
# Open supabase/migrations/20241208_fssai_expiry_notification_system.sql
# Copy all content and run in Supabase SQL Editor
```

### Issue: No notifications showing even after insert
**Solution**: Check browser console (F12) for errors
```javascript
// Should see in console:
"Error fetching FSSAI notifications: ..."
```

### Issue: Can't acknowledge notifications
**Solution**: Run Step 1 again (the fixed update function)

---

## 🔄 Automated Daily Checks

To automatically check for expiring FSSAI licenses every day:

```sql
-- Option 1: Manual cron (run this daily)
SELECT public.check_all_fssai_expiry();

-- Option 2: pg_cron (if enabled on your Supabase project)
SELECT cron.schedule(
  'fssai-expiry-daily-check',
  '0 9 * * *',  -- Every day at 9 AM
  $$SELECT public.check_all_fssai_expiry();$$
);
```

---

## 📝 Database Schema

### Table: fssai_expiry_notifications
```sql
CREATE TABLE fssai_expiry_notifications (
    id UUID PRIMARY KEY,
    seller_id UUID REFERENCES sellers(id),
    notification_type VARCHAR(50),  -- 'seller_kyc_fssai' | 'product_fssai'
    
    -- For seller KYC notifications
    kyc_fssai_number VARCHAR(50),
    kyc_fssai_expiry_date DATE,
    
    -- For product variant notifications
    listing_id UUID,
    variant_id UUID,
    product_name VARCHAR(255),
    variant_name VARCHAR(255),
    variant_fssai_number VARCHAR(50),
    variant_fssai_expiry_date DATE,
    
    -- Notification metadata
    days_until_expiry INTEGER,
    notification_status VARCHAR(20),  -- 'pending' | 'acknowledged' | 'dismissed' | 'renewed'
    notification_message TEXT,
    priority VARCHAR(20),  -- 'low' | 'medium' | 'high' | 'critical'
    
    created_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    renewed_at TIMESTAMPTZ
);
```

### Functions Available
1. `check_seller_kyc_fssai_expiry()` - Check seller business FSSAI licenses
2. `check_product_fssai_expiry()` - Check product variant FSSAI licenses
3. `check_all_fssai_expiry()` - Run both checks
4. `get_seller_fssai_notifications(seller_id, status)` - Get notifications for seller
5. `update_fssai_notification_status(notification_id, status)` - Acknowledge/dismiss

---

## ✅ Quick Verification Checklist

- [ ] Migration file exists: `supabase/migrations/20241208_fssai_expiry_notification_system.sql`
- [ ] Component file exists: `src/components/FSSAIExpiryNotifications.tsx`
- [ ] Dashboard imports component (line 15)
- [ ] Dashboard renders component (line 819)
- [ ] Ran Step 1 SQL (fixed update function)
- [ ] Ran Step 2 SQL (test notifications)
- [ ] Refreshed dashboard
- [ ] See orange FSSAI card
- [ ] Can expand/collapse card
- [ ] Can acknowledge notifications
- [ ] Can dismiss notifications

---

## 🎯 Next Steps

1. **Run Step 1 & 2** from this guide
2. **Refresh dashboard** - see the notifications
3. **Test actions** - acknowledge and dismiss
4. **Add real FSSAI data** to your products/seller
5. **Schedule daily checks** for production

---

**Location in Dashboard**: Between "Health Score" card and "Tabs" section

**Files Changed**:
- ✅ `supabase/migrations/20241208_fssai_expiry_notification_system.sql` (created)
- ✅ `src/components/FSSAIExpiryNotifications.tsx` (created)
- ✅ `src/pages/Dashboard.tsx` (2 lines added)

**Current Status**: ⚠️ **READY - Need to run SQL setup (Step 1 & 2)**
