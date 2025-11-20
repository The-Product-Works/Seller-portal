import { supabase } from "@/integrations/supabase/client";

/**
 * Initialize seller balance record if it doesn't exist
 * This should be called when a seller account is created or before first payout
 * 
 * @param sellerId - The seller's ID
 * @returns Success status
 */
export async function initializeSellerBalance(sellerId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if balance already exists
    const { data: existingBalance, error: checkError } = await supabase
      .from("seller_balances")
      .select("balance_id")
      .eq("seller_id", sellerId)
      .single();

    if (existingBalance) {
      return {
        success: true,
        message: "Balance already initialized",
      };
    }

    // Create new balance record
    const { error: insertError } = await supabase
      .from("seller_balances")
      .insert({
        seller_id: sellerId,
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_paid_out: 0,
        total_refunded: 0,
      });

    if (insertError) {
      console.error("Error initializing seller balance:", insertError);
      return {
        success: false,
        message: `Failed to initialize balance: ${insertError.message}`,
      };
    }

    return {
      success: true,
      message: "Seller balance initialized successfully",
    };
  } catch (error) {
    console.error("Error in initializeSellerBalance:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}
