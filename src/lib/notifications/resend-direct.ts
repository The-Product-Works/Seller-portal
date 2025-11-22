/**
 * Direct Resend API Integration
 * Sends notifications directly to Gmail without using Supabase
 * New API Key: re_FJ8AtYR2_DdXyYoLNmGTvonL6WPiQZxK1
 */

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

interface SendDirectEmailParams {
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  alertType: AlertType;
  relatedOrderId?: string;
  relatedProductId?: string;
  transactionId?: string;
}

/**
 * Send email directly via Resend API to Gmail
 * Bypasses Supabase completely for better reliability
 */
export async function sendDirectEmail(params: SendDirectEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    console.log('=== Direct Resend Email Service ===');
    console.log('Recipient:', params.recipientEmail);
    console.log('Alert Type:', params.alertType);
    console.log('Subject:', params.subject);
    console.log('================================');

    // Use environment variables
    const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
    const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set in environment variables');
      return {
        success: false,
        error: 'Resend API key is not configured. Please check your environment variables.'
      };
    }

    console.log('Using API Key:', RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 8)}...` : 'NOT SET');
    console.log('From Email:', FROM_EMAIL);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.recipientEmail],
        subject: params.subject,
        html: params.htmlContent,
        tags: [
          { name: 'alert_type', value: params.alertType },
          { name: 'environment', value: import.meta.env.MODE || 'development' },
          ...(params.relatedOrderId ? [{ name: 'order_id', value: params.relatedOrderId }] : []),
          ...(params.transactionId ? [{ name: 'transaction_id', value: params.transactionId }] : []),
        ],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Resend API Error:', data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log('✅ Email sent successfully to Gmail!');
    console.log('Message ID:', data.id);

    return {
      success: true,
      messageId: data.id
    };

  } catch (error) {
    console.error('❌ Direct email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send seller notification directly to Gmail
 * Wrapper function for easy use
 */
export async function sendSellerNotificationToGmail(
  sellerEmail: string,
  subject: string,
  htmlContent: string,
  alertType: AlertType,
  metadata?: {
    orderId?: string;
    productId?: string;
    transactionId?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return await sendDirectEmail({
    recipientEmail: sellerEmail,
    subject,
    htmlContent,
    alertType,
    relatedOrderId: metadata?.orderId,
    relatedProductId: metadata?.productId,
    transactionId: metadata?.transactionId,
  });
}