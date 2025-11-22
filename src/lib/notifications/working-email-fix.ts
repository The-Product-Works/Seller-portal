/**
 * Email Notification Fix and Comprehensive Solution
 * This file provides working email notification functions for the seller portal
 */

import { supabase } from "@/integrations/supabase/client";

// Direct Resend API configuration
const RESEND_CONFIG = {
  apiKey: import.meta.env.VITE_RESEND_API_KEY,
  fromEmail: import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  apiUrl: 'https://api.resend.com/emails'
};

export interface EmailParams {
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  alertType?: string;
}

/**
 * Send email directly via Resend API (WORKING SOLUTION)
 */
export async function sendWorkingEmail(params: EmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  console.log('🚀 Sending email with working solution...');
  console.log('📧 To:', params.recipientEmail);
  console.log('📧 Subject:', params.subject);
  
  // Validate configuration
  if (!RESEND_CONFIG.apiKey) {
    console.error('❌ VITE_RESEND_API_KEY is not set!');
    return {
      success: false,
      error: 'Resend API key is not configured. Check your .env file.'
    };
  }
  
  try {
    const response = await fetch(RESEND_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_CONFIG.fromEmail,
        to: [params.recipientEmail],
        subject: params.subject,
        html: params.htmlContent,
        tags: [
          { name: 'source', value: 'seller_portal' },
          { name: 'alert_type', value: params.alertType || 'general' },
          { name: 'environment', value: import.meta.env.MODE || 'development' },
        ],
      }),
    });
    
    const data = await response.json();
    console.log('📧 Resend response:', data);
    
    if (!response.ok) {
      console.error('❌ Resend error:', data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`
      };
    }
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', data.id);
    
    return {
      success: true,
      messageId: data.id
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send seller notification with proper template
 */
export async function sendSellerNotification(
  sellerEmail: string,
  type: 'low_stock' | 'out_of_stock' | 'new_order' | 'payout_processed' | 'order_cancelled',
  data: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  const templates = {
    low_stock: {
      subject: `⚠️ Low Stock Alert - ${data.productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">⚠️ Low Stock Alert</h1>
          </div>
          <div style="padding: 20px; background: #fef3c7; border: 1px solid #f59e0b;">
            <h2 style="color: #92400e;">Product Running Low</h2>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Current Stock:</strong> ${data.currentStock} units</p>
            <p><strong>Recommended Action:</strong> Restock soon to avoid stockouts</p>
          </div>
        </div>
      `
    },
    out_of_stock: {
      subject: `🚫 URGENT: ${data.productName} is Out of Stock`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🚫 Out of Stock Alert</h1>
          </div>
          <div style="padding: 20px; background: #fef2f2; border: 1px solid #dc2626;">
            <h2 style="color: #991b1b;">Immediate Action Required</h2>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Status:</strong> Out of Stock (0 units)</p>
            <p><strong>Action Required:</strong> Restock immediately to resume sales</p>
          </div>
        </div>
      `
    },
    new_order: {
      subject: `🎉 New Order Received - #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎉 New Order Received!</h1>
          </div>
          <div style="padding: 20px; background: #ecfdf5; border: 1px solid #10b981;">
            <h2 style="color: #047857;">Order Details</h2>
            <p><strong>Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>Amount:</strong> ₹${data.totalAmount}</p>
            <p><strong>Items:</strong> ${data.itemCount} item(s)</p>
            <p><strong>Customer:</strong> ${data.customerName}</p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${data.dashboardUrl || '/orders'}" 
                 style="background: #10b981; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                View Order Details
              </a>
            </div>
          </div>
        </div>
      `
    },
    payout_processed: {
      subject: `💰 Payout Processed - ₹${data.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">💰 Payout Processed</h1>
          </div>
          <div style="padding: 20px; background: #f3f4f6; border: 1px solid #8b5cf6;">
            <h2 style="color: #5b21b6;">Payment Details</h2>
            <p><strong>Amount:</strong> ₹${data.amount}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Date:</strong> ${data.payoutDate || new Date().toLocaleDateString()}</p>
            <p><strong>Status:</strong> Successfully Processed ✅</p>
          </div>
        </div>
      `
    },
    order_cancelled: {
      subject: `❌ Order Cancelled - #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">❌ Order Cancelled</h1>
          </div>
          <div style="padding: 20px; background: #fef2f2; border: 1px solid #ef4444;">
            <h2 style="color: #991b1b;">Cancellation Notice</h2>
            <p><strong>Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>Reason:</strong> ${data.reason || 'Customer request'}</p>
            <p><strong>Cancelled At:</strong> ${data.cancelledAt || new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    }
  };
  
  const template = templates[type];
  
  return await sendWorkingEmail({
    recipientEmail: sellerEmail,
    subject: template.subject,
    htmlContent: template.html,
    alertType: type
  });
}

/**
 * Get seller email by seller ID
 */
export async function getSellerEmail(sellerId: string): Promise<string | null> {
  try {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('email')
      .eq('id', sellerId)
      .single();
    
    if (error || !seller) {
      console.error('Error fetching seller email:', error);
      return null;
    }
    
    return seller.email;
  } catch (error) {
    console.error('Exception fetching seller email:', error);
    return null;
  }
}

/**
 * Complete notification functions (READY TO USE)
 */
export const workingNotifications = {
  // Low Stock Alert
  async sendLowStockAlert(sellerId: string, productName: string, currentStock: number) {
    const email = await getSellerEmail(sellerId);
    if (!email) return { success: false, error: 'Seller email not found' };
    
    return await sendSellerNotification(email, 'low_stock', {
      productName,
      currentStock
    });
  },
  
  // Out of Stock Alert
  async sendOutOfStockAlert(sellerId: string, productName: string) {
    const email = await getSellerEmail(sellerId);
    if (!email) return { success: false, error: 'Seller email not found' };
    
    return await sendSellerNotification(email, 'out_of_stock', {
      productName
    });
  },
  
  // New Order Notification
  async sendNewOrderNotification(sellerId: string, orderData: Record<string, unknown>) {
    const email = await getSellerEmail(sellerId);
    if (!email) return { success: false, error: 'Seller email not found' };
    
    return await sendSellerNotification(email, 'new_order', orderData);
  },
  
  // Payout Processed Notification
  async sendPayoutNotification(sellerId: string, amount: number, transactionId: string) {
    const email = await getSellerEmail(sellerId);
    if (!email) return { success: false, error: 'Seller email not found' };
    
    return await sendSellerNotification(email, 'payout_processed', {
      amount,
      transactionId
    });
  },
  
  // Order Cancelled Notification
  async sendOrderCancelledNotification(sellerId: string, orderNumber: string, reason?: string) {
    const email = await getSellerEmail(sellerId);
    if (!email) return { success: false, error: 'Seller email not found' };
    
    return await sendSellerNotification(email, 'order_cancelled', {
      orderNumber,
      reason
    });
  }
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).workingEmails = {
    sendEmail: sendWorkingEmail,
    sendSellerNotification,
    notifications: workingNotifications,
    test: async (email: string) => {
      return await sendWorkingEmail({
        recipientEmail: email,
        subject: '🧪 Working Email Test',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h1 style="color: #22c55e;">✅ Email System is Working!</h1>
            <p>This email was sent successfully using the fixed notification system.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `,
        alertType: 'test'
      });
    }
  };
  
  console.log('📧 Working email functions available:');
  console.log('  workingEmails.test("your@email.com") - Test email');
  console.log('  workingEmails.notifications.sendLowStockAlert(sellerId, productName, stock)');
  console.log('  workingEmails.notifications.sendNewOrderNotification(sellerId, orderData)');
}