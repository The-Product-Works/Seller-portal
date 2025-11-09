# Order Schema Migration Guide

## Schema Changes Summary

### What Changed:
1. **Removed from `orders` table:**
   - `status` column
   - `seller_id` column

2. **`order_items` table now has:**
   - `seller_id` column
   - `status` column

3. **All related tables now use `order_item_id` instead of `order_id`:**
   - `order_cancellations` - uses `order_item_id`
   - `order_refunds` - uses `order_item_id`
   - `order_returns` - uses `order_item_id`
   - `order_status_history` - uses `order_item_id`
   - `order_tracking` - uses `order_item_id`

## Rationale:
- One order can contain multiple items from different sellers
- Each item should have its own status tracking
- Each item should be independently cancellable, returnable, refundable

## Required Code Changes:

### Orders.tsx
- **Query Change:** Query `order_items` table filtered by `seller_id` instead of `orders` table
- **Status Filter:** Apply status filter on `order_items.status` instead of `orders.status`
- **Display:** Show order_item_id alongside order_id
- **Actions:** Update status on specific order_item, not entire order
- **Navigation:** Navigate to `/order-item/{order_item_id}` or pass order_item_id as parameter

### OrderDetails.tsx  
- **Route Param:** Accept `orderItemId` instead of `orderId` (or both)
- **Query:** Load specific `order_item` by `order_item_id` and verify `seller_id`
- **Related Data:** Query tracking, returns, refunds, cancellations, status_history using `order_item_id`
- **Updates:** All status updates go to `order_items` table
- **Tracking:** Insert tracking records with `order_item_id`
- **Returns:** Create return records with `order_item_id`
- **Cancellations:** Create cancellation records with `order_item_id`

## Database Queries:

### Old Query (Orders.tsx):
```sql
SELECT * FROM orders WHERE seller_id = ?
```

### New Query (Orders.tsx):
```sql
SELECT 
  oi.*,
  o.buyer_id, o.address_id, o.total_amount, o.shipping_cost,
  o.discount_amount, o.final_amount, o.payment_status,
  spl.seller_title,
  lv.variant_name, lv.sku
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id  
LEFT JOIN seller_product_listings spl ON oi.listing_id = spl.listing_id
LEFT JOIN listing_variants lv ON oi.variant_id = lv.variant_id
WHERE oi.seller_id = ?
```

### Old Query (OrderDetails.tsx):
```sql
SELECT * FROM orders WHERE order_id = ? AND seller_id = ?
```

### New Query (OrderDetails.tsx):
```sql
SELECT 
  oi.*,
  o.*
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
WHERE oi.order_item_id = ? AND oi.seller_id = ?
```

## Status Update Pattern:

### Old:
```javascript
await supabase
  .from("orders")
  .update({ status: newStatus })
  .eq("order_id", orderId);

await supabase
  .from("order_status_history")
  .insert({ order_id: orderId, ... });
```

### New:
```javascript
await supabase
  .from("order_items")
  .update({ status: newStatus })
  .eq("order_item_id", orderItemId);

await supabase
  .from("order_status_history")
  .insert({ order_item_id: orderItemId, ... });
```

## Tracking Pattern:

### Old:
```javascript
await supabase
  .from("order_tracking")
  .insert({ order_id: orderId, status, url, ... });
```

### New:
```javascript
await supabase
  .from("order_tracking")
  .insert({ order_item_id: orderItemId, status, url, ... });
```

## Returns Pattern:

### Old:
```javascript
await supabase
  .from("order_returns")
  .insert({ order_id: orderId, order_item_id, ... });
```

### New:
```javascript
await supabase
  .from("order_returns")
  .insert({ order_item_id: orderItemId, ... });
```

## Implementation Steps:

1. ✅ Update type definitions in Orders.tsx
2. ⏳ Rewrite loadOrders() to query order_items
3. ⏳ Update all status change handlers to work with order_item_id
4. ⏳ Update navigation to pass order_item_id
5. ⏳ Update OrderDetails.tsx route and data loading
6. ⏳ Update all CRUD operations in OrderDetails.tsx
7. ⏳ Test all flows end-to-end
