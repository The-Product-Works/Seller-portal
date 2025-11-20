import { supabase } from "@/integrations/supabase/client";
import { initializeSellerBalance } from "./initialize-balance";

/**
 * Record a seller's earning from a delivered order item
 * This function:
 * 1. Creates a payout item record
 * 2. Updates seller balance
 * 3. Creates a transaction log
 * 
 * @param params - Order and earning details
 * @returns Success status and details
 */
export async function recordSellerEarning(params: {
  sellerId: string;
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  paymentId: string | null;
  itemSubtotal: number;
  allocatedRazorpayFee: number;
  allocatedRazorpayTax: number;
  settlementHoldUntil: string;
  orderDate: string;
}): Promise<{
  success: boolean;
  message: string;
  netEarning?: number;
}> {
  try {
    const {
      sellerId,
      orderItemId,
      orderId,
      orderNumber,
      paymentId,
      itemSubtotal,
      allocatedRazorpayFee,
      allocatedRazorpayTax,
      settlementHoldUntil,
      orderDate,
    } = params;

    // Calculate net earning
    const netEarning = itemSubtotal - allocatedRazorpayFee - allocatedRazorpayTax;

    // 1. Create payout item record
    const { data: payoutItem, error: payoutError } = await supabase
      .from("seller_payout_items")
      .insert({
        order_id: orderId,
        order_item_id: orderItemId,
        payment_id: paymentId,
        item_subtotal: itemSubtotal,
        allocated_razorpay_fee: allocatedRazorpayFee,
        allocated_razorpay_tax: allocatedRazorpayTax,
        settlement_hold_until: settlementHoldUntil,
        order_date: orderDate,
        is_settled: false,
        is_refunded: false,
      })
      .select()
      .single();

    if (payoutError) {
      console.error("Error creating payout item:", payoutError);
      return {
        success: false,
        message: `Failed to create payout item: ${payoutError.message}`,
      };
    }

    // 2. Ensure seller balance exists
    await initializeSellerBalance(sellerId);

    // 3. Get current balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from("seller_balances")
      .select("*")
      .eq("seller_id", sellerId)
      .single();

    if (balanceError || !currentBalance) {
      console.error("Error fetching seller balance:", balanceError);
      return {
        success: false,
        message: "Failed to fetch seller balance",
      };
    }

    // 4. Determine if this goes to available or pending balance
    // Check settlement date: if in the future, it's pending; if today or past, it's available
    const settlementDate = new Date(settlementHoldUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    settlementDate.setHours(0, 0, 0, 0);

    const isPending = settlementDate > today;

    // 5. Update balance
    const newAvailableBalance = isPending
      ? currentBalance.available_balance
      : currentBalance.available_balance + netEarning;
    const newPendingBalance = isPending
      ? currentBalance.pending_balance + netEarning
      : currentBalance.pending_balance;
    const newTotalEarned = currentBalance.total_earned + netEarning;

    const { error: updateError } = await supabase
      .from("seller_balances")
      .update({
        available_balance: newAvailableBalance,
        pending_balance: newPendingBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("seller_id", sellerId);

    if (updateError) {
      console.error("Error updating seller balance:", updateError);
      return {
        success: false,
        message: `Failed to update balance: ${updateError.message}`,
      };
    }

    // 6. Create transaction log
    const { error: txnError } = await supabase
      .from("seller_balance_transactions")
      .insert({
        seller_id: sellerId,
        type: "order",
        amount: netEarning,
        balance_before: isPending ? currentBalance.pending_balance : currentBalance.available_balance,
        balance_after: isPending ? newPendingBalance : newAvailableBalance,
        related_order_id: orderId,
        related_order_item_id: orderItemId,
        description: `Earning from order #${orderNumber} (Item subtotal: ₹${itemSubtotal.toFixed(2)}, Fees: ₹${(allocatedRazorpayFee + allocatedRazorpayTax).toFixed(2)})`,
        metadata: {
          order_number: orderNumber,
          item_subtotal: itemSubtotal,
          razorpay_fee: allocatedRazorpayFee,
          razorpay_tax: allocatedRazorpayTax,
          net_earning: netEarning,
          settlement_date: settlementHoldUntil,
          balance_type: isPending ? "pending" : "available",
        },
      });

    if (txnError) {
      console.warn("Failed to create transaction log:", txnError);
      // Don't fail the whole operation if just logging fails
    }

    return {
      success: true,
      message: isPending
        ? `Earning recorded successfully. ₹${netEarning.toFixed(2)} added to pending balance (Settlement: ${settlementHoldUntil})`
        : `Earning recorded successfully. ₹${netEarning.toFixed(2)} added to available balance`,
      netEarning,
    };
  } catch (error) {
    console.error("Error in recordSellerEarning:", error);
    return {
      success: false,
      message: "An unexpected error occurred while recording earning",
    };
  }
}
