import { supabase } from "@/integrations/supabase/client";
import { recordSellerEarning } from "./record-earning";

/**
 * Process delivery for payout - Main integration point
 * Call this function when an order item is marked as "delivered"
 * 
 * This handles:
 * 1. Duplicate check
 * 2. Fetching order & payment details
 * 3. Calculating proportional fees
 * 4. Determining settlement date (3-order hold rule)
 * 5. Recording earning
 * 
 * @param params - Order item and seller details
 * @returns Success status and message
 */
export async function processDeliveryForPayout(params: {
  orderItemId: string;
  sellerId: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { orderItemId, sellerId } = params;

    // 1. Duplicate Check - Check if payout item already exists
    const { data: existingPayout, error: checkError } = await supabase
      .from("seller_payout_items")
      .select("payout_item_id")
      .eq("order_item_id", orderItemId)
      .single();

    if (existingPayout) {
      return {
        success: true,
        message: "Payout already recorded for this order item",
      };
    }

    // 2. Fetch order item details
    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .select(`
        *,
        orders:order_id (
          order_id,
          order_number,
          created_at,
          final_amount
        )
      `)
      .eq("order_item_id", orderItemId)
      .single();

    if (orderItemError || !orderItem) {
      console.error("Error fetching order item:", orderItemError);
      return {
        success: false,
        message: "Order item not found or not delivered",
      };
    }

    // Verify order item is delivered
    if (orderItem.status !== "delivered") {
      return {
        success: false,
        message: "Order item must be marked as delivered first",
      };
    }

    // 3. Fetch payment information
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderItem.order_id)
      .single();

    if (paymentError || !payment) {
      console.error("Error fetching payment:", paymentError);
      return {
        success: false,
        message: "Payment information not found",
      };
    }

    // 4. Calculate proportional fees for multi-seller orders
    const itemSubtotal = orderItem.subtotal || (orderItem.quantity * orderItem.price_per_unit);
    const totalOrderAmount = payment.amount || 0;
    const totalRazorpayFee = payment.razorpay_fee || 0;
    const totalRazorpayTax = payment.razorpay_tax || 0;

    // Calculate this seller's proportion of the order
    const proportion = totalOrderAmount > 0 ? itemSubtotal / totalOrderAmount : 0;
    const allocatedFee = totalRazorpayFee * proportion;
    const allocatedTax = totalRazorpayTax * proportion;

    // 5. Determine settlement date (3-order hold rule)
    const settlementDate = await calculateSettlementDate(sellerId);

    // 6. Record the earning
    const result = await recordSellerEarning({
      sellerId,
      orderItemId,
      orderId: orderItem.order_id,
      orderNumber: (orderItem.orders as { order_number?: string })?.order_number || "N/A",
      paymentId: payment.payment_id,
      itemSubtotal,
      allocatedRazorpayFee: allocatedFee,
      allocatedRazorpayTax: allocatedTax,
      settlementHoldUntil: settlementDate,
      orderDate: (orderItem.orders as { created_at?: string })?.created_at || new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error("Error in processDeliveryForPayout:", error);
    return {
      success: false,
      message: "An unexpected error occurred while processing payout",
    };
  }
}

/**
 * Calculate settlement date based on 3-order hold rule
 * - First 3 delivered orders: settlement on 28th of NEXT month
 * - 4th order onwards: settlement on 28th of CURRENT month
 * 
 * @param sellerId - Seller ID
 * @returns ISO date string for settlement date
 */
async function calculateSettlementDate(sellerId: string): Promise<string> {
  try {
    // Count how many delivered orders this seller has (including current one)
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select("order_item_id")
      .eq("seller_id", sellerId)
      .eq("status", "delivered");

    if (error) {
      console.error("Error counting delivered orders:", error);
      // Default to next month if error
      return getSettlementDate(true);
    }

    const deliveredCount = orderItems?.length || 0;

    // First 3 orders: next month's 28th
    // 4th onwards: current month's 28th
    const useNextMonth = deliveredCount <= 3;

    return getSettlementDate(useNextMonth);
  } catch (error) {
    console.error("Error in calculateSettlementDate:", error);
    // Default to next month if error
    return getSettlementDate(true);
  }
}

/**
 * Get the 28th of current or next month
 * @param nextMonth - If true, returns next month's 28th, else current month's 28th
 */
function getSettlementDate(nextMonth: boolean): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  let settlementMonth = month;
  let settlementYear = year;

  if (nextMonth) {
    settlementMonth = month + 1;
    if (settlementMonth > 11) {
      settlementMonth = 0;
      settlementYear = year + 1;
    }
  }

  // Create date for 28th of the settlement month
  const settlementDate = new Date(settlementYear, settlementMonth, 28);
  
  return settlementDate.toISOString();
}
