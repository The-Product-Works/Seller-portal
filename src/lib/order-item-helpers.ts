/**
 * Order Items Helper Functions
 * 
 * These helpers work with the new schema where:
 * - order_items table contains seller_id and status
 * - order_cancellations, order_refunds, order_returns, order_status_history, order_tracking
 *   all reference order_item_id instead of order_id
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemUpdate = Database['public']['Tables']['order_items']['Update'];

/**
 * Fetch all order items for a specific seller with full details
 */
export async function fetchSellerOrderItems(sellerId: string, options?: {
  status?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from("order_items")
    .select(`
      *,
      orders!inner (
        buyer_id,
        address_id,
        total_amount,
        shipping_cost,
        discount_amount,
        final_amount,
        payment_status,
        created_at,
        updated_at
      ),
      seller_product_listings (
        seller_title,
        listing_id
      ),
      listing_variants (
        variant_name,
        sku
      )
    `)
    .eq("seller_id", sellerId);

  // Apply filters
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.searchQuery) {
    query = query.or(`order_id.ilike.%${options.searchQuery}%,order_item_id.ilike.%${options.searchQuery}%`);
  }

  if (options?.dateFrom) {
    query = query.gte("created_at", options.dateFrom);
  }

  if (options?.dateTo) {
    query = query.lte("created_at", options.dateTo);
  }

  // Apply pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  query = query.order("created_at", { ascending: false });

  return await query;
}

/**
 * Fetch a single order item with all related data
 */
export async function fetchOrderItemDetails(orderItemId: string, sellerId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select(`
      *,
      orders!inner (
        *
      ),
      seller_product_listings (
        seller_title,
        listing_id
      ),
      listing_variants (
        variant_name,
        sku
      )
    `)
    .eq("order_item_id", orderItemId)
    .eq("seller_id", sellerId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Order item not found");
  }

  return data;
}

/**
 * Update order item status
 */
export async function updateOrderItemStatus(
  orderItemId: string,
  newStatus: string,
  additionalData?: Record<string, any>
) {
  const updateData: OrderItemUpdate = {
    status: newStatus,
    ...additionalData
  };

  const { error } = await supabase
    .from("order_items")
    .update(updateData)
    .eq("order_item_id", orderItemId);

  if (error) throw error;
}

/**
 * Add status history for an order item
 */
export async function addOrderItemStatusHistory(
  orderItemId: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string,
  remarks?: string
) {
  const { error } = await supabase
    .from("order_status_history")
    .insert({
      order_item_id: orderItemId,
      changed_by: changedBy,
      old_status: oldStatus,
      new_status: newStatus,
      remarks: remarks || `Status changed from ${oldStatus} to ${newStatus}`,
    });

  if (error) {
    console.warn("Could not add status history:", error);
  }
}

/**
 * Add tracking information for an order item
 */
export async function addOrderItemTracking(
  orderItemId: string,
  status: string,
  url: string,
  location?: string,
  notes?: string
) {
  const { error } = await supabase
    .from("order_tracking")
    .insert({
      order_item_id: orderItemId,
      status,
      url,
      location: location || "",
      notes: notes || "",
    });

  if (error) {
    console.warn("Could not add tracking record:", error);
  }
}

/**
 * Fetch all tracking records for an order item
 */
export async function fetchOrderItemTracking(orderItemId: string) {
  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("order_item_id", orderItemId)
    .order("updated_at", { ascending: false });

  return data || [];
}

/**
 * Fetch all returns for an order item
 */
export async function fetchOrderItemReturns(orderItemId: string) {
  const { data, error } = await supabase
    .from("order_returns")
    .select("*")
    .eq("order_item_id", orderItemId);

  return data || [];
}

/**
 * Fetch all cancellations for an order item
 */
export async function fetchOrderItemCancellations(orderItemId: string) {
  const { data, error } = await supabase
    .from("order_cancellations")
    .select("*")
    .eq("order_item_id", orderItemId);

  return data || [];
}

/**
 * Fetch all refunds for an order item
 */
export async function fetchOrderItemRefunds(orderItemId: string) {
  const { data, error } = await supabase
    .from("order_refunds")
    .select("*")
    .eq("order_item_id", orderItemId);

  return data || [];
}

/**
 * Fetch status history for an order item
 */
export async function fetchOrderItemStatusHistory(orderItemId: string) {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_item_id", orderItemId)
    .order("changed_at", { ascending: false });

  return data || [];
}

/**
 * Create a cancellation for an order item
 */
export async function cancelOrderItem(
  orderItemId: string,
  cancelledBy: string,
  cancelledByRole: 'buyer' | 'seller' | 'admin',
  reason: string
) {
  const { error } = await supabase
    .from("order_cancellations")
    .insert({
      order_item_id: orderItemId,
      cancelled_by: cancelledBy,
      cancelled_by_role: cancelledByRole,
      reason,
      refund_status: "pending",
    });

  if (error) throw error;
}

/**
 * Create a return for an order item
 */
export async function createOrderItemReturn(
  orderItemId: string,
  buyerId: string,
  sellerId: string,
  reason: string,
  returnType: 'replacement' | 'refund' = 'refund'
) {
  const { error } = await supabase
    .from("order_returns")
    .insert({
      order_item_id: orderItemId,
      buyer_id: buyerId,
      seller_id: sellerId,
      reason,
      return_type: returnType,
      status: "initiated",
    });

  if (error) throw error;
}

/**
 * Create a refund for an order item
 */
export async function createOrderItemRefund(
  orderItemId: string,
  amount: number,
  processedBy: string,
  method: 'original' | 'wallet' | 'manual' = 'original',
  returnId?: string
) {
  const { error } = await supabase
    .from("order_refunds")
    .insert({
      order_item_id: orderItemId,
      amount,
      processed_by: processedBy,
      method,
      status: "pending",
      return_id: returnId,
    });

  if (error) throw error;
}

/**
 * Fetch buyer and address details for an order
 */
export async function fetchOrderBuyerDetails(orderId: string, buyerId: string, addressId: string | null) {
  const [userRes, addressRes, profileRes] = await Promise.all([
    supabase.from("users").select("id, email, phone").eq("id", buyerId).maybeSingle(),
    addressId ? supabase.from("addresses").select("*").eq("address_id", addressId).single() : Promise.resolve({ data: null, error: null }),
    supabase.from("user_profiles").select("full_name, user_id").eq("user_id", buyerId).maybeSingle(),
  ]);

  return {
    user: userRes.data,
    address: addressRes.data,
    profile: profileRes.data,
  };
}
