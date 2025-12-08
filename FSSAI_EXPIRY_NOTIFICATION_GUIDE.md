# FSSAI Expiry Notification System - Complete Guide

## 🎯 Overview

This system automatically monitors FSSAI license expiry dates for both **seller KYC** and **product variants**, notifying sellers 30 days before expiration with escalating urgency.

## 📊 System Architecture

### Database Components

#### 1. **Notifications Table**
```sql
public.fssai_expiry_notifications
```
Stores all FSSAI expiry notifications with the following key fields:
- **Seller KYC FSSAI**: Business-level FSSAI license tracking
- **Product FSSAI**: Product variant-level FSSAI tracking
- **Priority Levels**: low, medium, high, critical
- **Status**: pending, acknowledged, renewed, dismissed

#### 2. **Core Functions**

| Function | Purpose | Returns |
|----------|---------|---------|
| `check_seller_kyc_fssai_expiry()` | Scans all sellers for expiring KYC FSSAI | Count of notifications |
| `check_product_fssai_expiry()` | Scans all variants for expiring FSSAI | Count of notifications |
| `check_all_fssai_expiry()` | Runs both checks together | JSON summary |
| `get_seller_fssai_notifications()` | Retrieves seller's notifications | Table of notifications |
| `update_fssai_notification_status()` | Updates notification status | Boolean success |

## 🚀 Implementation Steps

### Step 1: Run Database Migration

```bash
# Execute in Supabase SQL Editor
psql -f supabase/migrations/20241208_fssai_expiry_notification_system.sql
```

Or copy-paste the migration file contents into Supabase Dashboard → SQL Editor → Run.

### Step 2: Add Component to Dashboard

Import and add the notification component to your seller dashboard:

```tsx
// In your Dashboard.tsx or similar
import { FSSAIExpiryNotifications } from '@/components/FSSAIExpiryNotifications';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Add at the top for high visibility */}
      <FSSAIExpiryNotifications />
      
      {/* Rest of dashboard content */}
    </div>
  );
}
```

### Step 3: Set Up Automated Checking

#### Option A: Using Supabase Edge Functions (Recommended)

Create a scheduled edge function:

```typescript
// supabase/functions/check-fssai-expiry/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('check_all_fssai_expiry');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Schedule in Supabase Dashboard → Edge Functions → Cron:
```
0 9 * * * # Run daily at 9:00 AM
```

#### Option B: Using pg_cron (If Available)

If your Supabase project has `pg_cron` enabled:

```sql
SELECT cron.schedule(
    'check-fssai-expiry-daily',
    '0 9 * * *', -- Run at 9:00 AM daily
    $$SELECT public.check_all_fssai_expiry()$$
);
```

#### Option C: Manual Trigger from Frontend

Add a manual check button for admins:

```tsx
const handleManualCheck = async () => {
  const { data, error } = await supabase.rpc('check_all_fssai_expiry');
  
  if (!error) {
    toast.success(`Created ${data.total_notifications} notifications`);
  }
};
```

## 📋 Priority Escalation System

The system automatically escalates priority based on days until expiry:

| Days Remaining | Priority | Notification Style |
|----------------|----------|-------------------|
| 0 (Today) | **CRITICAL** | 🚨 Red alert, urgent action |
| 1 (Tomorrow) | **CRITICAL** | ⚠️ Red alert, immediate action |
| 2-7 days | **HIGH** | ⚠️ Orange alert, urgent |
| 8-15 days | **MEDIUM** | ⚠️ Yellow alert, important |
| 16-30 days | **LOW** | ℹ️ Blue info, plan ahead |

## 💡 Usage Examples

### 1. Get Current User's Pending Notifications

```typescript
const { data, error } = await supabase.rpc('get_seller_fssai_notifications', {
  p_seller_id: userId,
  p_status: 'pending'
});
```

### 2. Get All Notifications (Admin)

```typescript
const { data, error } = await supabase.rpc('get_seller_fssai_notifications', {
  p_seller_id: null,
  p_status: null
});
```

### 3. Acknowledge Notification

```typescript
const { data, error } = await supabase.rpc('update_fssai_notification_status', {
  p_notification_id: notificationId,
  p_new_status: 'acknowledged'
});
```

### 4. Mark as Renewed (After Seller Updates FSSAI)

```typescript
const { data, error } = await supabase.rpc('update_fssai_notification_status', {
  p_notification_id: notificationId,
  p_new_status: 'renewed'
});
```

### 5. Manual Check Trigger

```typescript
const { data, error } = await supabase.rpc('check_all_fssai_expiry');

console.log(data);
// {
//   "success": true,
//   "kyc_fssai_notifications": 5,
//   "product_fssai_notifications": 12,
//   "total_notifications": 17,
//   "checked_at": "2024-12-08T10:30:00Z"
// }
```

## 🔔 Real-Time Updates

The FSSAIExpiryNotifications component subscribes to real-time changes:

```typescript
const subscription = supabase
  .channel('fssai_notifications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'fssai_expiry_notifications',
    },
    () => {
      fetchNotifications(); // Auto-refresh on any change
    }
  )
  .subscribe();
```

## 🎨 UI Features

### Visual Indicators
- **Animated Bell Icon**: Pulses when notifications present
- **Color-Coded Alerts**: Red (critical), Orange (high), Yellow (medium), Blue (low)
- **Priority Badges**: Clear visual priority indication
- **Countdown Display**: Shows exact days/hours remaining

### User Actions
- **Acknowledge**: Mark notification as seen/read
- **Dismiss**: Remove notification from view
- **Renew**: Mark as renewed after updating FSSAI

### Notification Details
- **Seller KYC FSSAI**: Shows business-level license info
- **Product FSSAI**: Shows product name, variant name, and license number
- **Expiry Date**: Clear countdown to expiration
- **Created Date**: When notification was generated

## 🔒 Security

### Row Level Security (RLS)

```sql
-- Sellers can only view their own notifications
CREATE POLICY "Sellers can view own FSSAI notifications"
ON public.fssai_expiry_notifications
FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can only update their own notifications
CREATE POLICY "Sellers can update own FSSAI notifications"
ON public.fssai_expiry_notifications
FOR UPDATE
USING (auth.uid() = seller_id);
```

### Function Security

All functions use `SECURITY DEFINER` to ensure proper access control while allowing necessary operations.

## 📊 Data Flow

```
┌─────────────────┐
│  Scheduled Job  │ (Daily at 9 AM)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ check_all_fssai_expiry()    │
└────────┬───────────┬────────┘
         │           │
         ▼           ▼
┌────────────────┐  ┌────────────────┐
│ Check Seller   │  │ Check Product  │
│ KYC FSSAI      │  │ Variant FSSAI  │
└────────┬───────┘  └────────┬───────┘
         │                   │
         └─────────┬─────────┘
                   ▼
         ┌──────────────────┐
         │  Insert/Update   │
         │  Notifications   │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Real-time Push  │
         │  to Frontend     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Seller Dashboard │
         │  Shows Alerts    │
         └──────────────────┘
```

## 🧪 Testing

### Test Scenario 1: Create Test Expiry

```sql
-- Add test FSSAI with expiry in 5 days
UPDATE public.sellers
SET 
  fssai_number = '12345678901234',
  fssai_expiry_date = CURRENT_DATE + INTERVAL '5 days'
WHERE id = 'your-seller-id';

-- Run check
SELECT public.check_all_fssai_expiry();

-- Verify notification created
SELECT * FROM public.fssai_expiry_notifications 
WHERE seller_id = 'your-seller-id';
```

### Test Scenario 2: Product FSSAI Expiry

```sql
-- Add test product FSSAI expiring tomorrow
UPDATE public.listing_variants
SET 
  fssai_number = '98765432109876',
  fssai_expiry_date = CURRENT_DATE + INTERVAL '1 day'
WHERE id = 'your-variant-id';

-- Run check
SELECT public.check_product_fssai_expiry();

-- Should create CRITICAL priority notification
```

### Test Scenario 3: Acknowledge and Dismiss

```typescript
// In your React component
const testNotificationActions = async () => {
  // Acknowledge
  await supabase.rpc('update_fssai_notification_status', {
    p_notification_id: notificationId,
    p_new_status: 'acknowledged'
  });

  // Dismiss
  await supabase.rpc('update_fssai_notification_status', {
    p_notification_id: notificationId,
    p_new_status: 'dismissed'
  });
};
```

## 🔧 Maintenance

### View All Notifications (Admin Query)

```sql
SELECT 
  n.*,
  s.business_name,
  s.email
FROM public.fssai_expiry_notifications n
JOIN public.sellers s ON n.seller_id = s.id
ORDER BY 
  CASE n.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  n.days_until_expiry ASC;
```

### Clean Up Old Notifications

```sql
-- Delete dismissed notifications older than 30 days
DELETE FROM public.fssai_expiry_notifications
WHERE notification_status = 'dismissed'
  AND created_at < NOW() - INTERVAL '30 days';

-- Delete renewed notifications (FSSAI was updated)
DELETE FROM public.fssai_expiry_notifications
WHERE notification_status = 'renewed';
```

### Check System Health

```sql
-- Count notifications by priority
SELECT 
  priority,
  notification_type,
  COUNT(*) as count
FROM public.fssai_expiry_notifications
WHERE notification_status = 'pending'
GROUP BY priority, notification_type
ORDER BY 
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;
```

## 🚨 Troubleshooting

### Notifications Not Appearing

1. **Check if migration ran successfully**:
```sql
SELECT * FROM public.fssai_expiry_notifications LIMIT 1;
```

2. **Verify RLS policies**:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'fssai_expiry_notifications';
```

3. **Test function manually**:
```sql
SELECT public.check_all_fssai_expiry();
```

### Real-Time Updates Not Working

1. **Check subscription status** in browser console
2. **Verify Supabase Realtime is enabled** for the table
3. **Check network tab** for WebSocket connection

### No Notifications for Expiring FSSAI

1. **Verify FSSAI data exists**:
```sql
SELECT id, fssai_number, fssai_expiry_date 
FROM public.sellers 
WHERE fssai_expiry_date IS NOT NULL;

SELECT id, fssai_number, fssai_expiry_date 
FROM public.listing_variants 
WHERE fssai_expiry_date IS NOT NULL;
```

2. **Check expiry window** (must be within 30 days):
```sql
SELECT 
  id,
  fssai_number,
  fssai_expiry_date,
  (fssai_expiry_date - CURRENT_DATE) as days_until_expiry
FROM public.sellers
WHERE fssai_expiry_date >= CURRENT_DATE
  AND (fssai_expiry_date - CURRENT_DATE) <= 30;
```

## 📈 Future Enhancements

1. **Email Notifications**: Send automatic emails for critical expiries
2. **SMS Alerts**: Critical notifications via SMS
3. **WhatsApp Integration**: Notifications via WhatsApp Business API
4. **Dashboard Widget**: Mini widget showing expiry count
5. **Expiry Calendar**: Visual calendar of upcoming expiries
6. **Bulk Renewal**: Allow batch renewal of multiple products
7. **Auto-Archive**: Automatically archive old notifications
8. **Analytics**: Track renewal patterns and compliance rates

## ✅ Success Criteria

- [x] Notifications created 30 days before expiry
- [x] Priority escalation based on urgency
- [x] Real-time updates in dashboard
- [x] Seller can acknowledge/dismiss notifications
- [x] Separate tracking for KYC and product FSSAI
- [x] Visual indicators (colors, icons, badges)
- [x] RLS security implemented
- [x] Manual trigger available
- [x] Comprehensive documentation

## 🎉 System Complete!

The FSSAI Expiry Notification System is now fully operational and ready to keep sellers compliant with food safety regulations.
