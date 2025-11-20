import { supabase } from "@/integrations/supabase/client";

export type AlertType = 
  // Seller Notifications
  | 'new_order_received'
  | 'order_canceled_by_buyer'
  | 'return_request_received'
  | 'seller_refund_completed'
  | 'low_stock_alert'
  | 'product_out_of_stock'
  | 'account_approved'
  | 'new_review_rating'
  | 'payout_processed';

interface SendEmailParams {
  recipientEmail: string;
  recipientId?: string;
  recipientType: 'seller' | 'buyer' | 'admin';
  alertType: AlertType;
  subject: string;
  htmlContent: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  relatedSellerId?: string;
  relatedEntityId?: string;
  trackingId?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send email using Supabase Edge Function (bypasses CORS)
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> {
  try {
    console.log('=== Email Service Debug ===');
    console.log('Recipient:', params.recipientEmail);
    console.log('Alert Type:', params.alertType);
    console.log('Using Supabase Edge Function');
    console.log('========================');

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session - user must be logged in');
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    console.log('Calling Supabase Edge Function: send-email');

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    console.log('Edge Function response:', data, error);

    if (error) {
      console.error('❌ Edge Function Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    if (!data.success) {
      console.error('❌ Email sending failed:', data.error);
      return {
        success: false,
        error: data.error
      };
    }

    console.log('✅ Email sent successfully!');

    return {
      success: true,
      notificationId: data.notificationId
    };

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
