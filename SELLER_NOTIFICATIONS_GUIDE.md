# Seller Email Notifications - Implementation Guide

## ✅ All 9 Seller Notifications Implemented - NOW WITH DIRECT GMAIL DELIVERY

### 🚀 Latest Updates
- **New Resend API Key:** `re_FJ8AtYR2_DdXyYoLNmGTvonL6WPiQZxK1`
- **Direct Gmail Delivery:** Bypasses Supabase for better reliability
- **Enhanced Button Links:** New Order emails now have proper redirect buttons

### Overview
All seller email notifications are now ready to use. Each notification has:
- ✅ Beautiful HTML email template
- ✅ Easy-to-use helper function
- ✅ TypeScript type definitions
- ✅ Direct Resend API integration for Gmail delivery

---

## 🔧 Setup (Already Done!)

**Resend Configuration:**
```env
# Updated Configuration - Direct Gmail Delivery
RESEND_API_KEY="re_FJ8AtYR2_DdXyYoLNmGTvonL6WPiQZxK1"
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

**🎯 Direct Email Delivery:**
- No Supabase Edge Function required
- Sends directly to Gmail
- Better delivery rates and reliability

---

## 📧 How to Use Each Notification

### 1. New Order Received

**When to send:** When seller receives a new order

**Usage Example:**
```typescript
import { sendNewOrderNotification } from '@/lib/email/helpers/seller-notifications';

await sendNewOrderNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    orderNumber: "ORD-2025-001",
    orderDate: "Nov 22, 2025, 10:30 AM",
    totalAmount: 2499.00,
    itemCount: 3,
    items: [
      {
        productName: "Wireless Headphones",
        quantity: 2,
        price: 999.00
      },
      {
        productName: "Phone Case",
        quantity: 1,
        price: 499.00
      }
    ],
    buyerName: "Sarah Kumar",
    shippingAddress: "123 Main St\nMumbai, MH 400001\nIndia",
    dashboardUrl: "https://yourapp.com/seller/orders/ORD-2025-001"
  }
);
```

---

### 2. Order Cancelled by Buyer

**When to send:** When buyer cancels an order

**Usage Example:**
```typescript
import { sendOrderCancelledNotification } from '@/lib/email/helpers/seller-notifications';

await sendOrderCancelledNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    orderNumber: "ORD-2025-001",
    cancelledDate: "Nov 22, 2025, 2:15 PM",
    orderAmount: 2499.00,
    cancellationReason: "Changed my mind about the purchase",
    buyerName: "Sarah Kumar",
    items: [
      {
        productName: "Wireless Headphones",
        quantity: 2
      }
    ]
  }
);
```

---

### 3. Return Request Received

**When to send:** When buyer initiates a return

**Usage Example:**
```typescript
import { sendReturnRequestNotification } from '@/lib/email/helpers/seller-notifications';

await sendReturnRequestNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    orderNumber: "ORD-2025-001",
    returnRequestDate: "Nov 22, 2025, 3:45 PM",
    returnReason: "Product damaged during shipping",
    productName: "Wireless Headphones",
    quantity: 1,
    orderAmount: 999.00,
    buyerName: "Sarah Kumar",
    buyerComments: "The box was crushed and the headphones have visible scratches",
    videoUrl: "https://yourapp.com/returns/video/abc123",
    dashboardUrl: "https://yourapp.com/seller/returns/RTN-001"
  }
);
```

---

### 4. Refund Completed

**When to send:** After refund is successfully processed

**Usage Example:**
```typescript
import { sendRefundCompletedNotification } from '@/lib/email/helpers/seller-notifications';

await sendRefundCompletedNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    orderNumber: "ORD-2025-001",
    refundDate: "Nov 22, 2025, 5:00 PM",
    refundAmount: 999.00,
    productName: "Wireless Headphones",
    quantity: 1,
    buyerName: "Sarah Kumar",
    refundId: "RFD-2025-001"
  }
);
```

---

### 5. Low Stock Alert

**When to send:** When product stock reaches threshold (e.g., < 10 units)

**Usage Example:**
```typescript
import { sendLowStockAlert } from '@/lib/email/helpers/seller-notifications';

await sendLowStockAlert(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    productName: "Wireless Headphones",
    currentStock: 5,
    threshold: 10,
    sku: "SKU-WH-001",
    productUrl: "https://yourapp.com/products/wireless-headphones",
    dashboardUrl: "https://yourapp.com/seller/inventory"
  }
);
```

---

### 6. Product Out of Stock

**When to send:** When product inventory hits zero

**Usage Example:**
```typescript
import { sendOutOfStockAlert } from '@/lib/email/helpers/seller-notifications';

await sendOutOfStockAlert(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    productName: "Wireless Headphones",
    sku: "SKU-WH-001",
    lastSoldDate: "Nov 22, 2025, 4:30 PM",
    totalSoldLast30Days: 45,
    productUrl: "https://yourapp.com/products/wireless-headphones",
    dashboardUrl: "https://yourapp.com/seller/inventory"
  }
);
```

---

### 7. Account Approved

**When to send:** After KYC verification is approved

**Usage Example:**
```typescript
import { sendAccountApprovedNotification } from '@/lib/email/helpers/seller-notifications';

await sendAccountApprovedNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John Doe",
    businessName: "John's Electronics Store",
    approvalDate: "Nov 22, 2025",
    sellerId: "SELLER-2025-001",
    dashboardUrl: "https://yourapp.com/seller/dashboard",
    inventoryUrl: "https://yourapp.com/seller/inventory",
    supportUrl: "https://yourapp.com/support"
  }
);
```

---

### 8. New Review/Rating

**When to send:** When buyer submits a rating or review

**Usage Example:**
```typescript
import { sendNewReviewNotification } from '@/lib/email/helpers/seller-notifications';

await sendNewReviewNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    rating: 5, // 1-5 stars
    reviewTitle: "Excellent Product!",
    reviewText: "The headphones are amazing! Great sound quality and very comfortable to wear. Highly recommended!",
    reviewerName: "Sarah Kumar",
    productName: "Wireless Headphones",
    reviewDate: "Nov 22, 2025",
    orderNumber: "ORD-2025-001",
    dashboardUrl: "https://yourapp.com/seller/reviews"
  }
);
```

---

### 9. Payout Processed

**When to send:** When earnings transfer is completed

**Usage Example:**
```typescript
import { sendPayoutProcessedNotification } from '@/lib/email/helpers/seller-notifications';

await sendPayoutProcessedNotification(
  sellerId,
  sellerEmail,
  {
    sellerName: "John's Store",
    payoutAmount: 45000.00,
    payoutDate: "Nov 22, 2025",
    payoutId: "PAY-2025-001",
    bankAccountLast4: "1234",
    transferMethod: "Bank Transfer",
    processingFee: 450.00,
    netAmount: 44550.00,
    periodStart: "Nov 1, 2025",
    periodEnd: "Nov 21, 2025",
    orderCount: 127,
    dashboardUrl: "https://yourapp.com/seller/earnings"
  }
);
```

---

## 🔗 Integration Points

### Where to Call These Functions:

1. **New Order Received** → After order is successfully created in database
2. **Order Cancelled** → In order cancellation handler
3. **Return Request** → When return request is submitted
4. **Refund Completed** → After refund transaction completes
5. **Low Stock Alert** → In inventory update hook when stock < threshold
6. **Out of Stock** → In inventory update hook when stock === 0
7. **Account Approved** → In KYC approval admin action
8. **New Review** → After review/rating is submitted
9. **Payout Processed** → In payout processing cron job or webhook

---

## 📁 File Structure

```
src/lib/email/
├── helpers/
│   └── seller-notifications.ts      ✅ All 9 helper functions
└── templates/seller/
    ├── new-order-received.ts         ✅ Template + types
    ├── order-cancelled.ts            ✅ Template + types
    ├── return-request.ts             ✅ Template + types
    ├── refund-completed.ts           ✅ Template + types
    ├── low-stock-alert.ts            ✅ Template + types
    ├── out-of-stock.ts               ✅ Template + types
    ├── account-approved.ts           ✅ Template + types
    ├── new-review.ts                 ✅ Template + types
    └── payout-processed.ts           ✅ Template + types
```

---

## ✅ Testing

All notifications will be sent to `devops-team@theproductworks.in` in testing mode.

**Test any notification:**
```typescript
// Example: Test New Order notification
import { sendNewOrderNotification } from '@/lib/email/helpers/seller-notifications';

const result = await sendNewOrderNotification(
  'test-seller-id',
  'seller@example.com', // Will redirect to devops-team@theproductworks.in
  {
    // ... your test data
  }
);

if (result.success) {
  console.log('✅ Email sent:', result.messageId);
} else {
  console.error('❌ Email failed:', result.error);
}
```

---

## 🎨 Email Features

Each email includes:
- ✅ Beautiful gradient headers
- ✅ Professional card layouts
- ✅ Responsive design (mobile + desktop)
- ✅ Clear call-to-action buttons
- ✅ Contextual color coding (green for positive, red for urgent, etc.)
- ✅ Branded footer
- ✅ Proper spacing and typography

---

## 🚀 Production Deployment

When ready for production:

1. **Verify domain** at resend.com/domains
2. **Update environment variables:**
   ```env
   RESEND_TESTING_MODE="false"
   RESEND_FROM_EMAIL="noreply@yourdomain.com"
   ```
3. **Restart application**
4. **Emails will be sent to actual seller email addresses**

---

## 📊 Notification Summary

| Notification          | Status | Priority | Trigger                    |
|-----------------------|--------|----------|----------------------------|
| New Order Received    | ✅     | High     | Order created              |
| Order Cancelled       | ✅     | Medium   | Buyer cancels              |
| Return Request        | ✅     | High     | Return initiated           |
| Refund Completed      | ✅     | Medium   | Refund processed           |
| Low Stock Alert       | ✅     | Medium   | Stock < threshold          |
| Out of Stock          | ✅     | High     | Stock === 0                |
| Account Approved      | ✅     | High     | KYC approved               |
| New Review            | ✅     | Low      | Review submitted           |
| Payout Processed      | ✅     | High     | Payout transferred         |

---

## 💡 Best Practices

1. **Always check result.success** before assuming email was sent
2. **Don't block user actions** waiting for email - send async
3. **Log email failures** for debugging
4. **Include dashboard URLs** for better engagement
5. **Test each template** before production deployment

---

## 🆘 Support

- **Email Service Issues:** Check `src/lib/email/resend-service.ts`
- **Template Issues:** Check `src/lib/email/templates/seller/`
- **Integration Help:** See code examples above
- **Resend Dashboard:** https://resend.com/emails

---

**Status:** ✅ All seller notifications implemented and ready to use!
**Testing Mode:** Active (emails sent to devops-team@theproductworks.in)
**Production Ready:** Yes (after domain verification)
