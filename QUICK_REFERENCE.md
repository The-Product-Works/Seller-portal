# Quick Reference Guide - Order Management System

## 🚀 Quick Start

### Access New Features
```typescript
// Import components
import { OrderDetails } from '@/components/OrderDetails';
import { HealthScoreDashboard } from '@/components/HealthScoreDashboard';

// Use in pages
<OrderDetails orderId={orderId} sellerId={sellerId} />
<HealthScoreDashboard sellerId={sellerId} />
```

---

## 📊 Component APIs

### OrderDetails Component
```typescript
interface OrderDetailsProps {
  orderId: string;        // Order ID to display
  sellerId: string;       // Seller ID (for auth)
}

<OrderDetails orderId="abc-123" sellerId="seller-456" />
```

**Features**:
- View tracking information
- See status history
- Manage returns
- Process refunds
- Cancel orders (if pending)

### HealthScoreDashboard Component
```typescript
interface HealthScoreDashboardProps {
  sellerId?: string | null;  // Seller ID (optional)
}

<HealthScoreDashboard sellerId="seller-456" />
```

**Features**:
- Display health score (0-100)
- Show metric breakdown
- Provide recommendations
- Track performance trends

---

## 🗄️ Database Tables Reference

### order_status_history
```sql
SELECT * FROM order_status_history WHERE order_id = 'xxx';
-- Shows: old_status → new_status, remarks, timestamp
```

### order_tracking
```sql
SELECT * FROM order_tracking WHERE order_id = 'xxx' 
ORDER BY updated_at DESC;
-- Shows: tracking URL, status, location, notes
```

### return_quality_checks
```sql
SELECT * FROM return_quality_checks WHERE return_id = 'xxx';
-- Shows: result (passed/failed), remarks, performed_by
```

### return_tracking
```sql
SELECT * FROM return_tracking WHERE return_id = 'xxx'
ORDER BY updated_at DESC;
-- Shows: return status, location, notes
```

---

## 🔄 Common Workflows

### Cancel an Order
```typescript
// 1. Call handleCancelOrder in OrderDetails component
// 2. User enters reason in dialog
// 3. Order status → "cancelled"
// 4. Entry created in order_status_history
// 5. Buyer receives notification with reason
```

### Add Tracking Information
```typescript
// 1. Seller clicks "Add Tracking" button
// 2. Enter tracking URL (e.g., https://courier.com/track?id=ABC123)
// 3. Select status (shipped, in_transit, out_for_delivery, delivered)
// 4. Optional: Add location and notes
// 5. Tracking saved to order_tracking table
```

### Handle Return Request
```typescript
// 1. Buyer initiates return (creates order_return entry)
// 2. Seller sees return alert
// 3. Click "Approve" or "Reject"
// 4. If Approve:
//    - QC check added (passed/failed)
//    - Refund issued if passed
//    - Return tracking added
// 5. If Reject:
//    - Reason provided to buyer
//    - No refund issued
```

---

## 📈 Health Score Calculation

### Formula Breakdown
| Component | Points | Formula |
|-----------|--------|---------|
| Fulfillment Rate | 40 | (successful_orders / total) × 40 |
| Return Rate | 25 | 25 - (return_rate × 0.25) |
| Cancellation Rate | 20 | 20 - (cancellation_rate × 0.20) |
| Product Activity | 10 | 10 if active > 0, else 5 |
| Response Time | 5 | Fixed 5 points |
| **Total** | **100** | **Sum of all components** |

### Score Interpretation
- **90-100**: Excellent (Green) ✨
- **75-89**: Good (Blue) ✓
- **60-74**: Fair (Yellow) ⚠️
- **<60**: Needs Improvement (Red) ❌

---

## 🔒 Security & Access

### Row-Level Security
- Sellers can only access their own orders
- Admins can audit all orders
- Delete operations cascade properly

### Validation Rules
| Field | Validation |
|-------|-----------|
| Cancellation Reason | Required, min 10 chars |
| Tracking URL | Required, valid URL format |
| QC Result | Must be 'passed' or 'failed' |
| Refund Amount | Must be positive number |

---

## 📱 UI Components Used

### Status Badges
```
pending → yellow clock icon
processing → blue checkmark
shipped → purple truck
delivered → green checkmark
return_requested → orange rotate
cancelled → red X
```

### Action Buttons
| Status | Available Actions |
|--------|------------------|
| pending | Cancel Order |
| processing | Cancel Order |
| shipped | Add Tracking, Return Request |
| delivered | Add Tracking, Return Request |
| cancelled | None |

---

## 🐛 Troubleshooting

### Health Score Not Updating
**Solution**: Component recalculates on `sellerId` change. Try refreshing or checking seller ID.

### Tracking URL Not Saving
**Solution**: Ensure URL is valid and starts with http:// or https://

### Can't Approve Return
**Solution**: Check return status is "initiated" and you have seller permissions.

### RLS Policy Error
**Solution**: Verify user is logged in and has seller record created.

### Build Error
**Solution**: Run `npm run build` to see detailed error. Check TypeScript types are correct.

---

## 📋 Testing Checklist

```
□ Create test order
□ Cancel pending order (verify status history)
□ Add tracking information (verify buyer can see)
□ Initiate return request
□ Approve return (verify QC workflow)
□ Reject return (verify reason saved)
□ Check health score calculation
□ Verify all dialogs work
□ Test mobile responsiveness
□ Check error handling
```

---

## 🎯 Key Metrics to Monitor

### Health Score Components
- **Fulfillment Rate**: Aim for >95%
- **Return Rate**: Target <5%
- **Cancellation Rate**: Keep <3%
- **Active Products**: Minimum 5 products
- **Response Time**: <24 hours

### Order Metrics
- **Average Order Value**: Track trends
- **Orders Per Day**: Monitor growth
- **Return Rate**: Identify issues
- **Cancellation Rate**: Reduce friction

---

## 💡 Best Practices

1. **Always provide reasons** for cancellations and return rejections
2. **Update tracking promptly** to reduce support tickets
3. **Approve returns quickly** to maintain good ratings
4. **Monitor health score** weekly for trends
5. **Address low-scoring** areas proactively

---

## 🔗 Related Components

- `Dashboard.tsx` - Main seller dashboard
- `SellerOrders.tsx` - Order list view
- `BestWorstSelling.tsx` - Sales analytics
- `DashboardProductStock.tsx` - Inventory management
- `LowStockNotifications.tsx` - Stock alerts

---

## 📞 Support

For issues or questions:
1. Check SESSION_SUMMARY.md for detailed docs
2. Review ORDER_MANAGEMENT_UPDATE.md for technical details
3. Check inline code comments
4. Run build to verify zero errors

---

**Last Updated**: November 8, 2025
**Version**: 2.0.0
**Status**: Production Ready ✅
