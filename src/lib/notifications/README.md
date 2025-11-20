# Seller Notification System

## Overview
This notification system sends email alerts to sellers for important events using Resend API.

## Setup

### 1. Database Migration
Run the migration file to create the `email_notifications` table:
```sql
-- File: supabase/migrations/20251120000001_create_email_notifications.sql
-- Run this in Supabase SQL Editor
```

### 2. Environment Variables
Add these to your `.env` file:
```
VITE_RESEND_API_KEY=re_W4Aw8xPL_5mPNPS2CQPMPWktcvprLbDwh
VITE_RESEND_FROM_EMAIL=onboarding@resend.dev
```

## Implemented Notifications

### ✅ Seller Notifications (Sent from Seller Portal)

1. **Low Stock Alert** (`low_stock_alert`)
   - Triggered when product stock ≤ 10 units
   - Sent automatically on stock update
   - Location: `SimpleRestockDialog.tsx`

2. **Product Out of Stock** (`product_out_of_stock`)
   - Triggered when product stock = 0
   - Sent automatically on stock update
   - Location: `SimpleRestockDialog.tsx`

3. **Payout Processed** (`payout_processed`)
   - Triggered when admin marks payout as "paid"
   - Helper function: `notifyPayoutProcessed()`
   - Location: `lib/notifications/payout-notification.ts`

### 📋 Notifications Not Yet Implemented (Require Admin/Buyer Portal)

4. **New Order Received** (`new_order_received`)
   - Should be triggered when buyer places order
   - Template ready: `getNewOrderEmailTemplate()`

5. **Order Canceled by Buyer** (`order_canceled_by_buyer`)
   - Should be triggered from buyer portal

6. **Return Request Received** (`return_request_received`)
   - Should be triggered from buyer portal
   - Template ready: `getReturnRequestEmailTemplate()`

7. **Refund Completed** (`seller_refund_completed`)
   - Should be triggered when admin completes refund

8. **Account Approved** (`account_approved`)
   - Should be triggered when admin approves KYC

9. **New Review/Rating** (`new_review_rating`)
   - Should be triggered from buyer portal

## Usage Examples

### Sending Low Stock Alert
```typescript
import { sendEmail, getLowStockAlertTemplate } from "@/lib/notifications";

const htmlContent = getLowStockAlertTemplate({
  productName: "Organic Honey",
  currentStock: 8,
  threshold: 10
});

await sendEmail({
  recipientEmail: seller.email,
  recipientId: sellerId,
  recipientType: 'seller',
  alertType: 'low_stock_alert',
  subject: '⚠️ Low Stock Alert: Organic Honey',
  htmlContent,
  relatedProductId: productId,
  relatedSellerId: sellerId
});
```

### Sending Payout Notification
```typescript
import { notifyPayoutProcessed } from "@/lib/notifications";

await notifyPayoutProcessed({
  payoutId: payout.payout_id,
  sellerId: payout.seller_id,
  amount: payout.net_amount,
  transactionId: payout.payment_reference
});
```

### Sending New Order Notification
```typescript
import { sendEmail, getNewOrderEmailTemplate } from "@/lib/notifications";

const htmlContent = getNewOrderEmailTemplate({
  orderNumber: order.order_number,
  orderDate: format(new Date(order.created_at), "PPP"),
  totalAmount: order.total_amount,
  itemCount: order.items.length,
  customerName: buyer.name
});

await sendEmail({
  recipientEmail: seller.email,
  recipientId: sellerId,
  recipientType: 'seller',
  alertType: 'new_order_received',
  subject: `🎉 New Order #${order.order_number}`,
  htmlContent,
  relatedOrderId: order.order_id,
  relatedSellerId: sellerId
});
```

## Database Schema

### email_notifications Table
```sql
- notification_id (UUID, PK)
- notification_type (VARCHAR) - 'email', 'sms', 'push'
- recipient_type (VARCHAR) - 'admin', 'buyer', 'seller'
- recipient_id (UUID) - user_id or seller_id
- recipient_email (TEXT)
- subject (TEXT)
- alert_type (VARCHAR) - Specific notification type
- related_order_id (UUID)
- related_product_id (UUID)
- related_seller_id (UUID)
- related_entity_id (UUID)
- tracking_id (TEXT)
- transaction_id (TEXT)
- sent_at (TIMESTAMP)
- status (VARCHAR) - 'sent', 'delivered', 'failed', 'bounced'
- metadata (JSONB)
- created_at (TIMESTAMP)
```

## Files Structure

```
src/lib/notifications/
├── index.ts                    # Main exports
├── email-service.ts            # Resend API integration
├── email-templates.ts          # HTML email templates
└── payout-notification.ts      # Payout-specific notification
```

## Alert Types

### Seller Notifications
- `new_order_received`
- `order_canceled_by_buyer`
- `return_request_received`
- `seller_refund_completed`
- `low_stock_alert` ✅
- `product_out_of_stock` ✅
- `account_approved`
- `new_review_rating`
- `payout_processed` ✅

### Buyer Notifications
- `order_confirmed`
- `payment_successful`
- `payment_failed`
- `order_shipped`
- `order_delivered`
- `order_cancelled`
- `return_requested`
- `refund_initiated`
- `refund_completed`
- `welcome`
- `profile_updated`

### Admin Notifications
- `admin_payment_failed`
- `admin_order_cancellation`
- `admin_return_request`
- `admin_return_received`
- `admin_dispute_raised`
- `admin_new_seller_registration`
- `admin_seller_kyc_submitted`
- `admin_report_received`

## Next Steps

To complete the notification system:

1. **Apply Database Migration**
   - Open Supabase SQL Editor
   - Run: `supabase/migrations/20251120000001_create_email_notifications.sql`

2. **Implement Buyer/Admin Notifications**
   - Add triggers in buyer portal for order placement, returns, reviews
   - Add triggers in admin portal for KYC approval, refund processing

3. **Configure Resend Domain (Optional)**
   - Set up custom domain in Resend for better deliverability
   - Update `VITE_RESEND_FROM_EMAIL` to use custom domain

4. **Monitor Notifications**
   - Check `email_notifications` table for delivery status
   - Handle failed notifications with retry logic

## Testing

1. Update product stock to trigger low stock alert
2. Set stock to 0 to trigger out of stock alert
3. Admin marks payout as paid to trigger payout notification

All notifications are logged in the `email_notifications` table with delivery status.
