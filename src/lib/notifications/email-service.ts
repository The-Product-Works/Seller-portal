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
    // Check if API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return {
        success: false,
        error: 'Email service not configured - RESEND_API_KEY missing'
      };
    }

    console.log('Sending email to:', params.recipientEmail);
    console.log('Alert type:', params.alertType);
    console.log('From email:', FROM_EMAIL);

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: params.recipientEmail,
        subject: params.subject,
        html: params.htmlContent
      })
    });

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
      return {
        success: false,
        error: result.message || 'Failed to send email'
      };
    }

    return {
      success: true,
      notificationId: notification?.notification_id
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
