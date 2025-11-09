# Orders.tsx and OrderDetails.tsx Migration Summary

## Critical Changes Made:

### 1. Created Helper File (`src/lib/order-item-helpers.ts`)
This file contains all the new query functions that work with order_items table:
- `fetchSellerOrderItems()` - Replaces old orders query
- `fetchOrderItemDetails()` - Gets single order item with full details
- `updateOrderItemStatus()` - Updates status on order_items table
- `addOrderItemStatusHistory()` - Adds history using order_item_id
- `addOrderItemTracking()` - Adds tracking using order_item_id
- `createOrderItemReturn()` - Creates return using order_item_id
- `cancelOrderItem()` - Creates cancellation using order_item_id
- `createOrderItemRefund()` - Creates refund using order_item_id

### 2. Orders.tsx Changes Required:

#### Type Definitions:
```typescript
// OLD:
interface OrderWithDetails {
  order_id: string;
  seller_id: string;
  status: string;
  ...
}

// NEW:
interface OrderItemWithDetails {
  order_item_id: string;
  order_id: string;
  seller_id: string;
  status: string | null;  // Now from order_items
  ...
}
```

#### Load Orders Function:
```typescript
// OLD:
const { data } = await supabase
  .from("orders")
  .select("...")
  .eq("seller_id", sellerId);

// NEW:
import { fetchSellerOrderItems } from "@/lib/order-item-helpers";

const { data } = await fetchSellerOrderItems(sellerId, {
  status: statusFilter,
  searchQuery,
  dateFrom,
  dateTo,
  limit: ordersPerPage,
  offset: (currentPage - 1) * ordersPerPage
});
```

#### Status Update Functions:
```typescript
// OLD:
await supabase
  .from("orders")
  .update({ status: newStatus })
  .eq("order_id", selectedOrder.order_id);

// NEW:
import { updateOrderItemStatus, addOrderItemStatusHistory } from "@/lib/order-item-helpers";

await updateOrderItemStatus(selectedOrder.order_item_id, newStatus);
await addOrderItemStatusHistory(
  selectedOrder.order_item_id,
  selectedOrder.status || "pending",
  newStatus,
  sellerId
);
```

#### Navigation:
```typescript
// OLD:
navigate(`/order/${order.order_id}`);

// NEW:
navigate(`/order-item/${order.order_item_id}`);
// OR pass both IDs:
navigate(`/order/${order.order_id}/item/${order.order_item_id}`);
```

#### Table Display:
```tsx
// Add order_item_id column
<TableCell>{order.order_item_id.slice(0, 8)}</TableCell>
<TableCell>{order.order_id.slice(0, 8)}</TableCell>
```

### 3. OrderDetails.tsx Changes Required:

#### Route Update (in router file):
```typescript
// OLD:
{ path: "/order/:orderId", element: <OrderDetails /> }

// NEW:
{ path: "/order-item/:orderItemId", element: <OrderDetails /> }
// OR:
{ path: "/order/:orderId/item/:orderItemId", element: <OrderDetails /> }
```

#### Component Changes:
```typescript
// OLD:
const { orderId } = useParams<{ orderId: string }>();

// NEW:
const { orderItemId } = useParams<{ orderItemId: string }>();

// OR if keeping both:
const { orderId, orderItemId } = useParams<{ orderId?: string; orderItemId: string }>();
```

#### Data Loading:
```typescript
// OLD:
const { data: orderData } = await supabase
  .from("orders")
  .select("*")
  .eq("order_id", orderId)
  .eq("seller_id", sellerId)
  .single();

// NEW:
import { fetchOrderItemDetails, fetchOrderItemTracking, fetchOrderItemReturns, ... } from "@/lib/order-item-helpers";

const orderItemData = await fetchOrderItemDetails(orderItemId, sellerId);
const tracking = await fetchOrderItemTracking(orderItemId);
const returns = await fetchOrderItemReturns(orderItemId);
const cancellations = await fetchOrderItemCancellations(orderItemId);
const refunds = await fetchOrderItemRefunds(orderItemId);
const statusHistory = await fetchOrderItemStatusHistory(orderItemId);
```

#### Status Update:
```typescript
// OLD:
const updateOrderStatus = async (newStatus: string) => {
  await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("order_id", orderId);
    
  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, ... });
};

// NEW:
const updateOrderStatus = async (newStatus: string) => {
  await updateOrderItemStatus(orderItemId, newStatus);
  await addOrderItemStatusHistory(orderItemId, orderItem.status, newStatus, sellerId);
};
```

#### Mark as Packed/Shipped/Delivered:
```typescript
// OLD:
const handleMarkAsPacked = async () => {
  await supabase.from("order_tracking").insert({
    order_id: orderId,
    status: "packed",
    ...
  });
  
  await supabase.from("orders").update({
    status: "packed",
    ...
  }).eq("order_id", orderId);
};

// NEW:
const handleMarkAsPacked = async () => {
  await addOrderItemTracking(orderItemId, "packed", trackingUrl, location, notes);
  await updateOrderItemStatus(orderItemId, "packed", { /* additional fields */ });
  await addOrderItemStatusHistory(orderItemId, orderItem.status, "packed", sellerId);
};
```

#### Cancel Order:
```typescript
// OLD:
const handleCancelOrder = async () => {
  await supabase.from("order_cancellations").insert({
    order_id: orderId,
    ...
  });
  
  await supabase.from("orders").update({ status: "cancelled" }).eq("order_id", orderId);
};

// NEW:
const handleCancelOrder = async () => {
  await cancelOrderItem(orderItemId, sellerId, "seller", cancelReason);
  await updateOrderItemStatus(orderItemId, "cancelled");
  await addOrderItemStatusHistory(orderItemId, orderItem.status, "cancelled", sellerId, cancelReason);
};
```

#### Return Handling:
```typescript
// OLD:
await supabase.from("order_returns").insert({
  order_id: orderId,
  order_item_id: itemId,
  ...
});

// NEW:
await createOrderItemReturn(orderItemId, buyerId, sellerId, reason, returnType);
```

### 4. State Management Changes:

#### OLD State:
```typescript
const [order, setOrder] = useState<Order | null>(null);
```

#### NEW State:
```typescript
const [orderItem, setOrderItem] = useState<OrderItem | null>(null);
const [order, setOrder] = useState<Order | null>(null);  // Parent order for buyer/address info
```

### 5. Display Changes:

#### OLD:
```tsx
<h1>Order #{order.order_id.slice(0, 8)}</h1>
<Badge>{order.status}</Badge>
```

#### NEW:
```tsx
<h1>Order Item #{orderItem.order_item_id.slice(0, 8)}</h1>
<p>Order: #{order.order_id.slice(0, 8)}</p>
<Badge>{orderItem.status}</Badge>
```

## Step-by-Step Migration Process:

1. ✅ Create `order-item-helpers.ts` with all new query functions
2. ⏳ Update Orders.tsx:
   - Import new helpers
   - Change interface from OrderWithDetails to OrderItemWithDetails
   - Update loadOrders() to use fetchSellerOrderItems()
   - Update all status change handlers
   - Update navigation to pass order_item_id
   - Update table to display order_item_id
3. ⏳ Update OrderDetails.tsx:
   - Change route param from orderId to orderItemId
   - Import new helpers
   - Update loadOrderDetails() to fetch order_item
   - Update all status update functions
   - Update tracking, returns, cancellations to use order_item_id
   - Update UI to show both order_id and order_item_id
4. ⏳ Update router configuration
5. ⏳ Test all flows

## Files to Update:
- ✅ `src/lib/order-item-helpers.ts` (CREATED)
- ⏳ `src/pages/Orders.tsx` (NEEDS UPDATE)
- ⏳ `src/pages/OrderDetails.tsx` (NEEDS UPDATE)
- ⏳ Router file (NEEDS UPDATE)

## Testing Checklist:
- [ ] Seller can view all their order items
- [ ] Status filters work correctly
- [ ] Search by order_id and order_item_id works
- [ ] Date filters work
- [ ] Pagination works
- [ ] Can navigate to order item details
- [ ] Can mark as packed/shipped/delivered
- [ ] Tracking is created correctly
- [ ] Status history is logged
- [ ] Can cancel order item
- [ ] Returns work correctly
- [ ] Refunds work correctly
- [ ] QC flows work for returns
