/**
 * Email Service - HTTP Client for Vercel Serverless Function
 * 
 * This service sends emails by calling the /api/email/send endpoint
 * which runs as a Vercel serverless function (server-side)
 */

export type AlertType = 
  // Buyer notifications
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'refund_initiated'
  | 'refund_completed'
  // Seller notifications
  | 'seller_refund_completed'
  | 'welcome'
  // Admin notifications
  | 'admin_return_received'
  | 'admin_new_seller_registration'
  | 'admin_seller_kyc_submitted'
  | 'admin_dispute_raised'
  // Test
  | 'test_email';

export type RecipientType = 'buyer' | 'seller' | 'admin';

// In development: Vite dev server proxies to /api/email/send
// In production: Vercel serves /api/email/send as serverless function
// No need for separate URL - same domain!
const API_URL = '/api/email/send';

interface SendEmailParams {
  alertType: AlertType;
  recipientEmail: string;
  recipientType: RecipientType;
  recipientId?: string;
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

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Vercel serverless function
 * This is the ONLY way to send emails from the seller portal frontend
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    console.log('📧 [Email Service] Sending email via serverless function...');
    console.log('🔍 [Email Service] API URL:', API_URL);
    console.log('📦 [Email Service] Request params:', {
      alertType: params.alertType,
      recipientEmail: params.recipientEmail,
      recipientType: params.recipientType,
      subject: params.subject,
      htmlContentLength: params.htmlContent.length,
      metadata: params.metadata,
    });

    const requestBody = JSON.stringify(params);
    console.log('📤 [Email Service] Request body size:', requestBody.length, 'bytes');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    console.log('📥 [Email Service] Response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        const textError = await response.text();
        console.error('❌ [Email Service] Failed to parse error response as JSON:', textError);
        throw new Error(`HTTP ${response.status}: ${textError}`);
      }
      console.error('❌ [Email Service] Server returned error:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ [Email Service] Email sent successfully!');
    console.log('🎉 [Email Service] Message ID:', result.messageId);
    console.log('📊 [Email Service] Full result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ [Email Service] Error sending email via serverless function:', error);
    console.error('🔍 [Email Service] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('📝 [Email Service] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('📚 [Email Service] Stack trace:', error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Convenience function to trigger email sending
 * Non-blocking - doesn't throw errors
 */
export async function triggerEmail(params: SendEmailParams): Promise<void> {
  sendEmail(params).catch(err => {
    console.error('Email sending failed (non-blocking):', err);
  });
}
