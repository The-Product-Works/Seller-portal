# FSSAI Expiry Notification System - Deployment Guide

## ✅ Status: Ready for Deployment

All components have been integrated into the dashboard. Follow these steps to activate the FSSAI notification system.

---

## 📋 Deployment Steps

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → SQL Editor
2. Copy the entire contents of `supabase/migrations/20241208_fssai_expiry_notification_system.sql`
3. Paste into SQL Editor and click **Run**
4. Verify successful execution (should see "Success. No rows returned")

### Step 2: Initial FSSAI Check

After migration completes, run this command to check for existing FSSAI expirations:

```sql
SELECT public.check_all_fssai_expiry();
```

Expected result:
```json
{
  "success": true,
  "kyc_fssai_notifications": 0,
  "product_fssai_notifications": 0,
  "total_notifications": 0,
  "checked_at": "2024-12-08T..."
}
```

### Step 3: Verify Dashboard Integration

1. Refresh your seller dashboard (`npm run dev`)
2. The **FSSAI License Expiry Alerts** card will appear:
   - If no expiring licenses: Green checkmark "All FSSAI licenses are up to date"
   - If licenses expiring: Orange alert with expandable notification list

---

## 🧪 Testing the System

### Create Test Data

Insert test sellers/products with FSSAI dates 30, 15, 7, and 1 days in the future:

```sql
-- Test Seller KYC FSSAI (expires in 7 days)
UPDATE public.sellers
SET 
  fssai_license_number = '12345678901234',
  fssai_license_expiry_date = CURRENT_DATE + INTERVAL '7 days'
WHERE user_id = auth.uid();

-- Test Product Variant FSSAI (expires in 15 days)
UPDATE public.listing_variants
SET 
  fssai_number = '98765432109876',
  fssai_expiry_date = CURRENT_DATE + INTERVAL '15 days'
WHERE variant_id = 'your-variant-id-here';

-- Run check to generate notifications
SELECT public.check_all_fssai_expiry();
```

### Verify Notifications Appear

1. Refresh dashboard
2. Should see FSSAI alert card with priority badges:
   - 🔴 **CRITICAL** (0-7 days)
   - 🟠 **HIGH** (8-15 days)
   - 🟡 **MEDIUM** (16-30 days)

### Test Actions

1. Click "Show X" to expand notifications
2. Test **Acknowledge** button → notification updates
3. Test **Dismiss** button → notification removes
4. Verify real-time updates (notifications auto-refresh)

---

## 🔄 Automated Daily Checks

The system includes functions for daily automated checks. To enable:

### Option A: Manual Trigger (for testing)

Run this daily via cron job or scheduler:

```sql
SELECT public.check_all_fssai_expiry();
```

### Option B: pg_cron Extension (recommended)

If your Supabase project has `pg_cron` enabled:

```sql
-- Schedule daily check at 9:00 AM IST
SELECT cron.schedule(
  'fssai-expiry-daily-check',
  '0 9 * * *',
  $$SELECT public.check_all_fssai_expiry();$$
);
```

---

## 📊 System Features

### Notification Types

1. **Seller KYC FSSAI** - Business-level FSSAI license from sellers table
2. **Product FSSAI** - Per-variant FSSAI from listing_variants table

### Priority Levels

- **30 days**: Medium priority (Yellow badge) - "Plan your renewal"
- **15 days**: High priority (Orange badge) - "Please renew soon"
- **7 days**: Critical priority (Red badge) - "Please renew immediately"
- **0 days**: Critical priority (Red badge) - "Expires TODAY! Renew now"

### Notification Actions

- **Acknowledge**: Mark notification as seen (removes from pending)
- **Dismiss**: Hide notification temporarily
- **Renew**: Mark license as renewed (removes notification)

### Real-Time Updates

- Dashboard subscribes to database changes
- Notifications auto-refresh when new alerts are created
- No page refresh needed

---

## 🗂️ Database Tables

### fssai_expiry_notifications

Stores all FSSAI expiry notifications:

```
id                          UUID
seller_id                   UUID → sellers(id)
notification_type           'seller_kyc_fssai' | 'product_fssai'
kyc_fssai_number           VARCHAR(50)
kyc_fssai_expiry_date      DATE
listing_id                  UUID → global_products
variant_id                  UUID → listing_variants
product_name                VARCHAR(255)
variant_name                VARCHAR(255)
variant_fssai_number        VARCHAR(50)
variant_fssai_expiry_date  DATE
days_until_expiry          INTEGER
notification_status         'pending' | 'acknowledged' | 'renewed' | 'dismissed'
notification_message        TEXT
priority                    'low' | 'medium' | 'high' | 'critical'
created_at                  TIMESTAMPTZ
acknowledged_at             TIMESTAMPTZ
renewed_at                  TIMESTAMPTZ
```

---

## 🔐 Security (RLS Policies)

- Sellers can only view their own notifications
- Sellers can only update their own notifications
- RLS enforced via `seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())`

---

## 📈 Monitoring

### Check Active Notifications

```sql
SELECT 
  notification_type,
  priority,
  COUNT(*) as count
FROM public.fssai_expiry_notifications
WHERE notification_status = 'pending'
GROUP BY notification_type, priority
ORDER BY priority DESC;
```

### View All Notifications for a Seller

```sql
SELECT * FROM public.get_seller_fssai_notifications(
  'seller-id-here',
  'pending'
);
```

---

## 🐛 Troubleshooting

### No Notifications Appearing

1. Check if FSSAI dates are set:
```sql
SELECT fssai_license_number, fssai_license_expiry_date 
FROM sellers 
WHERE user_id = auth.uid();
```

2. Manually trigger check:
```sql
SELECT public.check_all_fssai_expiry();
```

3. Check for errors in browser console (F12)

### RPC Function Not Found

- Run the migration SQL file again
- Verify functions exist: `\df public.check_all_fssai_expiry` in psql

### Notifications Not Real-Time

- Check browser console for subscription errors
- Verify Realtime is enabled in Supabase project settings

---

## ✅ Deployment Checklist

- [ ] Migration SQL executed successfully
- [ ] Initial FSSAI check completed
- [ ] Dashboard displays FSSAI card
- [ ] Test notifications created (7, 15, 30 days)
- [ ] Acknowledge button works
- [ ] Dismiss button works
- [ ] Real-time updates working
- [ ] RLS policies verified (sellers see only their notifications)
- [ ] Daily cron job scheduled (optional)

---

## 🎯 Next Steps

1. **Execute migration** in Supabase SQL Editor
2. **Test with sample data** (7 days expiry)
3. **Verify dashboard display** (refresh page)
4. **Schedule daily checks** (pg_cron or external scheduler)
5. **Monitor notification trends** over next 30 days

---

## 📝 Notes

- TypeScript errors in `FSSAIExpiryNotifications.tsx` are expected until Supabase types are regenerated after migration
- Component uses type casting (`as { data: ...; error: any }`) to suppress errors temporarily
- After migration, run `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts` to update types

---

**System Status**: ✅ **READY FOR DEPLOYMENT**

All code changes integrated. Dashboard will show FSSAI notifications immediately after migration is executed.
