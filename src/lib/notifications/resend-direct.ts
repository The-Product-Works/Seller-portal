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

    const RESEND_API_KEY = 're_FJ8AtYR2_DdXyYoLNmGTvonL6WPiQZxK1';
    const FROM_EMAIL = 'onboarding@resend.dev';

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
          { name: 'environment', value: 'production' },
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