import { supabase } from "@/integrations/supabase/client";
import { sendEmail, getPayoutProcessedTemplate } from "@/lib/notifications";
import { format } from "date-fns";

/**
 * Send payout processed notification to seller
 * Call this function when a payout status changes to "paid"
 */
export async function notifyPayoutProcessed(params: {
  payoutId: string;
  sellerId: string;
  amount: number;
  transactionId: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { sellerId, amount, transactionId } = params;

    // Get seller email
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("email")
      .eq("id", sellerId)
      .single();

    if (sellerError || !seller?.email) {
      console.error("Error fetching seller email:", sellerError);
      return {
        success: false,
        message: "Failed to fetch seller email"
      };
    }

    // Generate email content
    const htmlContent = getPayoutProcessedTemplate({
      amount,
      payoutDate: format(new Date(), "PPP"),
      transactionId
    });

    // Send email
    const result = await sendEmail({
      recipientEmail: seller.email,
      recipientId: sellerId,
      recipientType: 'seller',
      alertType: 'payout_processed',
      subject: `💰 Payout Processed - ₹${amount.toFixed(2)}`,
      htmlContent,
      relatedSellerId: sellerId,
      transactionId
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error || "Failed to send notification"
      };
    }

    return {
      success: true,
      message: "Payout notification sent successfully"
    };

  } catch (error) {
    console.error("Error sending payout notification:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
