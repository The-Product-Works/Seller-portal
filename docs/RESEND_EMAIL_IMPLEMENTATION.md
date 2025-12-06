# Resend Email Integration - Seller Portal Implementation

## Overview

This document outlines the implementation plan for integrating Resend API email notifications into the **Seller Portal** (`seller/Authentication`). The implementation follows the same architecture as the buyer portal (`protimart_buyer_scratch`) to maintain consistency across the platform.

## Reference Implementation

**Buyer Portal Location:** `protimart_buyer_scratch`
- Email Service: `src/lib/email/`
- Templates: `src/lib/email/templates/`
- API Routes: `src/app/api/email/`
- Documentation: `docs/implementation/resend/RESEND_EMAIL_IMPLEMENTATION.md`

## Architecture Overview

### Implementation Approach

- **No Supabase Triggers:** All emails sent via API calls (not database triggers)
- **Email Sending:** Frontend → Backend Proxy → Resend API → Database Logging
- **Backend Required:** **CRITICAL** - Cannot use Resend SDK directly in browser due to API key exposure
- **Database Logging:** Automatic via notification-service.ts (in backend proxy)
- **Testing Mode:** Environment variable toggle (no code changes for prod)
- **Framework:** Vite + React + TypeScript (Seller Portal) vs Next.js (Buyer Portal)

### ⚠️ CRITICAL SECURITY CONSIDERATION

**YOU CANNOT CALL RESEND API DIRECTLY FROM CLIENT-SIDE CODE!**

Reasons:
1. **API Key Exposure** - `RESEND_API_KEY` would be visible in browser DevTools
2. **CORS Blocked** - Resend API doesn't support CORS for browser requests
3. **Security Risk** - Anyone could steal your key and send unlimited emails
4. **SDK Not Designed** - Resend SDK is server-side only

**Solution for Vercel:** Use **Vercel Serverless Functions** - No separate server needed!
- ✅ Single deployment (same as your Vite app)
- ✅ No separate terminal/server to run
- ✅ API key stays secure on server-side
- ✅ Automatic scaling and HTTPS
- ✅ No CORS issues (same domain)

### Key Differences: Seller Portal vs Buyer Portal

| Aspect | Buyer Portal | Seller Portal (Vercel) |
|--------|--------------|------------------------|
| Framework | Next.js 14 (App Router) | Vite + React |
| Backend | Built-in API routes | **Vercel Serverless Functions** |
| API Structure | `src/app/api/` routes | `api/` directory (Vercel functions) |
| Email Trigger | Next.js API routes | **HTTP calls to `/api/` endpoints** |
| Environment | `.env.local` | **Single `.env` file** |
| Security | API key on server | **API key in Vercel environment** |
| Deployment | Single deployment | **Single deployment** ✅ |
| Dev Server | One terminal | **One terminal** ✅ |

## Configuration

### Environment Variables

**Buyer Portal (`.env.local`):**
```env
RESEND_API_KEY="re_****************************" # MASKED FOR SECURITY
RESEND_FROM_EMAIL="support@trupromart.com"
RESEND_TESTING_MODE="false"
RESEND_VERIFIED_EMAIL="devops-team@theproductworks.in"
```

**Seller Portal - Single `.env` file (Vercel Deployment):**
```env
# ⚠️ DO NOT PUT VITE_RESEND_API_KEY HERE - SECURITY RISK!
# API key goes in Vercel Environment Variables dashboard

# Frontend variables (safe to expose)
VITE_ADMIN_EMAIL="devops-team@theproductworks.in"
VITE_SUPABASE_URL="https://wysxqrhotiggokvbbtqx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key"

# Backend variables (for Vercel Serverless Functions - NOT prefixed with VITE_)
# These are added in Vercel Dashboard → Settings → Environment Variables
# RESEND_API_KEY="re_****************************"
# RESEND_FROM_EMAIL="support@trupromart.com"
# RESEND_TESTING_MODE="false"
# RESEND_VERIFIED_EMAIL="devops-team@theproductworks.in"
# SUPABASE_URL="https://wysxqrhotiggokvbbtqx.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY="ey****************************"
```

**Vercel Environment Variables (Set in Vercel Dashboard):**

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add these (server-side only, **NOT** prefixed with `VITE_`):
```
RESEND_API_KEY = re_****************************
RESEND_FROM_EMAIL = support@trupromart.com
RESEND_TESTING_MODE = false
RESEND_VERIFIED_EMAIL = devops-team@theproductworks.in
SUPABASE_URL = https://wysxqrhotiggokvbbtqx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = ey****************************
```

**Configuration Status:**
- 🚨 **CRITICAL**: Remove `VITE_RESEND_API_KEY` from `.env` if present
- ⚠️ Add backend env vars to Vercel Dashboard (not `.env` file)
- ✅ Keep frontend vars in `.env` (with `VITE_` prefix)
- ✅ No separate server needed - Vercel handles it

### Email Notifications Table Schema

**Database Table:** `email_notifications` (Already exists in Supabase)

```sql
CREATE TABLE public.email_notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type varchar NOT NULL DEFAULT 'email',
  recipient_type varchar NOT NULL,  -- 'buyer', 'seller', 'admin'
  recipient_id uuid,  -- FK to users/sellers table
  recipient_email text NOT NULL,
  subject text NOT NULL,
  alert_type varchar NOT NULL,  -- See Alert Types below
  related_order_id uuid,
  related_product_id uuid,
  related_seller_id uuid,
  related_entity_id uuid,
  tracking_id text,
  transaction_id text,
  sent_at timestamp NOT NULL DEFAULT now(),
  status varchar NOT NULL DEFAULT 'sent',  -- 'sent', 'failed', 'pending'
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
```

## Notification Scope Analysis

### Notifications from `all_notifs.txt`

#### ✅ Already Integrated (from Buyer Portal)

**Buyer Notifications:**
1. ✅ Order Confirmed
2. ✅ Payment Successful
3. ✅ Payment Failed
9. ✅ Return Requested
14. ✅ Welcome Notification
15. ✅ Profile Updated

**Seller Notifications:**
1. ✅ New Order Received
2. ✅ Order Canceled by Buyer
5. ✅ Return Request Received
9. ✅ Low Stock Alert
10. ✅ Product Out of Stock
13. ✅ New Review/Rating

**Admin Notifications:**
1. ✅ Payment Failed Alert
2. ✅ Order Cancellation
4. ✅ Return Request Alert
6. ✅ Dispute Raised
10. ✅ Report Received

#### 🔨 TO BE IMPLEMENTED (from Seller Portal)

**Buyer Notifications - Order Updates:**
- 4. Order Shipped ⭐ **(HIGH PRIORITY)**
- 5. Order Delivered ⭐ **(HIGH PRIORITY)**
- 6. Order Cancelled (by seller)
- 10. Refund Initiated
- 11. Refund Completed

**Seller Notifications:**
- 6. Refund Completed (seller notification)

**Admin Notifications:**
- 5. Return received by seller
- 7. New Seller Registration ⭐ **(Seller Portal action)**
- 8. Seller KYC Submitted ⭐ **(Seller Portal action)**

#### 🔵 TO BE IMPLEMENTED (from Admin Portal)

**Seller Notifications:**
- 12. Account Approved (after KYC)
- 14. Payout Processed

## Seller Portal Integration Points

### Current Seller Portal Actions Analysis

Based on `src/pages/OrderDetails.tsx`:

#### 1. Order Status Updates (Lines 430-460)

**Actions that trigger buyer notifications:**

```typescript
// ⭐ INTEGRATION POINT 1: Mark as Packed
const handleMarkAsPacked = async () => {
  await updateOrderStatus("packed");
  // ✅ NO EMAIL NEEDED - Internal status
};

// ⭐ INTEGRATION POINT 2: Mark as Shipped
const handleMarkAsShipped = async () => {
  // Updates order_tracking with courier details
  // Updates order_items.status to "shipped"
  // 📧 SEND: Order Shipped notification to BUYER
};

// ⭐ INTEGRATION POINT 3: Mark as Delivered
const handleMarkAsDelivered = async () => {
  await updateOrderStatus("delivered");
  await processDeliveryForPayout({ orderItemId, sellerId });
  // 📧 SEND: Order Delivered notification to BUYER
};
```

#### 2. Order Cancellation (Lines 188-224)

```typescript
// ⭐ INTEGRATION POINT 4: Cancel Order (by seller)
const handleCancelOrder = async () => {
  // Creates order_cancellations record
  // Updates order_items.status to "cancelled"
  // 📧 SEND: Order Cancelled notification to BUYER
  // 📧 SEND: Refund Initiated notification to BUYER (if applicable)
};
```

#### 3. Return Handling (Lines 900-1100)

```typescript
// ⭐ INTEGRATION POINT 5: Return Quality Check
const handleReturnQC = async () => {
  // Creates return_quality_checks record
  // If approved → triggers refund
  // 📧 SEND: Return received by seller notification to ADMIN
  // 📧 SEND: Refund Initiated notification to BUYER (if approved)
  // 📧 SEND: Refund Completed notification to BUYER (after processing)
  // 📧 SEND: Refund Completed notification to SELLER
};
```

#### 4. Seller Registration & KYC (Other Pages)

```typescript
// ⭐ INTEGRATION POINT 6: Seller Registration
// Location: src/pages/auth/* or registration flow
// 📧 SEND: New Seller Registration notification to ADMIN
// 📧 SEND: Welcome notification to SELLER

// ⭐ INTEGRATION POINT 7: KYC Submission
// Location: src/pages/KYC.tsx or similar
// 📧 SEND: Seller KYC Submitted notification to ADMIN
```

### Trigger Summary

| Action | Buyer Email | Seller Email | Admin Email |
|--------|-------------|--------------|-------------|
| Mark as Shipped | ✅ Order Shipped | - | - |
| Mark as Delivered | ✅ Order Delivered | - | - |
| Cancel Order (Seller) | ✅ Order Cancelled | - | - |
| Cancel Order (Seller) | ✅ Refund Initiated | - | - |
| Return QC - Received | - | - | ✅ Return Received |
| Return QC - Approved | ✅ Refund Initiated | - | - |
| Refund Processed | ✅ Refund Completed | ✅ Refund Completed | - |
| New Seller Registration | - | ✅ Welcome | ✅ New Seller |
| KYC Submitted | - | - | ✅ KYC Submitted |

## Implementation Plan

### Phase 1: Setup & Dependencies ⏳

**Tasks:**

1. ✅ Create implementation documentation (this file)
2. ⚠️ Install Resend & Supabase packages: `npm install resend @supabase/supabase-js`
3. ⚠️ Configure Vercel project settings
4. ⚠️ Add environment variables to Vercel Dashboard
5. ⚠️ Create Vercel serverless function
6. ⚠️ Create frontend email service (HTTP client)
7. ⚠️ Configure vercel.json for API routes

**Directory Structure (Vercel Deployment):**

```
seller/Authentication/
├── api/                                   ⚠️ CREATE (Vercel Serverless Functions)
│   └── email/
│       └── send.js                        ⚠️ CREATE (Resend API handler)
├── src/
│   ├── lib/
│   │   └── email/
│   │       ├── types.ts                   (Port from buyer)
│   │       ├── template-utils.ts          (Port from buyer)
│   │       ├── templates/
│   │       │   ├── buyer/                 (New templates)
│   │       │   ├── seller/                (New templates)
│   │       │   └── admin/                 (New templates)
│   │       └── helpers/                   (Email helpers)
│   └── services/
│       └── email-service.ts               (NEW - HTTP client for /api/email/send)
├── vercel.json                            ⚠️ CREATE (Route configuration)
├── .env                                   ⚠️ UPDATE (frontend vars only)
└── docs/
    └── RESEND_EMAIL_IMPLEMENTATION.md     (This file)
```

**Note:** No `email-proxy/` directory needed! Vercel handles the backend automatically.

### Phase 2: Vercel Serverless Function Setup ⏳

**2.1. Configure vercel.json**

Create `vercel.json` in project root:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ]
}
```

**2.2. Create Vercel Serverless Function**

Create `api/email/send.js`:

```javascript
/**
 * Vercel Serverless Function for Email Sending
 * Path: /api/email/send
 * 
 * This runs on Vercel's serverless infrastructure
 * Environment variables are accessed via process.env (set in Vercel Dashboard)
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Resend with API key from Vercel environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase for logging
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email configuration
const EMAIL_CONFIG = {
  isTestingMode: process.env.RESEND_TESTING_MODE === 'true',
  verifiedEmail: process.env.RESEND_VERIFIED_EMAIL || 'devops-team@theproductworks.in',
  fromEmail: process.env.RESEND_FROM_EMAIL || 'support@trupromart.com',
};

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      alertType,
      recipientEmail,
      recipientType,
      recipientId,
      subject,
      htmlContent,
      relatedOrderId,
      relatedProductId,
      relatedSellerId,
      relatedEntityId,
      trackingId,
      transactionId,
      metadata
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !subject || !htmlContent || !alertType || !recipientType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Apply testing mode
    const actualRecipient = EMAIL_CONFIG.isTestingMode 
      ? EMAIL_CONFIG.verifiedEmail 
      : recipientEmail;

    if (EMAIL_CONFIG.isTestingMode) {
      console.log(`📧 [TESTING MODE] Redirecting ${recipientEmail} to ${EMAIL_CONFIG.verifiedEmail}`);
    }

    // Send email via Resend
    console.log('📧 Sending email via Resend...', {
      to: actualRecipient,
      subject,
      alertType
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.fromEmail,
      to: actualRecipient,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      
      // Log failure to database
      await logEmailToDatabase({
        alertType,
        recipientEmail,
        recipientType,
        recipientId,
        subject,
        status: 'failed',
        relatedOrderId,
        relatedProductId,
        relatedSellerId,
        relatedEntityId,
        trackingId,
        transactionId,
        metadata: { ...metadata, error: error.message }
      });

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log('✅ Email sent successfully:', data.id);

    // Log success to database
    await logEmailToDatabase({
      alertType,
      recipientEmail,
      recipientType,
      recipientId,
      subject,
      status: 'sent',
      messageId: data.id,
      relatedOrderId,
      relatedProductId,
      relatedSellerId,
      relatedEntityId,
      trackingId,
      transactionId,
      metadata
    });

    return res.status(200).json({
      success: true,
      messageId: data.id
    });

  } catch (error) {
    console.error('❌ Error in serverless function:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Log email to database
 */
async function logEmailToDatabase(params) {
  try {
    const { error } = await supabase
      .from('email_notifications')
      .insert({
        notification_type: 'email',
        recipient_type: params.recipientType,
        recipient_id: params.recipientId || null,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        alert_type: params.alertType,
        related_order_id: params.relatedOrderId || null,
        related_product_id: params.relatedProductId || null,
        related_seller_id: params.relatedSellerId || null,
        related_entity_id: params.relatedEntityId || null,
        tracking_id: params.trackingId || null,
        transaction_id: params.transactionId || null,
        status: params.status,
        metadata: params.metadata || null,
      });

    if (error) {
      console.error('❌ Failed to log email to database:', error);
    } else {
      console.log('✅ Email logged to database');
    }
  } catch (error) {
    console.error('❌ Error logging to database:', error);
  }
}
```

**2.3. Create Frontend Email Service (HTTP Client)**

`src/services/email-service.ts`

```typescript
import type { AlertType, RecipientType } from '@/lib/email/types';

// In development: Vite dev server proxies to /api/email/send
// In production: Vercel serves /api/email/send as serverless function
// No need for separate URL - same domain!
const API_URL = '/api/email/send';

interface SendEmailParams {
  alertType: AlertType;
  recipientEmail: string;
  recipientType: RecipientType;
  recipientId?: string;
  subject: string;
  htmlContent: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  relatedSellerId?: string;
  relatedEntityId?: string;
  trackingId?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Vercel serverless function
 * This is the ONLY way to send emails from the seller portal frontend
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    console.log('📧 Sending email via serverless function...', {
      alertType: params.alertType,
      recipientEmail: params.recipientEmail,
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Email sent successfully via serverless function:', result.messageId);
    
    return result;
  } catch (error) {
    console.error('❌ Error sending email via serverless function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Convenience function to trigger email sending
 * Non-blocking - doesn't throw errors
 */
export async function triggerEmail(params: SendEmailParams): Promise<void> {
  sendEmail(params).catch(err => {
    console.error('Email sending failed (non-blocking):', err);
  });
}
```

**2.4. Configure Vite Dev Server for Local Development**

Update `vite.config.ts` to proxy API requests during development:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Proxy /api requests to Vercel dev server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

**2.5. Add npm Scripts for Development**

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:vercel": "vercel dev",
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:vercel\"",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "vercel": "^33.0.0"
  }
}
```

**Development Modes:**

**Option 1: Quick Dev (No email testing)**
```bash
npm run dev
# Only runs Vite frontend on :5173
# Email API won't work locally (use for UI development)
```

**Option 2: Full Dev (With email testing)**
```bash
npm run dev:full
# Runs both Vite (:5173) and Vercel dev (:3000)
# Email API works via /api/email/send
# Still ONE terminal! concurrently handles both
```

**Option 3: Vercel Dev Only**
```bash
npm run dev:vercel
# Vercel handles everything (frontend + API) on :3000
# Slower but most accurate to production
```

### Phase 3: Email Templates ⏳

**3.1. Buyer Notification Templates (HIGH PRIORITY)**

Create in `src/lib/email/templates/buyer/`:

1. ⭐ `order-shipped.ts` - When seller marks order as shipped
2. ⭐ `order-delivered.ts` - When seller marks order as delivered
3. `order-cancelled-by-seller.ts` - When seller cancels order
4. `refund-initiated.ts` - When refund process starts
5. `refund-completed.ts` - When refund is processed

**3.2. Seller Notification Templates**

Create in `src/lib/email/templates/seller/`:

1. `seller-refund-completed.ts` - Refund confirmation for seller
2. `welcome-seller.ts` - After successful seller registration

**3.3. Admin Notification Templates**

Create in `src/lib/email/templates/admin/`:

1. `admin-return-received.ts` - Return received by seller notification
2. `admin-new-seller-registration.ts` - New seller registered
3. `admin-seller-kyc-submitted.ts` - Seller KYC documents submitted

### Phase 4: Template Helpers ⏳

Create helper functions in `src/lib/email/helpers/`:

1. `order-shipped.ts` - Generate order shipped email
2. `order-delivered.ts` - Generate order delivered email
3. `order-cancelled-by-seller.ts` - Generate cancellation email
4. `refund-initiated.ts` - Generate refund initiation email
5. `refund-completed.ts` - Generate refund completion email
6. `seller-refund-completed.ts` - Seller refund notification
7. `admin-return-received.ts` - Admin return notification
8. `admin-new-seller.ts` - Admin new seller notification
9. `admin-kyc-submitted.ts` - Admin KYC notification
10. `welcome-seller.ts` - Welcome seller email

### Phase 5: Integration into Components ⏳

**5.1. OrderDetails.tsx - Mark as Shipped**

```typescript
import { sendEmail } from '@/services/email-service';
import { generateOrderShippedEmail } from '@/lib/email/helpers/order-shipped';

const handleMarkAsShipped = async () => {
  setUpdating(true);
  try {
    // ... existing shipping logic ...
    
    // Update order status
    await updateOrderStatus("shipped");
    
    // Get buyer email
    const buyerEmail = buyer?.email;
    const buyerName = buyer?.user_profiles?.full_name || buyer?.email?.split('@')[0] || 'Customer';
    
    if (buyerEmail) {
      // Generate email content
      const emailContent = await generateOrderShippedEmail({
        buyerName,
        orderId: order?.order_id || '',
        orderItemId: orderItem?.order_item_id || '',
        trackingNumber: courierDetails.consignmentNumber,
        trackingUrl: courierDetails.trackingUrl,
        courierPartner: courierDetails.courierPartner,
        estimatedDelivery: courierDetails.estimatedDelivery,
        productName: orderItem?.seller_title || 'Product',
        productImage: '', // Add if available
        quantity: orderItem?.quantity || 1,
      });
      
      // Send email via proxy (async, don't wait)
      sendEmail({
        alertType: 'order_shipped',
        recipientEmail: buyerEmail,
        recipientType: 'buyer',
        recipientId: buyer?.id,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        relatedOrderId: order?.order_id,
        relatedSellerId: orderItem?.seller_id,
        trackingId: courierDetails.consignmentNumber,
      }).catch(err => {
        console.error('Failed to send order shipped email:', err);
        // Don't block the main flow - email is not critical
      });
    }
    
    toast({
      title: "Order Shipped",
      description: "Order marked as shipped and customer notified.",
    });
    
    loadOrderDetails();
    closeAllDialogs();
  } catch (error) {
    console.error("Error marking as shipped:", error);
    toast({
      title: "Error",
      description: "Failed to mark order as shipped.",
      variant: "destructive",
    });
  } finally {
    setUpdating(false);
  }
};
```

**5.2. OrderDetails.tsx - Mark as Delivered**

```typescript
const handleMarkAsDelivered = async () => {
  setUpdating(true);
  try {
    // Update order status
    await updateOrderStatus("delivered");
    
    // Process payout
    await processDeliveryForPayout({
      orderItemId: orderItem?.order_item_id || '',
      sellerId: await getAuthenticatedSellerId() || '',
    });
    
    // Send email
    const buyerEmail = buyer?.email;
    const buyerName = buyer?.user_profiles?.full_name || buyer?.email?.split('@')[0] || 'Customer';
    
    if (buyerEmail) {
      const emailContent = await generateOrderDeliveredEmail({
        buyerName,
        orderId: order?.order_id || '',
        orderItemId: orderItem?.order_item_id || '',
        productName: orderItem?.seller_title || 'Product',
        deliveredAt: new Date().toISOString(),
      });
      
      triggerEmail({
        alertType: 'order_delivered',
        recipientEmail: buyerEmail,
        recipientType: 'buyer',
        recipientId: buyer?.id,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        relatedOrderId: order?.order_id,
        relatedSellerId: orderItem?.seller_id,
      }).catch(err => console.error('Failed to send order delivered email:', err));
    }
    
    toast({
      title: "Order Delivered",
      description: "Order marked as delivered, payout processed, and customer notified.",
    });
    
    loadOrderDetails();
  } catch (error) {
    console.error("Error marking as delivered:", error);
    toast({
      title: "Error",
      description: "Failed to mark order as delivered.",
      variant: "destructive",
    });
  } finally {
    setUpdating(false);
  }
};
```

**5.3. OrderDetails.tsx - Cancel Order**

```typescript
const handleCancelOrder = async () => {
  setUpdating(true);
  try {
    // ... existing cancel logic ...
    
    // Send emails
    const buyerEmail = buyer?.email;
    const buyerName = buyer?.user_profiles?.full_name || buyer?.email?.split('@')[0] || 'Customer';
    
    if (buyerEmail) {
      // 1. Order cancelled notification
      const cancelEmailContent = await generateOrderCancelledBySellerEmail({
        buyerName,
        orderId: order?.order_id || '',
        orderItemId: orderItem?.order_item_id || '',
        cancelReason,
        productName: orderItem?.seller_title || 'Product',
      });
      
      triggerEmail({
        alertType: 'order_cancelled',
        recipientEmail: buyerEmail,
        recipientType: 'buyer',
        recipientId: buyer?.id,
        subject: cancelEmailContent.subject,
        htmlContent: cancelEmailContent.html,
        relatedOrderId: order?.order_id,
        relatedSellerId: orderItem?.seller_id,
      }).catch(err => console.error('Failed to send cancellation email:', err));
      
      // 2. Refund initiated notification (if payment was made)
      if (order?.payment_status === 'paid') {
        setTimeout(() => {
          const refundEmailContent = await generateRefundInitiatedEmail({
            buyerName,
            orderId: order?.order_id || '',
            refundAmount: orderItem?.item_subtotal || 0,
          });
          
          triggerEmail({
            alertType: 'refund_initiated',
            recipientEmail: buyerEmail,
            recipientType: 'buyer',
            recipientId: buyer?.id,
            subject: refundEmailContent.subject,
            htmlContent: refundEmailContent.html,
            relatedOrderId: order?.order_id,
            transactionId: order?.payment_id || undefined,
          }).catch(err => console.error('Failed to send refund initiated email:', err));
        }, 1000); // Delay to ensure sequential delivery
      }
    }
    
    toast({
      title: "Order Cancelled",
      description: "Order cancelled and customer notified.",
    });
    
    loadOrderDetails();
    closeAllDialogs();
  } catch (error) {
    console.error("Error cancelling order:", error);
    toast({
      title: "Error",
      description: "Failed to cancel order.",
      variant: "destructive",
    });
  } finally {
    setUpdating(false);
  }
};
```

**5.4. Return Quality Check Handler**

```typescript
const handleReturnQC = async () => {
  try {
    // ... existing QC logic ...
    
    // Send admin notification
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    if (adminEmail) {
      const adminEmailContent = await generateAdminReturnReceivedEmail({
        orderId: order?.order_id || '',
        orderItemId: orderItem?.order_item_id || '',
        buyerName: buyer?.user_profiles?.full_name || 'Unknown',
        productName: orderItem?.seller_title || 'Product',
        qcResult: qcDetails.result,
        remarks: qcDetails.remarks,
      });
      
      triggerEmail({
        alertType: 'admin_return_received',
        recipientEmail: adminEmail,
        recipientType: 'admin',
        subject: adminEmailContent.subject,
        htmlContent: adminEmailContent.html,
        relatedOrderId: order?.order_id,
        relatedSellerId: orderItem?.seller_id,
      }).catch(err => console.error('Failed to send admin return notification:', err));
    }
    
    // If approved, send refund notifications
    if (qcDetails.result === 'approved') {
      const buyerEmail = buyer?.email;
      const buyerName = buyer?.user_profiles?.full_name || buyer?.email?.split('@')[0] || 'Customer';
      
      if (buyerEmail) {
        // Refund initiated
        const refundInitiatedContent = await generateRefundInitiatedEmail({
          buyerName,
          orderId: order?.order_id || '',
          refundAmount: orderItem?.item_subtotal || 0,
        });
        
        triggerEmail({
          alertType: 'refund_initiated',
          recipientEmail: buyerEmail,
          recipientType: 'buyer',
          recipientId: buyer?.id,
          subject: refundInitiatedContent.subject,
          htmlContent: refundInitiatedContent.html,
          relatedOrderId: order?.order_id,
        }).catch(err => console.error('Failed to send refund initiated email:', err));
      }
    }
    
    toast({
      title: "QC Completed",
      description: "Quality check completed and notifications sent.",
    });
    
    loadOrderDetails();
    closeAllDialogs();
  } catch (error) {
    console.error("Error completing QC:", error);
    toast({
      title: "Error",
      description: "Failed to complete quality check.",
      variant: "destructive",
    });
  }
};
```

**5.5. Seller Registration Flow**

Location: `src/pages/auth/*` or registration component

```typescript
const handleSellerRegistration = async (sellerData: SellerRegistrationData) => {
  try {
    // ... existing registration logic ...
    
    // Send welcome email to seller
    const sellerEmail = sellerData.email;
    const sellerName = sellerData.business_name || sellerData.contact_name;
    
    if (sellerEmail) {
      const welcomeEmailContent = await generateWelcomeSel lerEmail({
        sellerName,
        businessName: sellerData.business_name,
      });
      
      triggerEmail({
        alertType: 'welcome',
        recipientEmail: sellerEmail,
        recipientType: 'seller',
        recipientId: sellerId,
        subject: welcomeEmailContent.subject,
        htmlContent: welcomeEmailContent.html,
        relatedSellerId: sellerId,
      }).catch(err => console.error('Failed to send welcome email:', err));
    }
    
    // Send notification to admin
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    if (adminEmail) {
      const adminEmailContent = await generateAdminNewSellerEmail({
        sellerName,
        businessName: sellerData.business_name,
        email: sellerEmail,
        phone: sellerData.phone,
        sellerId,
      });
      
      triggerEmail({
        alertType: 'admin_new_seller_registration',
        recipientEmail: adminEmail,
        recipientType: 'admin',
        subject: adminEmailContent.subject,
        htmlContent: adminEmailContent.html,
        relatedSellerId: sellerId,
      }).catch(err => console.error('Failed to send admin notification:', err));
    }
    
    toast({
      title: "Registration Successful",
      description: "Welcome email sent. Please complete KYC verification.",
    });
  } catch (error) {
    console.error("Error during registration:", error);
    toast({
      title: "Error",
      description: "Failed to complete registration.",
      variant: "destructive",
    });
  }
};
```

**5.6. KYC Submission**

Location: `src/pages/KYC.tsx` or similar

```typescript
const handleKYCSubmission = async (kycData: KYCData) => {
  try {
    // ... existing KYC submission logic ...
    
    // Send notification to admin
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    if (adminEmail) {
      const adminEmailContent = await generateAdminKYCSubmittedEmail({
        sellerName: sellerDetails?.business_name || 'Unknown',
        sellerId: sellerDetails?.id || '',
        documentsSubmitted: Object.keys(kycData.documents),
      });
      
      triggerEmail({
        alertType: 'admin_seller_kyc_submitted',
        recipientEmail: adminEmail,
        recipientType: 'admin',
        subject: adminEmailContent.subject,
        htmlContent: adminEmailContent.html,
        relatedSellerId: sellerDetails?.id,
      }).catch(err => console.error('Failed to send KYC notification:', err));
    }
    
    toast({
      title: "KYC Submitted",
      description: "Your documents have been submitted for review.",
    });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    toast({
      title: "Error",
      description: "Failed to submit KYC documents.",
      variant: "destructive",
    });
  }
};
```

### Phase 6: Testing & Validation ⏳

**6.1. Testing Strategy**

1. **Unit Testing:**
   - Test email generation helpers
   - Test notification service
   - Verify template rendering

2. **Integration Testing:**
   - Test each trigger point in isolation
   - Verify email delivery in testing mode
   - Check database logging

3. **End-to-End Testing:**
   - Complete order flow: shipped → delivered
   - Cancel order flow
   - Return QC flow
   - Seller registration flow
   - KYC submission flow

**6.2. Testing Checklist**

- [ ] Order Shipped email sent to buyer
- [ ] Order Delivered email sent to buyer
- [ ] Order Cancelled email sent to buyer
- [ ] Refund Initiated email sent to buyer
- [ ] Refund Completed email sent to buyer & seller
- [ ] Return Received notification sent to admin
- [ ] New Seller Registration sent to admin & welcome to seller
- [ ] KYC Submitted sent to admin
- [ ] All emails logged in `email_notifications` table
- [ ] Testing mode correctly redirects to verified email
- [ ] Production mode sends to actual recipients

## Alert Types Reference

### Buyer Notifications (Order Updates from Seller Portal)

```typescript
type BuyerAlertTypes = 
  | 'order_shipped'           // ⭐ HIGH PRIORITY
  | 'order_delivered'         // ⭐ HIGH PRIORITY
  | 'order_cancelled'         // Cancelled by seller
  | 'refund_initiated'
  | 'refund_completed';
```

### Seller Notifications

```typescript
type SellerAlertTypes = 
  | 'seller_refund_completed'
  | 'welcome';                // After registration
```

### Admin Notifications

```typescript
type AdminAlertTypes = 
  | 'admin_return_received'              // Return QC completed
  | 'admin_new_seller_registration'      // ⭐ HIGH PRIORITY
  | 'admin_seller_kyc_submitted';        // ⭐ HIGH PRIORITY
```

## Database Logging

All emails are automatically logged to `email_notifications` table via `notification-service.ts`:

```typescript
interface EmailLogEntry {
  notification_id: uuid;
  notification_type: 'email';
  recipient_type: 'buyer' | 'seller' | 'admin';
  recipient_id?: uuid;
  recipient_email: string;
  subject: string;
  alert_type: AlertType;
  related_order_id?: uuid;
  related_product_id?: uuid;
  related_seller_id?: uuid;
  related_entity_id?: uuid;
  tracking_id?: string;
  transaction_id?: string;
  sent_at: timestamp;
  status: 'sent' | 'failed' | 'pending';
  metadata?: jsonb;
  created_at: timestamp;
}
```

## Deduplication Strategy

For critical notifications (similar to buyer portal implementation):

```typescript
// Check if notification was sent recently (e.g., within 1 hour)
async function wasNotificationSentRecently(
  alertType: AlertType,
  recipientEmail: string,
  relatedEntityId?: string,
  withinMinutes: number = 60
): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_notifications')
    .select('notification_id')
    .eq('alert_type', alertType)
    .eq('recipient_email', recipientEmail)
    .eq('related_entity_id', relatedEntityId)
    .gte('sent_at', new Date(Date.now() - withinMinutes * 60 * 1000).toISOString())
    .limit(1);
  
  return data && data.length > 0;
}
```

## Error Handling

All email sending is **non-blocking** - failures don't prevent main operations:

```typescript
// ✅ CORRECT: Don't await, don't block
triggerEmail({...}).catch(err => {
  console.error('Email failed but order status updated:', err);
  // Don't show error to user - email is not critical
});

// ❌ INCORRECT: Blocking
await triggerEmail({...}); // This blocks the main flow
```

## Environment-Specific Behavior

### Testing Mode (VITE_RESEND_TESTING_MODE="true")

- All emails redirected to `VITE_RESEND_VERIFIED_EMAIL`
- Email body shows intended recipient info
- Warning banner in email indicating testing mode

### Production Mode (VITE_RESEND_TESTING_MODE="false")

- Emails sent to actual recipients
- No testing banners
- Requires verified domain

## Migration from Buyer Portal

### Files to Port (with modifications)

1. ✅ **types.ts** - No changes
2. ⚠️ **resend-service.ts** - Change `process.env` to `import.meta.env.VITE_`
3. ⚠️ **notification-service.ts** - Change `process.env` to `import.meta.env.VITE_`
4. ✅ **template-utils.ts** - No changes (or adapt styling if needed)

### New Files to Create

1. **email-trigger-service.ts** - Client-side wrapper (replaces API routes)
2. **templates/buyer/** - New buyer templates (shipped, delivered, cancelled, refund)
3. **templates/seller/** - New seller templates (refund completed, welcome)
4. **templates/admin/** - New admin templates (return received, new seller, KYC)
5. **helpers/** - Template generation helpers for all new templates

## Success Criteria

- [ ] All environment variables configured
- [ ] Resend package installed
- [ ] Core services ported and adapted for Vite
- [ ] Email trigger service created
- [ ] All 10 notification templates created
- [ ] All 10 template helpers created
- [ ] OrderDetails.tsx integrated (shipped, delivered, cancelled)
- [ ] Return QC handler integrated
- [ ] Seller registration integrated
- [ ] KYC submission integrated
- [ ] All emails logged to database
- [ ] Testing mode working correctly
- [ ] Production deployment tested
- [ ] Documentation updated

## Next Steps

1. **Phase 1:** Install dependencies and setup environment
2. **Phase 2:** Port core services from buyer portal
3. **Phase 3:** Create email templates (focus on high priority first)
4. **Phase 4:** Create template helpers
5. **Phase 5:** Integrate into components (OrderDetails.tsx first)
6. **Phase 6:** Test thoroughly in testing mode
7. **Phase 7:** Deploy to production

## Notes

- **Framework Difference:** Buyer portal uses Next.js API routes; seller portal uses client-side services directly
- **Environment Variables:** Seller portal uses `VITE_` prefix
- **Same Database:** Both portals share the same `email_notifications` table
- **Same API Key:** Both portals use the same Resend API key
- **Same From Email:** Both portals send from `support@trupromart.com`
- **Non-Blocking:** Email sending never blocks main operations
- **Error Resilience:** Email failures are logged but don't affect user experience

## Reference Links

- Buyer Portal Implementation: `protimart_buyer_scratch/docs/implementation/resend/RESEND_EMAIL_IMPLEMENTATION.md`
- Notification List: `protimart_buyer_scratch/docs/implementation/resend/all_notifs.txt`
- Resend API Docs: https://resend.com/docs
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html

## Security & Architecture FAQ

### Q: Why can't we use Resend SDK directly in the React frontend?

**A:** The Resend SDK requires an API key which would be exposed in the browser. This creates several critical security issues:

1. **API Key Exposure**: Anyone can open DevTools → Sources/Network and see your API key
2. **Unlimited Usage**: Attackers could use your key to send unlimited emails (expensive!)
3. **CORS Blocked**: Resend API doesn't support CORS for browser requests - it will fail
4. **SDK Design**: The Resend npm package is designed for Node.js environments only

### Q: How does the buyer portal (Next.js) avoid this problem?

**A:** Next.js has built-in **API Routes** that run on the server-side:

```
Buyer Portal (Next.js):
Frontend → Next.js API Route (server-side) → Resend API → Database
                ↑
            API key is here (server-side, safe)
```

The API key lives in `process.env` on the **server**, never sent to browser.

### Q: How will the seller portal handle this?

**A:** Use **Vercel Serverless Functions** (no separate server needed!):

```
Seller Portal (Vite + React):
Frontend → /api/email/send (Vercel Function) → Resend API → Database
   ↓              ↑
No API key    API key is here (Vercel environment, safe)
```

**Benefits:**
- ✅ Single deployment (same as frontend)
- ✅ No separate server to run
- ✅ One terminal for development
- ✅ Automatic scaling
- ✅ HTTPS by default
- ✅ Same domain (no CORS issues)

Your frontend calls `/api/email/send` which Vercel automatically routes to the serverless function.

### Q: Will we have CORS issues?

**A:** No! With Vercel Serverless Functions:
- Frontend and API are on the **same domain**
- In dev: Vite proxies `/api/*` to Vercel dev server
- In production: Vercel serves both frontend and API
- No CORS configuration needed!

**Development:**
```
http://localhost:5173/          → Vite serves frontend
http://localhost:5173/api/...   → Proxied to Vercel dev (:3000)
```

**Production:**
```
https://seller.trupromart.com/          → Frontend
https://seller.trupromart.com/api/...   → Serverless functions
```

Same domain = No CORS! 🎉

### Q: Can't we just use Supabase Edge Functions instead?

**A:** You could, but Vercel Serverless Functions are better for your setup:

| Feature | Vercel Functions | Supabase Edge Functions |
|---------|------------------|------------------------|
| Deployment | Same as frontend | Separate deployment |
| Cold starts | ~50ms | ~200ms |
| Dev experience | `vercel dev` | Manual setup |
| Domain | Same as frontend | Different subdomain |
| CORS | Not needed | Need to configure |
| Cost | Included in Vercel | Separate billing |

Since you're already on Vercel, use Vercel Functions!

### Q: What about serverless functions (Vercel, Netlify)?

**A:** ✅ YES! You're deploying to Vercel, so use **Vercel Serverless Functions**:

**Vercel Setup (this implementation):**
```
api/
  └── email/
      └── send.js  (serverless function)
```

This is included in your Vercel deployment - no separate server needed!

**Why Vercel Functions are better:**
- Same deployment as frontend
- One terminal for dev (`vercel dev`)
- No CORS issues (same domain)
- Automatic HTTPS
- Free tier includes 100GB bandwidth
- Scales automatically

### Q: How is this different from the buyer portal?

**Comparison:**

| Aspect | Buyer Portal | Seller Portal (Vercel) |
|--------|--------------|------------------------|
| Framework | Next.js | Vite + React |
| Backend | Built-in API Routes | Vercel Serverless Functions |
| API Key Location | `.env.local` (server) | Vercel Dashboard (environment) |
| Frontend Env | No API key needed | No API key needed |
| CORS | Not needed (same server) | Not needed (same domain) |
| Deployment | Single app | **Single app** ✅ |
| Dev Terminal | One terminal | **One terminal** ✅ |

### Q: What environment variables go where?

**Frontend `.env` (Vite variables - safe):**
```env
VITE_ADMIN_EMAIL="admin@example.com"
VITE_SUPABASE_URL="https://..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
# NO API KEYS HERE!
```

**Vercel Dashboard → Environment Variables (server-side - SECRET):**
```env
RESEND_API_KEY="re_xxx..."  # SECRET!
SUPABASE_SERVICE_ROLE_KEY="xxx..."  # SECRET!
RESEND_FROM_EMAIL="support@trupromart.com"
RESEND_TESTING_MODE="false"
SUPABASE_URL="https://..."
```

**Important:** Server-side vars are **NEVER** exposed to the browser!

### Q: How do we deploy this in production?

**A:** Super simple with Vercel:

**Step 1:** Push code to GitHub
```bash
git add api/ src/ vercel.json
git commit -m "Add email functionality"
git push
```

**Step 2:** Configure Vercel Dashboard
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add server-side env vars (RESEND_API_KEY, etc.)
4. Deploy!

**Step 3:** Done! 
- Frontend: `https://seller.trupromart.com`
- API: `https://seller.trupromart.com/api/email/send`

**That's it!** Vercel automatically:
- Builds your Vite app
- Deploys serverless functions
- Configures routing
- Sets up HTTPS
- Enables auto-scaling

### Q: Is this architecture more complex than buyer portal?

**A:** No! It's actually **very similar** now:

**Buyer Portal (Next.js):**
```
Frontend → Next.js API Route (server-side) → Resend
```

**Seller Portal (Vite + Vercel):**
```
Frontend → Vercel Function (server-side) → Resend
```

Both have:
- ✅ Single deployment
- ✅ One terminal for dev
- ✅ API key on server-side
- ✅ Same domain (no CORS)

**The only difference:**
- Next.js: `src/app/api/` routes
- Vite + Vercel: `api/` directory

Everything else is **exactly the same**!

### Q: Can we share the email API between buyer and seller portals?

**A:** Not recommended:

- Buyer portal doesn't need it (has Next.js API routes)
- Better to keep deployments independent
- Different scaling needs
- Different update cycles

Keep them separate for maintainability.

### Q: What's the complete request flow?

```
1. User clicks "Mark as Shipped" in Seller Portal
   ↓
2. React component calls generateOrderShippedEmail()
   ↓
3. Component calls sendEmail() from email-service.ts
   ↓
4. HTTP POST to /api/email/send (same domain!)
   ↓
5. Vercel routes to api/email/send.js serverless function
   ↓
6. Function validates request
   ↓
7. Function calls Resend API using process.env.RESEND_API_KEY
   ↓
8. Function logs to Supabase using SUPABASE_SERVICE_ROLE_KEY
   ↓
9. Function returns { success: true, messageId: "..." }
   ↓
10. Frontend receives response (or error)
    ↓
11. Frontend shows toast notification
```

### Q: What if the Vercel function fails?

**A:** Email sending will fail, but your app continues working:

```typescript
sendEmail({...}).catch(err => {
  console.error('Email failed but order status updated:', err);
  // Don't show error to user - email is not critical
});
```

Key principle: **Email is non-blocking** - main operations should never fail because email failed.

Vercel Functions are highly reliable:
- 99.99% uptime
- Automatic retries
- Error logging in Vercel dashboard

### Q: How do we test this locally?

**Option 1: Quick Dev (Frontend only)**
```bash
npm run dev
# Frontend on http://localhost:5173
# Email API won't work (use for UI development)
```

**Option 2: Full Dev (Frontend + API) - RECOMMENDED**
```bash
npm install -g vercel
npm install concurrently --save-dev
npm run dev:full
# Runs both Vite (:5173) and Vercel dev (:3000) in ONE terminal
# Email API works via /api/email/send
```

**Option 3: Vercel Dev Only**
```bash
vercel dev
# Everything on http://localhost:3000
# Slower but most accurate to production
```

**Test the API:**
```bash
curl -X POST http://localhost:5173/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "alertType": "order_shipped",
    "recipientEmail": "test@example.com",
    "recipientType": "buyer",
    "subject": "Test Email",
    "htmlContent": "<h1>Test</h1>"
  }'
```

---

**Last Updated:** December 6, 2025
**Status:** ✅ **IMPLEMENTATION COMPLETE** - All admin notifications integrated
**Deployment:** Single deployment, one terminal ✅
**Next Phase:** Testing & Production deployment

## Implementation Status

### ✅ Phase 1-5: Infrastructure & Order Emails (COMPLETE)
- ✅ Vercel serverless functions configured
- ✅ Email service integrated
- ✅ Database logging working
- ✅ Order shipped email (tested, working)
- ✅ Order delivered email (tested, working)
- ✅ Order cancelled email (tested, working)

### ✅ Phase 6: Admin Notifications (COMPLETE - Dec 6, 2025)

#### Admin Email Templates Created
1. **admin-seller-kyc-submitted.ts** - KYC document submission notification
   - Shows seller details, business name, submitted documents
   - Lists all uploaded documents (selfie, aadhaar, pan, gstin)
   - Review CTA with dashboard link
   - Severity alert for action required

2. **admin-dispute-raised.ts** - Dispute notification with severity levels
   - Dynamic severity styling (low/medium/high/critical)
   - Full dispute details and description
   - Shows related order/product context
   - Evidence indicators (images/video)
   - Review CTA with dashboard link

#### Admin Email Helpers Created
1. **admin-kyc-submitted.ts** - Sends KYC notification to admin
   - Uses `admin_seller_kyc_submitted` alert type
   - Links to seller via `relatedSellerId`
   - Metadata includes document count and types

2. **admin-dispute-raised.ts** - Sends dispute notification to admin
   - Uses `admin_dispute_raised` alert type
   - Links dispute via `relatedEntityId`
   - Metadata includes severity, type, evidence info

#### Integration Points
1. **src/pages/KYC.tsx** (Line ~494)
   - ✅ Sends admin email after successful KYC submission
   - ✅ Includes all submitted documents
   - ✅ Uses seller business name or email
   - ✅ Non-fatal error handling

2. **src/pages/auth/SignUp.tsx** (Line ~231)
   - ✅ Sends welcome email to new seller
   - ✅ Sends admin notification about new registration
   - ✅ Uses existing welcome-seller and admin-new-seller helpers
   - ✅ Non-fatal error handling

3. **src/components/SellerRaiseDispute.tsx** (Line ~189)
   - ✅ Sends admin email after dispute created
   - ✅ Fetches seller details from database
   - ✅ Includes order/product context
   - ✅ Shows evidence and video availability
   - ✅ Non-fatal error handling

#### Database Schema Verification
All implementations verified against `supabase_schema_6dec.sql`:

**Sellers Table:**
- ✅ `id` (UUID) - used as `sellerId`
- ✅ `business_name` - used in templates
- ✅ `name` - fallback for business_name
- ✅ `email` - used for notifications
- ✅ `business_type` ENUM: ['proprietorship', 'partnership', 'private_ltd', 'public_ltd', 'llp', 'trust', 'ngo', 'individual', 'other']

**Disputes Table:**
- ✅ `dispute_id` (UUID) - used in emails
- ✅ `subject` - displayed in template
- ✅ `description` - full text in template
- ✅ `severity` ENUM: ['low', 'medium', 'high', 'critical'] - matches our types
- ✅ `reporter_id` - references sellers.id
- ✅ `evidence_urls` (text) - checked for hasEvidence
- ✅ `video_url` (text) - checked for hasVideo

**Seller Documents Table:**
- ✅ `doc_type` ENUM: ['pan', 'aadhaar', 'selfie', 'cancel_cheque', 'gst_certificate']
- ✅ Matches document types in KYC submission

**Email Notifications Table:**
- ✅ `alert_type` includes: 'admin_seller_kyc_submitted', 'admin_dispute_raised'
- ✅ `related_seller_id` (UUID) - used to link notifications
- ✅ `related_entity_id` (UUID) - used for dispute_id

#### Environment Configuration
- ✅ `VITE_ADMIN_EMAIL` configured in `.env`
- ✅ Admin email: `devops-team@theproductworks.in`
- ✅ Testing mode active: All emails redirect to admin
- ✅ Templates use env variable with fallback: `import.meta.env.VITE_ADMIN_EMAIL || 'admin@trupromart.com'`

#### Error Handling
All integrations use non-fatal error handling:
```typescript
try {
  await sendAdminEmail({...});
  console.log('[Source] Admin notification sent');
} catch (emailError) {
  console.error('[Source] Failed to send admin notification:', emailError);
  // Non-fatal - don't block user flow
}
```

This ensures:
- User operations complete successfully even if email fails
- Errors are logged for debugging
- No user-facing errors for email failures
- Toast notifications proceed normally

### Remaining Work
- ⏭️ Refund email integrations (refund-initiated, refund-completed)
- ⏭️ Production testing
- ⏭️ Environment variable configuration for production
- ⏭️ Documentation updates

