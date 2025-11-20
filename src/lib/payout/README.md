# Seller Payout System

This folder contains the complete seller payout integration for the seller portal.

## 📁 Files

- **`initialize-balance.ts`** - Creates initial balance record for sellers
- **`record-earning.ts`** - Records earnings and updates seller balances
- **`delivery-handler.ts`** - Main integration point (handles the complete payout flow)
- **`index.ts`** - Export file for easy imports

## 🚀 How It Works

### Automatic Integration

The payout system is **automatically triggered** when an order item is marked as "delivered":

1. **Orders Page** (`src/pages/Orders.tsx`) - When seller changes status to "delivered"
2. **Order Details Page** (`src/pages/OrderDetails.tsx`) - When seller marks order as "delivered"

### What Happens Automatically

When `processDeliveryForPayout()` is called:

1. ✅ **Duplicate Check** - Ensures earning isn't recorded twice
2. ✅ **Fetch Details** - Gets order, payment, and fee information
3. ✅ **Calculate Fees** - Proportionally splits Razorpay fees for multi-seller orders
4. ✅ **Settlement Date** - Applies 3-order hold rule:
   - First 3 orders → Settlement on 28th of **next month**
   - 4th order onwards → Settlement on 28th of **current month**
5. ✅ **Record Earning** - Creates payout item record
6. ✅ **Update Balance** - Adds to `pending_balance` or `available_balance`
7. ✅ **Log Transaction** - Creates audit trail

## 💰 Database Tables Used

### Written To:
- `seller_payout_items` - Individual order earning records
- `seller_balances` - Seller balance summary
- `seller_balance_transactions` - Transaction history/audit trail

### Read From:
- `order_items` - Order details
- `orders` - Order information
- `payments` - Payment and fee information

## 📊 Fee Calculation Example

```
Total Order: ₹10,000
Razorpay Fee: ₹240
Your Item: ₹4,000 (40% of order)

Your Allocated Fee: ₹96 (40% of ₹240)
Your Net Earning: ₹4,000 - ₹96 = ₹3,904
```

## 🔒 Settlement Hold Rule

**New sellers (first 3 orders):**
- Buffer against potential refunds
- Orders held until next month's 28th

**Established sellers (4th order+):**
- Immediate settlement eligibility
- Available on current month's 28th

## 🛠️ Manual Usage (if needed)

```typescript
import { processDeliveryForPayout } from '@/lib/payout';

// Manually trigger payout processing
const result = await processDeliveryForPayout({
  orderItemId: 'uuid-here',
  sellerId: 'uuid-here'
});

if (result.success) {
  console.log('✅', result.message);
} else {
  console.error('❌', result.message);
}
```

## 🐛 Error Handling

The system is designed to **never block order delivery**:

- If payout processing fails, the order still marks as delivered
- Errors are logged to console
- Failed payouts can be manually reconciled from transaction logs
- All operations are idempotent (safe to retry)

## 📈 Viewing Earnings

Sellers can view their earnings at `/earnings` page which shows:

- Available balance (ready for withdrawal)
- Pending balance (awaiting settlement)
- Transaction history
- Pending settlements with dates
- Settled items
- Refunded items

## ✅ Integration Complete

The payout system is **fully integrated** and will automatically:
- ✅ Record earnings when orders are delivered
- ✅ Calculate and allocate fees correctly
- ✅ Apply settlement hold rules
- ✅ Update seller balances in real-time
- ✅ Create complete audit trails

No additional configuration needed - it works automatically! 🎉
