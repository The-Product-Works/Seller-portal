// src/hooks/useSellerEarnings.ts
// Hook for seller earnings page - implements same logic as admin portal's useSellerPayouts
// but filtered for the authenticated seller only

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Types for the earnings system
 */
export interface EarningsStats {
  totalPayoutTillDate: number;
  futurePayoutAmount: number; // Pending + On-Hold + Withheld
  lastMonthPayout: number;
  totalRefundsDeducted: number;
  paidGrossAmount: number; // Gross amount before refund deductions for paid items
  paidRefundsDeducted: number; // Refunds deducted from paid payouts
  pendingCount: number;
  onHoldCount: number;
  withheldCount: number;
  refundsCount: number;
  approvedCount: number;
  paidCount: number;
}

export interface PayoutItem {
  payout_item_id: string;
  payout_id: string | null;
  order_id: string;
  order_item_id: string;
  payment_id: string | null;
  order_date: string;
  item_subtotal: number;
  allocated_razorpay_fee: number;
  allocated_razorpay_tax: number;
  refund_id: string | null;
  is_refunded: boolean;
  refund_amount: number;
  is_settled: boolean;
  settlement_hold_until: string;
  created_at: string;
  // Joined data
  order_items?: {
    order_item_id: string;
    seller_id: string;
    status: string;
    listing_id: string;
    quantity: number;
    price_per_unit: number;
    seller_product_listings?: {
      seller_title: string;
      return_days: number | null;
      global_products?: {
        product_name: string;
      };
    };
  };
  orders?: {
    order_id: string;
    created_at: string;
  };
  // Metadata for categorization
  _metadata?: {
    order_item_id: string;
    listing_id: string;
    status: string;
    return_days: number;
    is_non_returnable: boolean;
    days_since_order: number;
    days_remaining: number;
    is_return_window_closed: boolean;
    is_valid_fulfilled: boolean;
    return_window_close_date: Date | null;
  };
}

export interface RefundDetail {
  refund_id: string;
  order_item_id: string;
  seller_id: string;
  item_subtotal: number;
  refund_status: string;
  was_in_payout: boolean;
  was_already_paid: boolean;
  order_date: string;
  product_name: string;
}

export interface CategorizedPayouts {
  onHold: PayoutItem[];
  pending: PayoutItem[];
  withheld: PayoutItem[];
  refunds: RefundDetail[];
  approved: PayoutItem[];
  paid: PayoutItem[];
  stats: EarningsStats;
}

const DEFAULT_RETURN_DAYS = 7;

/**
 * Database row types for type safety
 */
interface OrderItemRow {
  order_item_id: string;
  seller_id: string;
  status: string;
  listing_id: string;
  quantity: number;
  price_per_unit: number;
  seller_product_listings?: {
    seller_title: string;
    return_days: number | null;
    global_products?: {
      product_name: string;
    };
  };
}

interface PayoutItemRow {
  payout_item_id: string;
  payout_id: string | null;
  order_id: string;
  order_item_id: string;
  payment_id: string | null;
  order_date: string;
  item_subtotal: number;
  allocated_razorpay_fee: number;
  allocated_razorpay_tax: number;
  refund_id: string | null;
  is_refunded: boolean;
  refund_amount: number;
  is_settled: boolean;
  settlement_hold_until: string;
  created_at: string;
  order_items?: OrderItemRow | OrderItemRow[];
  orders?: {
    order_id: string;
    created_at: string;
  };
}

interface RefundRow {
  refund_id: string;
  order_item_id: string;
  amount: number;
  status: string;
  settled_in_payout_id: string | null;
  settled_at: string | null;
  processed_at: string;
  order_items?: OrderItemRow | OrderItemRow[];
}

interface PayoutRow {
  payout_id: string;
  seller_id: string;
  status: string;
  payout_month: number;
  payout_year: number;
  net_amount: number;
  gross_sales: number;
  razorpay_fees: number;
  refund_deductions: number;
  created_at: string;
}

interface ReturnPolicyRow {
  listing_id: string;
  return_days: number | null;
}

/**
 * Helper function to enrich item with metadata for categorization
 */
function enrichItemWithMetadata(
  item: PayoutItemRow,
  returnPolicyMap: Map<string, number>,
  now: Date
): PayoutItem {
  const orderItemData = Array.isArray(item.order_items)
    ? item.order_items[0]
    : item.order_items;
  
  const statusItem = orderItemData?.status;
  const listingId = orderItemData?.listing_id;

  const returnDaysFromDB = listingId ? returnPolicyMap.get(listingId) : undefined;
  const returnDays = returnDaysFromDB ?? DEFAULT_RETURN_DAYS;
  const isNonReturnable = returnDaysFromDB === 0 || returnDaysFromDB === null;

  let daysSinceOrder = 0;
  if (item.order_date) {
    const orderDate = new Date(item.order_date);
    daysSinceOrder = Math.floor(
      (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const isReturnWindowClosed = isNonReturnable ? true : daysSinceOrder >= returnDays;
  const isDelivered = statusItem === "delivered";
  
  // Per doc: "valid fulfilled order" = delivered + not cancelled + not returned + return window closed
  const isValidFulfilled =
    isDelivered &&
    statusItem !== "cancelled" &&
    statusItem !== "returned" &&
    isReturnWindowClosed;

  return {
    ...item,
    _metadata: {
      order_item_id: item.order_item_id,
      listing_id: listingId,
      status: statusItem,
      return_days: returnDays,
      is_non_returnable: isNonReturnable,
      days_since_order: daysSinceOrder,
      days_remaining: isNonReturnable ? 0 : Math.max(0, returnDays - daysSinceOrder),
      is_return_window_closed: isReturnWindowClosed,
      is_valid_fulfilled: isValidFulfilled,
      return_window_close_date:
        !isNonReturnable && item.order_date
          ? new Date(new Date(item.order_date).getTime() + returnDays * 24 * 60 * 60 * 1000)
          : null,
    },
  };
}

/**
 * Main hook to fetch and categorize seller earnings
 * Implements the same logic as admin portal's usePayouts
 */
export function useSellerEarnings(sellerId: string | null) {
  return useQuery({
    queryKey: ["seller-earnings", sellerId],
    queryFn: async (): Promise<CategorizedPayouts> => {
      if (!sellerId) {
        throw new Error("Seller ID is required");
      }

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // 1. Fetch ALL unsettled payout items for this seller
      const { data: unsettledItems, error: itemsError } = await supabase
        .from("seller_payout_items")
        .select(`
          *,
          order_items!inner (
            order_item_id,
            seller_id,
            status,
            listing_id,
            quantity,
            price_per_unit,
            seller_product_listings (
              seller_title,
              return_days,
              global_products (
                product_name
              )
            )
          ),
          orders (
            order_id,
            created_at
          )
        `)
        .eq("order_items.seller_id", sellerId)
        .eq("is_settled", false)
        .order("order_date", { ascending: false });

      if (itemsError) {
        console.error("Error fetching unsettled items:", itemsError);
        throw itemsError;
      }

      // 2. Fetch settled/approved items for this seller (for approved/paid tabs)
      const { data: settledItems, error: settledError } = await supabase
        .from("seller_payout_items")
        .select(`
          *,
          order_items!inner (
            order_item_id,
            seller_id,
            status,
            listing_id,
            quantity,
            price_per_unit,
            seller_product_listings (
              seller_title,
              return_days,
              global_products (
                product_name
              )
            )
          ),
          orders (
            order_id,
            created_at
          )
        `)
        .eq("order_items.seller_id", sellerId)
        .eq("is_settled", true)
        .order("order_date", { ascending: false });

      if (settledError) {
        console.error("Error fetching settled items:", settledError);
      }

      // 3. Fetch payouts for this seller (for approved/paid status display)
      const { data: payouts, error: payoutsError } = await supabase
        .from("seller_payouts")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (payoutsError) {
        console.error("Error fetching payouts:", payoutsError);
      }

      // 4. Fetch refunds for this seller
      const { data: refundsData, error: refundsError } = await supabase
        .from("order_refunds")
        .select(`
          *,
          order_items!inner (
            order_item_id,
            seller_id,
            quantity,
            price_per_unit,
            seller_product_listings (
              seller_title,
              global_products (
                product_name
              )
            )
          )
        `)
        .eq("order_items.seller_id", sellerId);

      if (refundsError) {
        console.error("Error fetching refunds:", refundsError);
      }

      // Build refund details from order_refunds
      const allRefunds: RefundDetail[] = (refundsData || []).map((r: RefundRow) => {
        const orderItemData = Array.isArray(r.order_items) ? r.order_items[0] : r.order_items;
        return {
          refund_id: r.refund_id,
          order_item_id: r.order_item_id,
          seller_id: sellerId,
          item_subtotal: Number(r.amount || 0),
          refund_status: r.status,
          was_in_payout: !!r.settled_in_payout_id,
          was_already_paid: !!r.settled_at,
          order_date: r.processed_at,
          product_name: orderItemData?.seller_product_listings?.global_products?.product_name ||
                        orderItemData?.seller_product_listings?.seller_title ||
                        "Product",
        };
      });

      // Unsettled refunds = not yet in a payout
      const unsettledRefunds = allRefunds.filter((r) => !r.was_in_payout);
      const unsettledRefundOrderItemIds = new Set(unsettledRefunds.map((r) => r.order_item_id));

      // 5. Get return policies for categorization
      const items = unsettledItems || [];
      const listingIds = [
        ...new Set(
          items
            .map((it) => {
              const orderItemData = Array.isArray(it.order_items)
                ? it.order_items[0]
                : it.order_items;
              return orderItemData?.listing_id;
            })
            .filter((id): id is string => !!id)
        ),
      ];

      const { data: returnPolicies } =
        listingIds.length > 0
          ? await supabase
              .from("seller_product_listings")
              .select("listing_id, return_days")
              .in("listing_id", listingIds)
          : { data: null };

      const returnPolicyMap = new Map<string, number>(
        returnPolicies?.map((p: ReturnPolicyRow) => [p.listing_id, p.return_days ?? DEFAULT_RETURN_DAYS]) || []
      );

      // 6. Enrich all items with metadata
      const enrichedItems = items.map((item) =>
        enrichItemWithMetadata(item, returnPolicyMap, now)
      );

      // 7. Categorize items according to final_payout_system.md logic
      const refundItems: PayoutItem[] = [];
      const validFulfilledItems: PayoutItem[] = [];
      const withheldItems: PayoutItem[] = [];

      for (const enrichedItem of enrichedItems) {
        const statusItem = enrichedItem._metadata?.status;
        const isValidFulfilled = enrichedItem._metadata?.is_valid_fulfilled;
        const isReturnWindowClosed = enrichedItem._metadata?.is_return_window_closed;
        const isDelivered = statusItem === "delivered";
        const isCancelledOrReturned = statusItem === "cancelled" || statusItem === "returned";
        const hasUnsettledRefund = unsettledRefundOrderItemIds.has(enrichedItem.order_item_id);

        // Refunds Tab: Cancelled/returned orders OR items with unsettled refunds
        if (isCancelledOrReturned || hasUnsettledRefund) {
          refundItems.push(enrichedItem);
          continue;
        }

        // Valid Fulfilled: Delivered + return window closed + not cancelled/returned
        if (isValidFulfilled) {
          validFulfilledItems.push(enrichedItem);
          continue;
        }

        // Withheld: Not delivered OR return window still open (and not cancelled/returned)
        if (!isDelivered || !isReturnWindowClosed) {
          withheldItems.push(enrichedItem);
          continue;
        }
      }

      // On-Hold: Take the most recent 3 from valid fulfilled items
      // Per doc: "Latest 3 valid fulfilled orders" - these are held until next month
      const onHoldItems = validFulfilledItems.slice(0, 3);
      const onHoldIds = new Set(onHoldItems.map((i) => i.payout_item_id));

      // Pending: Valid fulfilled items that are NOT in the recent 3 (on-hold)
      const pendingItems = validFulfilledItems.filter(
        (i) => !onHoldIds.has(i.payout_item_id)
      );

      // 8. Categorize settled items by payout status
      const approvedPayouts = (payouts || []).filter((p: PayoutRow) => p.status === "approved");
      const paidPayouts = (payouts || []).filter((p: PayoutRow) => p.status === "paid");
      const approvedPayoutIds = new Set(approvedPayouts.map((p: PayoutRow) => p.payout_id));
      const paidPayoutIds = new Set(paidPayouts.map((p: PayoutRow) => p.payout_id));

      const approvedItems = (settledItems || []).filter((item: PayoutItemRow) =>
        approvedPayoutIds.has(item.payout_id)
      );
      const paidItems = (settledItems || []).filter((item: PayoutItemRow) =>
        paidPayoutIds.has(item.payout_id)
      );

      // 9. Calculate statistics
      // Total paid out
      const totalPaidOut = paidPayouts.reduce(
        (sum: number, p: PayoutRow) => sum + Number(p.net_amount || 0),
        0
      );

      // Future payout = sum of pending + on-hold + withheld items (gross - fees)
      const calculateNetForItems = (itemList: PayoutItem[]) => {
        return itemList.reduce((sum, item) => {
          const gross = Number(item.item_subtotal || 0);
          const fees = Number(item.allocated_razorpay_fee || 0);
          return sum + (gross - fees);
        }, 0);
      };

      const pendingNet = calculateNetForItems(pendingItems);
      const onHoldNet = calculateNetForItems(onHoldItems);
      const withheldNet = calculateNetForItems(withheldItems);
      const futurePayoutAmount = pendingNet + onHoldNet + withheldNet;

      // Last month payout
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const lastMonthPayouts = paidPayouts.filter(
        (p: PayoutRow) => p.payout_month === lastMonth && p.payout_year === lastMonthYear
      );
      const lastMonthPayout = lastMonthPayouts.reduce(
        (sum: number, p: PayoutRow) => sum + Number(p.net_amount || 0),
        0
      );

      // Total refunds deducted
      const totalRefundsDeducted = allRefunds
        .filter((r) => r.was_in_payout)
        .reduce((sum, r) => sum + r.item_subtotal, 0);

      // Calculate paid payout details (gross and refunds)
      const paidGrossAmount = paidPayouts.reduce(
        (sum: number, p: PayoutRow) => sum + Number(p.gross_sales || 0) - Number(p.razorpay_fees || 0),
        0
      );
      const paidRefundsDeducted = paidPayouts.reduce(
        (sum: number, p: PayoutRow) => sum + Number(p.refund_deductions || 0),
        0
      );

      // Approved total (unused but kept for potential future use)
      const _approvedTotal = approvedPayouts.reduce(
        (sum: number, p: PayoutRow) => sum + Number(p.net_amount || 0),
        0
      );

      const stats: EarningsStats = {
        totalPayoutTillDate: totalPaidOut,
        futurePayoutAmount,
        lastMonthPayout,
        totalRefundsDeducted,
        paidGrossAmount,
        paidRefundsDeducted,
        pendingCount: pendingItems.length,
        onHoldCount: onHoldItems.length,
        withheldCount: withheldItems.length,
        refundsCount: unsettledRefunds.length,
        approvedCount: approvedItems.length,
        paidCount: paidItems.length,
      };

      return {
        onHold: onHoldItems,
        pending: pendingItems,
        withheld: withheldItems,
        refunds: unsettledRefunds,
        approved: approvedItems.map((item: PayoutItemRow) =>
          enrichItemWithMetadata(item, returnPolicyMap, now)
        ),
        paid: paidItems.map((item: PayoutItemRow) =>
          enrichItemWithMetadata(item, returnPolicyMap, now)
        ),
        stats,
      };
    },
    enabled: !!sellerId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch payout history for the seller
 */
export function useSellerPayoutHistory(sellerId: string | null) {
  return useQuery({
    queryKey: ["seller-payout-history", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from("seller_payouts")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sellerId,
  });
}
