/**
 * Email Service Using Proxy Server (No CORS Issues)
 * This service calls our local proxy server which then calls Resend API
 */

const PROXY_SERVER_URL = 'http://localhost:3001';

export interface ProxyEmailParams {
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  alertType?: string;
}

/**
 * Send email via proxy server (NO CORS ISSUES)
 */
export async function sendEmailViaProxy(params: ProxyEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  console.log('📧 Sending email via proxy server...');
  console.log('📧 To:', params.recipientEmail);
  console.log('📧 Subject:', params.subject);
  
  try {
    // Check if proxy server is running
    try {
      const healthCheck = await fetch(`${PROXY_SERVER_URL}/api/health`);
      if (!healthCheck.ok) {
        throw new Error('Proxy server not responding');
      }
    } catch (error) {
      console.error('❌ Proxy server is not running!');
      return {
        success: false,
        error: 'Email proxy server is not running. Please start it with: npm run start-email-proxy'
      };
    }

    // Send email via proxy
    const response = await fetch(`${PROXY_SERVER_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
    console.log('📧 Proxy response:', data);
    
    if (!response.ok || !data.success) {
      console.error('❌ Proxy error:', data);
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`
      };
    }
    
    console.log('✅ Email sent successfully via proxy!');
    console.log('📧 Message ID:', data.messageId);
    
    return {
      success: true,
      messageId: data.messageId
    };
    
  } catch (error) {
    console.error('❌ Proxy email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send seller notification via proxy with proper template
 */
export async function sendSellerNotificationViaProxy(
  sellerEmail: string,
  type: 'low_stock' | 'out_of_stock' | 'new_order' | 'payout_processed' | 'order_cancelled' | 'return_request' | 'refund_completed' | 'account_approved' | 'new_review',
  data: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  const templates = {
    low_stock: {
      subject: `⚠️ Low Stock Alert - ${data.productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate attention required</p>
          </div>
          <div style="padding: 20px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #92400e; margin-top: 0;">Product Running Low</h2>
            <p><strong>📦 Product:</strong> ${data.productName}</p>
            <p><strong>📊 Current Stock:</strong> ${data.currentStock} units</p>
            <p><strong>🎯 Threshold:</strong> 10 units</p>
            <p><strong>⚡ Action Required:</strong> Restock soon to avoid stockouts</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Inventory Management System</p>
          </div>
        </div>
      `
    },
    out_of_stock: {
      subject: `🚫 URGENT: ${data.productName} is Out of Stock`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🚫 Out of Stock Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Critical - Immediate action required</p>
          </div>
          <div style="padding: 20px; background: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #991b1b; margin-top: 0;">🚨 Product Out of Stock</h2>
            <p><strong>📦 Product:</strong> ${data.productName}</p>
            <p><strong>📊 Current Stock:</strong> 0 units</p>
            <p><strong>⚠️ Status:</strong> Sales suspended</p>
            <p><strong>🏃‍♂️ Action Required:</strong> Restock immediately to resume sales</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Inventory Management System</p>
          </div>
        </div>
      `
    },
    new_order: {
      subject: `🎉 New Order Received - #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🎉 New Order Received!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Congratulations on your sale!</p>
          </div>
          <div style="padding: 20px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #047857; margin-top: 0;">📋 Order Details</h2>
            <p><strong>🔢 Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>💰 Amount:</strong> ₹${data.totalAmount}</p>
            <p><strong>📦 Items:</strong> ${data.itemCount} item(s)</p>
            <p><strong>👤 Customer:</strong> ${data.customerName}</p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${data.dashboardUrl || '/dashboard'}" 
                 style="background: #10b981; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                📊 View Order Details
              </a>
            </div>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Order Management System</p>
          </div>
        </div>
      `
    },
    payout_processed: {
      subject: `💰 Payout Processed - ₹${data.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">💰 Payout Processed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your earnings have been transferred</p>
          </div>
          <div style="padding: 20px; background: #faf5ff; border: 1px solid #8b5cf6; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #5b21b6; margin-top: 0;">💳 Payment Details</h2>
            <p><strong>💰 Amount:</strong> ₹${data.amount}</p>
            <p><strong>🏦 Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>📅 Date:</strong> ${data.payoutDate || new Date().toLocaleDateString()}</p>
            <p><strong>✅ Status:</strong> Successfully Processed</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Payment System</p>
          </div>
        </div>
      `
    },
    order_cancelled: {
      subject: `❌ Order Cancelled - #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">❌ Order Cancelled</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Order has been cancelled by customer</p>
          </div>
          <div style="padding: 20px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #991b1b; margin-top: 0;">📋 Cancellation Details</h2>
            <p><strong>🔢 Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>📝 Reason:</strong> ${data.reason || 'Customer request'}</p>
            <p><strong>🕐 Cancelled At:</strong> ${data.cancelledAt || new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Order Management System</p>
          </div>
        </div>
      `
    },
    return_request: {
      subject: `🔄 Return Request - Order #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🔄 Return Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Customer initiated return request</p>
          </div>
          <div style="padding: 20px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #92400e; margin-top: 0;">📋 Return Details</h2>
            <p><strong>🔢 Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>📦 Product:</strong> ${data.productName}</p>
            <p><strong>📝 Return Reason:</strong> ${data.reason}</p>
            <p><strong>📹 Video Proof:</strong> ${data.videoUrl ? 'Provided' : 'Not provided'}</p>
            <p><strong>🕐 Requested At:</strong> ${data.requestedAt || new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Return Management System</p>
          </div>
        </div>
      `
    },
    refund_completed: {
      subject: `💰 Refund Completed - Order #${data.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">💰 Refund Completed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Refund has been processed successfully</p>
          </div>
          <div style="padding: 20px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #047857; margin-top: 0;">💸 Refund Details</h2>
            <p><strong>🔢 Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>💰 Refund Amount:</strong> ₹${data.refundAmount}</p>
            <p><strong>🏦 Method:</strong> ${data.refundMethod || 'Original payment method'}</p>
            <p><strong>📅 Processing Time:</strong> ${data.processingTime || '3-5 business days'}</p>
            <p><strong>🕐 Processed At:</strong> ${data.processedAt || new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Refund Management System</p>
          </div>
        </div>
      `
    },
    account_approved: {
      subject: `🎉 Account Approved - Welcome to Seller Portal!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Account Approved!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your KYC verification is complete</p>
          </div>
          <div style="padding: 20px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #047857; margin-top: 0;">✅ Account Details</h2>
            <p><strong>👤 Seller Name:</strong> ${data.sellerName}</p>
            <p><strong>📧 Email:</strong> ${data.email}</p>
            <p><strong>🆔 Seller ID:</strong> ${data.sellerId}</p>
            <p><strong>📅 Approved At:</strong> ${data.approvedAt || new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Welcome to Seller Portal - Let's grow together!</p>
          </div>
        </div>
      `
    },
    new_review: {
      subject: `⭐ New Review Received - ${data.rating}/5 Stars`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">⭐ New Review Received</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Customer feedback for your product</p>
          </div>
          <div style="padding: 20px; background: #f3f4f6; border: 1px solid #8b5cf6; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #5b21b6; margin-top: 0;">📝 Review Details</h2>
            <p><strong>📦 Product:</strong> ${data.productName}</p>
            <p><strong>⭐ Rating:</strong> ${data.rating}/5 Stars</p>
            <p><strong>💬 Comment:</strong> "${data.comment || 'No comment provided'}"</p>
            <p><strong>👤 Customer:</strong> ${data.customerName || 'Anonymous'}</p>
            <p><strong>🕐 Reviewed At:</strong> ${data.reviewedAt || new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
            <p>🚀 Seller Portal - Customer Feedback System</p>
          </div>
        </div>
      `
    }
  };
  
  const template = templates[type];
  
  return await sendEmailViaProxy({
    recipientEmail: sellerEmail,
    subject: template.subject,
    htmlContent: template.html,
    alertType: type
  });
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).proxyEmails = {
    send: sendEmailViaProxy,
    sendNotification: sendSellerNotificationViaProxy,
    test: async (email: string) => {
      return await sendEmailViaProxy({
        recipientEmail: email,
        subject: '🧪 Proxy Server Email Test',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; text-align: center; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 24px;">✅ Proxy Server Working!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Email sent via proxy server (no CORS issues)</p>
            </div>
            <div style="padding: 20px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; margin-top: 20px;">
              <h2 style="color: #0c4a6e; margin-top: 0;">🔧 Technical Details</h2>
              <p><strong>✅ Method:</strong> Proxy Server</p>
              <p><strong>🚫 CORS Issues:</strong> Resolved</p>
              <p><strong>🕐 Sent at:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>🔧 Environment:</strong> ${import.meta.env.MODE}</p>
            </div>
            <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
              <p>🚀 Seller Portal - Proxy Email Service</p>
            </div>
          </div>
        `,
        alertType: 'test'
      });
    }
  };
  
  console.log('📧 Proxy email functions available:');
  console.log('  proxyEmails.test("your@email.com") - Test proxy email');
  console.log('  proxyEmails.send({...}) - Send custom email');
}

export default {
  sendEmailViaProxy,
  sendSellerNotificationViaProxy
};