# Email Notification System - Testing Guide

## ✅ Implementation Status

### Completed Phases

- ✅ **Phase 1:** Setup & Dependencies (Resend, Supabase, Vercel CLI)
- ✅ **Phase 2:** Vercel Serverless Function Setup (api/email/send.js)
- ✅ **Phase 3:** Email Templates Created (7 templates)
- ✅ **Phase 4:** Template Helpers Created (7 helper functions)
- ✅ **Phase 5:** Integration into OrderDetails.tsx (3 integration points)
- 🔄 **Phase 6:** Testing & Validation (IN PROGRESS)

## 🧪 Testing Checklist

### Email Types Implemented

| Email Type | Template | Helper | Integration | Status |
|------------|----------|--------|-------------|---------|
| Order Shipped | ✅ | ✅ | ✅ OrderDetails.tsx | Ready to test |
| Order Delivered | ✅ | ✅ | ✅ OrderDetails.tsx | Ready to test |
| Order Cancelled | ✅ | ✅ | ✅ OrderDetails.tsx | Ready to test |
| Refund Initiated | ✅ | ✅ | ⏭️ Pending | Ready (awaiting integration) |
| Refund Completed | ✅ | ✅ | ⏭️ Pending | Ready (awaiting integration) |
| Welcome Seller | ✅ | ✅ | ⏭️ Pending | Ready (awaiting integration) |
| Admin New Seller | ✅ | ✅ | ⏭️ Pending | Ready (awaiting integration) |

## 🔬 Testing Mode Configuration

### Current Environment Setup

**Location:** `seller/Authentication/.env`

```bash
# Email Configuration
RESEND_API_KEY="re_ChVPBGfV_4Mhw5CXjCuxemQCZmAWT69jz"
RESEND_FROM_EMAIL="support@trupromart.com"
RESEND_TESTING_MODE="true"                              # ⚠️ TESTING MODE ENABLED
RESEND_VERIFIED_EMAIL="devops-team@theproductworks.in" # All emails redirect here

# Supabase Configuration
SUPABASE_URL="https://wysxqrhotiggokvbbtqx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."                # Full service role key
```

### Testing Mode Behavior

When `RESEND_TESTING_MODE="true"`:
- ✅ All emails redirect to `devops-team@theproductworks.in`
- ✅ Original recipient email stored in metadata
- ✅ Database logging includes actual recipient
- ✅ Console logs show redirection: `[TESTING MODE] Redirecting buyer@example.com to devops-team@...`

## 📋 Step-by-Step Testing Instructions

### Prerequisites

1. **Start Development Server:**
   ```powershell
   cd seller\Authentication
   npm run dev
   ```

2. **Verify Environment Variables:**
   - Check `.env` file exists
   - Confirm `RESEND_TESTING_MODE="true"`
   - Ensure Vercel serverless function is running

3. **Check Database Access:**
   - Verify Supabase connection
   - Confirm `email_notifications` table exists

### Test 1: Order Shipped Email

**Trigger:** Seller marks order as shipped

**Steps:**
1. Login to seller portal
2. Navigate to Orders → Select any order
3. Click "Mark as Shipped"
4. Fill courier details:
   - **Consignment Number:** TEST123456
   - **Courier Partner:** Delhivery
   - **Tracking URL:** (auto-generated or custom)
   - **Estimated Delivery:** 3-5 business days
5. Submit

**Expected Results:**
- ✅ Order status updated to "Shipped"
- ✅ Email sent to `devops-team@theproductworks.in`
- ✅ Email contains:
  - Buyer's name
  - Order number
  - Tracking number: TEST123456
  - Carrier: Delhivery
  - Tracking link
  - Product list with quantities
- ✅ Database log created in `email_notifications`:
  ```sql
  SELECT * FROM email_notifications 
  WHERE alert_type = 'order_shipped' 
  ORDER BY created_at DESC LIMIT 1;
  ```
- ✅ Console shows: `[TESTING MODE] Redirecting ...`

**Troubleshooting:**
- If email not received: Check `.env` file, restart dev server
- If database log missing: Check Supabase service role key
- If error in console: Check buyer email exists in order

### Test 2: Order Delivered Email

**Trigger:** Seller marks order as delivered

**Steps:**
1. Use the same order from Test 1
2. Click "Mark as Delivered"
3. Confirm action

**Expected Results:**
- ✅ Order status updated to "Delivered"
- ✅ Email sent to `devops-team@theproductworks.in`
- ✅ Email contains:
  - "Your order has been delivered!"
  - Delivery date (today's date formatted)
  - Product list
  - Review request CTA
- ✅ Database log with `alert_type = 'order_delivered'`

### Test 3: Order Cancelled Email

**Trigger:** Seller cancels an order

**Steps:**
1. Select a different order (not shipped/delivered)
2. Click "Cancel Order"
3. Enter cancellation reason: "Product out of stock"
4. Submit

**Expected Results:**
- ✅ Order status updated to "Cancelled"
- ✅ Email sent to `devops-team@theproductworks.in`
- ✅ Email contains:
  - Cancellation reason: "Product out of stock"
  - Items with prices
  - Refund information (if applicable)
  - Refund amount and method
- ✅ Database log with `alert_type = 'order_cancelled'`
- ✅ Cancellation record created in `order_cancellations` table

### Test 4: Database Logging Verification

**Check Email Logs:**

```sql
-- View all sent emails
SELECT 
  notification_id,
  alert_type,
  recipient_email,
  subject,
  status,
  created_at,
  metadata
FROM email_notifications
ORDER BY created_at DESC
LIMIT 20;
```

**Expected Data:**
- ✅ 3 records (shipped, delivered, cancelled)
- ✅ `recipient_email` = actual buyer email (not devops)
- ✅ `status` = 'sent'
- ✅ `metadata` contains tracking numbers, reasons, etc.
- ✅ `related_order_id` = order UUID
- ✅ Timestamps accurate

## 🚀 Production Deployment Checklist

### Before Going Live

1. **Update Environment Variables:**
   ```bash
   RESEND_TESTING_MODE="false"  # Disable testing mode
   ```

2. **Add to Vercel Dashboard:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all variables from `.env` (except VITE_ prefixed)
   - Required variables:
     - `RESEND_API_KEY`
     - `RESEND_FROM_EMAIL`
     - `RESEND_TESTING_MODE` = "false"
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

3. **Test in Production:**
   - Use a test order with your own email
   - Verify email arrives at actual recipient
   - Check spam folder if not received
   - Verify database logging still works

4. **Monitor Logs:**
   - Check Vercel Function Logs for errors
   - Monitor Resend Dashboard for delivery status
   - Watch Supabase logs for database issues

## 🔍 Debugging Common Issues

### Issue: Email Not Sent

**Symptoms:** No email received, no error in console

**Solutions:**
1. Check `.env` file exists and is loaded
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Verify Resend API key is valid
4. Check Vercel function logs: `vercel logs`
5. Ensure buyer email exists in order data

### Issue: Database Logging Failed

**Symptoms:** Email sent but no database record

**Solutions:**
1. Verify Supabase service role key (not anon key)
2. Check `email_notifications` table exists
3. Verify foreign key constraints (use `related_seller_id` for sellers, not `recipient_id`)
4. Check alert type mapping (ensure alert_type is in CHECK constraint)

### Issue: Testing Mode Not Working

**Symptoms:** Emails going to actual recipients, not devops email

**Solutions:**
1. Confirm `RESEND_TESTING_MODE="true"` (exact string, with quotes)
2. Restart development server after changing .env
3. Check api/email/send.js reads `process.env.RESEND_TESTING_MODE`
4. Verify email config: `EMAIL_CONFIG.isTestingMode`

## 📊 Integration Points Summary

### Currently Integrated (Phase 5 Complete)

1. **OrderDetails.tsx - handleMarkAsShipped()**
   - ✅ Email: Order Shipped
   - ✅ To: Buyer
   - ✅ Data: Tracking number, courier, estimated delivery

2. **OrderDetails.tsx - handleMarkAsDelivered()**
   - ✅ Email: Order Delivered
   - ✅ To: Buyer
   - ✅ Data: Delivery date, product list

3. **OrderDetails.tsx - handleCancelOrder()**
   - ✅ Email: Order Cancelled
   - ✅ To: Buyer
   - ✅ Data: Cancellation reason, refund info

### Pending Integrations (Phase 5 - Future Work)

4. **Refund Processing**
   - ⏭️ Location: To be determined (Refund handler)
   - ⏭️ Emails: Refund Initiated, Refund Completed
   - ⏭️ Recipients: Buyer + Seller

5. **Seller Registration**
   - ⏭️ Location: Registration flow (SignUp.tsx or similar)
   - ⏭️ Emails: Welcome Seller, Admin New Seller
   - ⏭️ Recipients: Seller + Admin

6. **KYC Submission**
   - ⏭️ Location: KYC.tsx
   - ⏭️ Email: Admin KYC Submitted
   - ⏭️ Recipient: Admin

## 📁 File Structure

```
seller/Authentication/
├── api/
│   └── email/
│       └── send.js                        ✅ Vercel serverless function
├── src/
│   ├── lib/
│   │   └── email/
│   │       ├── types.ts                   ✅ Type definitions
│   │       ├── template-utils.ts          ✅ Utility functions
│   │       ├── templates/
│   │       │   ├── buyer/
│   │       │   │   ├── order-shipped.ts           ✅
│   │       │   │   ├── order-delivered.ts         ✅
│   │       │   │   ├── order-cancelled.ts         ✅
│   │       │   │   ├── refund-initiated.ts        ✅
│   │       │   │   └── refund-completed.ts        ✅
│   │       │   ├── seller/
│   │       │   │   └── welcome-seller.ts          ✅
│   │       │   └── admin/
│   │       │       └── admin-new-seller-registration.ts  ✅
│   │       └── helpers/
│   │           ├── index.ts                       ✅ Central exports
│   │           ├── order-shipped.ts               ✅
│   │           ├── order-delivered.ts             ✅
│   │           ├── order-cancelled.ts             ✅
│   │           ├── refund-initiated.ts            ✅
│   │           ├── refund-completed.ts            ✅
│   │           ├── welcome-seller.ts              ✅
│   │           └── admin-new-seller.ts            ✅
│   ├── pages/
│   │   └── OrderDetails.tsx               ✅ Email integration complete
│   └── services/
│       └── email-service.ts               ✅ HTTP client
├── .env                                   ✅ Environment variables (git-ignored)
└── docs/
    ├── RESEND_EMAIL_IMPLEMENTATION.md     ✅ Implementation guide
    └── EMAIL_TESTING_GUIDE.md             ✅ This file
```

## 🎯 Next Steps

1. **Test the 3 integrated email types** (shipped, delivered, cancelled)
2. **Verify database logging** for all emails
3. **Add remaining integrations:**
   - Refund emails (when refund handler is built)
   - Welcome seller email (at registration)
   - Admin notifications (new seller, KYC)
4. **Prepare for production:**
   - Set `RESEND_TESTING_MODE="false"`
   - Add env vars to Vercel Dashboard
   - Test with real emails
5. **Monitor and iterate:**
   - Track email delivery rates
   - Gather user feedback
   - Improve templates based on engagement

## 📞 Support

- **Resend Dashboard:** https://resend.com/emails
- **Supabase Dashboard:** https://supabase.com/dashboard/project/wysxqrhotiggokvbbtqx
- **Implementation Guide:** `docs/RESEND_EMAIL_IMPLEMENTATION.md`
- **Email Service Issues:** Check `api/email/send.js` and `.env`
