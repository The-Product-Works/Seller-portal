import { supabase } from "@/integrations/supabase/client";

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || "onboarding@resend.dev";

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
 * Send email using Resend API and track in database
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> {
  try {
    // Debug: Log environment variable status
    console.log('=== Email Service Debug ===');
    console.log('API Key exists:', !!RESEND_API_KEY);
    console.log('API Key length:', RESEND_API_KEY?.length || 0);
    console.log('From Email:', FROM_EMAIL);
    console.log('Recipient:', params.recipientEmail);
    console.log('Alert Type:', params.alertType);
    console.log('========================');

    // Check if API key is configured
    if (!RESEND_API_KEY) {
      const errorMsg = 'RESEND_API_KEY is not configured. Did you restart the dev server?';
      console.error(errorMsg);
      alert('❌ ' + errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    console.log('Sending email via Resend API...');

    // Send email via Resend
    const requestBody = {
      from: FROM_EMAIL,
      to: params.recipientEmail,
      subject: params.subject,
      html: params.htmlContent
    };
    
    console.log('Request body:', requestBody);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const result = await response.json();
    console.log('Resend API response:', result);
    
    const emailStatus = response.ok ? 'sent' : 'failed';

    // Track notification in database
    const { data: notification, error: dbError } = await supabase
      .from('email_notifications')
      .insert({
        notification_type: 'email',
        recipient_type: params.recipientType,
        recipient_id: params.recipientId || null,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        alert_type: params.alertType,
        related_order_id: params.relatedOrderId || null,
        related_product_id: params.relatedProductId || null,
        related_seller_id: params.relatedSellerId || null,
        related_entity_id: params.relatedEntityId || null,
        tracking_id: params.trackingId || null,
        transaction_id: params.transactionId || null,
        status: emailStatus,
        metadata: (params.metadata || null) as never
      })
      .select('notification_id')
      .single();

    if (dbError) {
      console.error('Error tracking notification in database:', dbError);
    }

    if (!response.ok) {
      const errorMsg = result.message || result.error || 'Failed to send email';
      console.error('❌ Resend API Error:', errorMsg, result);
      return {
        success: false,
        error: errorMsg
      };
    }

    console.log('✅ Email sent successfully!');

    return {
      success: true,
      notificationId: notification?.notification_id
    };

  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Check for CORS error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const corsError = 'Network error - This might be a CORS issue. Resend API may not allow browser requests.';
      console.error(corsError);
      return {
        success: false,
        error: corsError
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
