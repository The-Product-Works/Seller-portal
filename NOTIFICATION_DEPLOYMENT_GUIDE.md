# Email Notification System - Deployment Guide

## ✅ What's Been Done

1. **Database Migration**: Created `email_notifications` table to track all sent emails
2. **Email Templates**: 5 HTML templates for seller notifications (low stock, out of stock, payout, new order, return request)
3. **Supabase Edge Function**: Created `send-email` function to bypass CORS restrictions
4. **Client Service**: Updated to call Edge Function instead of Resend API directly
5. **Test Page**: Available at `/test-notifications` route

## 🚀 Deployment Steps

### Step 1: Deploy Edge Function to Supabase

You need to deploy the Edge Function to your Supabase project. There are two ways:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
```powershell
npm install -g supabase
```

2. Login to Supabase:
```powershell
supabase login
```

3. Link your project:
```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

4. Deploy the function:
```powershell
supabase functions deploy send-email
```

5. Set environment secrets:
```powershell
supabase secrets set RESEND_API_KEY=re_W4Aw8xPL_5mPNPS2CQPMPWktcvprLbDwh
supabase secrets set RESEND_FROM_EMAIL=onboarding@resend.dev
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions** in the sidebar
4. Click **Create Function** → **Deploy from repository**
5. Upload the `supabase/functions/send-email/index.ts` file
6. Go to **Edge Functions → Settings → Secrets**
7. Add these secrets:
   - `RESEND_API_KEY` = `re_W4Aw8xPL_5mPNPS2CQPMPWktcvprLbDwh`
   - `RESEND_FROM_EMAIL` = `onboarding@resend.dev`

### Step 2: Apply Database Migration

If you haven't already run the migration:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/20251120000001_create_email_notifications.sql
```

Or using CLI:
```powershell
supabase db push
```

### Step 3: Test the System

1. Start your dev server (if not running):
```powershell
npm run dev
```

2. Navigate to: http://localhost:8080/test-notifications

3. Enter your email address and click "Send Test Email"

4. Check:
   - Browser console for debug logs
   - Your email inbox for the test email
   - Supabase Dashboard → Table Editor → `email_notifications` for the record

## 📧 Notification Types Implemented

### 1. **Low Stock Alert**
- **When**: Product stock ≤ 10 units
- **Triggered**: When restocking inventory in `SimpleRestockDialog`
- **Template**: `getLowStockAlertTemplate()`

### 2. **Out of Stock Alert**
- **When**: Product stock = 0
- **Triggered**: When stock reaches zero in `SimpleRestockDialog`
- **Template**: `getOutOfStockAlertTemplate()`

### 3. **Payout Processed**
- **When**: Seller payout is completed
- **Triggered**: From earnings/payout pages
- **Template**: `getPayoutProcessedTemplate()`

### 4. **New Order Received**
- **When**: New order is placed for seller's product
- **Triggered**: Order creation flow
- **Template**: `getNewOrderEmailTemplate()`

### 5. **Return Request**
- **When**: Buyer requests return
- **Triggered**: Return request flow
- **Template**: `getReturnRequestEmailTemplate()`

## 🔧 How to Use in Your Code

```typescript
import { sendEmail } from "@/lib/notifications/email-service";
import { getLowStockAlertTemplate } from "@/lib/notifications/email-templates";

// Example: Send low stock alert
const htmlContent = getLowStockAlertTemplate({
  productName: "Nike Air Max",
  currentStock: 5,
  threshold: 10
});

const result = await sendEmail({
  recipientEmail: "seller@example.com",
  recipientType: "seller",
  alertType: "low_stock_alert",
  subject: "Low Stock Alert - Nike Air Max",
  htmlContent,
  relatedProductId: "product-123",
  relatedSellerId: "seller-456"
});

if (result.success) {
  console.log("Email sent! ID:", result.notificationId);
}
```

## 🐛 Troubleshooting

### Edge Function Not Found
- Make sure you deployed the function: `supabase functions deploy send-email`
- Check function exists in Supabase Dashboard → Edge Functions

### Email Not Sending
- Check Edge Function logs in Supabase Dashboard
- Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` secrets are set
- Check `email_notifications` table for error status

### Authentication Error
- User must be logged in to send emails
- Edge Function checks for valid session token

### CORS Errors (Should be fixed now)
- The Edge Function bypasses CORS by running server-side
- If you still see CORS, you might be calling Resend API directly somewhere

## 📁 File Structure

```
src/
  lib/
    notifications/
      email-service.ts        # Client service (calls Edge Function)
      email-templates.ts      # HTML email templates
      payout-notification.ts  # Payout notification helper
      index.ts               # Barrel exports
  pages/
    TestNotifications.tsx    # Test page (/test-notifications)

supabase/
  functions/
    send-email/
      index.ts              # Edge Function (Deno)
  migrations/
    20251120000001_create_email_notifications.sql
```

## ✅ Final Checklist

- [ ] Edge Function deployed to Supabase
- [ ] Environment secrets set (RESEND_API_KEY, RESEND_FROM_EMAIL)
- [ ] Database migration applied
- [ ] Tested from `/test-notifications` page
- [ ] Email received successfully
- [ ] Record created in `email_notifications` table

## 🎯 Next Steps

1. Integrate notifications into actual flows:
   - Order creation → Send "New Order Received" email
   - Return request → Send "Return Request" email
   - Payout processing → Send "Payout Processed" email

2. Get your own Resend domain:
   - Sign up at https://resend.com
   - Add and verify your domain
   - Update `RESEND_FROM_EMAIL` to use your domain

3. Add email preferences:
   - Let sellers choose which notifications they want
   - Store preferences in `seller_profiles` table

## 📝 Notes

- Currently using Resend free tier with `onboarding@resend.dev`
- For production, get your own domain verified with Resend
- Edge Function logs are available in Supabase Dashboard
- All sent emails are tracked in `email_notifications` table
- Templates are fully customizable in `email-templates.ts`
