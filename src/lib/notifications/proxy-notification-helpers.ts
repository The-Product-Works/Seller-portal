/**
 * Updated Notification Helpers - Using Proxy Server (NO CORS Issues)
 * This replaces the previous helpers with a CORS-free solution
 */

import { supabase } from "@/integrations/supabase/client";
import { sendEmailViaProxy, sendSellerNotificationViaProxy } from "@/lib/notifications/proxy-email-service";

/**
 * Get seller email by seller ID - HARDCODED FOR TESTING
 */
async function getSellerEmail(sellerId: string): Promise<string | null> {
  // Always send to this email for testing
  const testEmail = '22052204@kiit.ac.in';
  
  console.log(`📧 Using hardcoded email for seller ${sellerId}: ${testEmail}`);
  
  // Optional: Also try to get actual seller email for logging
  try {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('email')
      .eq('id', sellerId)
      .single();
    
    if (seller?.email) {
      console.log(`📝 Seller's actual email: ${seller.email}, but using test email: ${testEmail}`);
    }
  } catch (error) {
    console.log('Could not fetch seller email from DB, using test email');
  }
  
  return testEmail;
}

/**
 * Send low stock alert to seller - PROXY VERSION (NO CORS)
 */
export async function sendLowStockAlert(params: {
  sellerId: string;
  productName: string;
  currentStock: number;
  productId: string;
}) {
  console.log('📧 Sending low stock alert via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'low_stock', {
      productName: params.productName,
      currentStock: params.currentStock
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          recipient_email: email,
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `⚠️ Low Stock Alert - ${params.productName}`,
          alert_type: 'low_stock_alert',
          related_product_id: params.productId,
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send out of stock alert to seller - PROXY VERSION (NO CORS)
 */
export async function sendOutOfStockAlert(params: {
  sellerId: string;
  productName: string;
  productId: string;
}) {
  console.log('📧 Sending out of stock alert via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'out_of_stock', {
      productName: params.productName
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          notification_type: 'email',
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `🚫 URGENT: ${params.productName} is Out of Stock`,
          alert_type: 'product_out_of_stock',
          related_product_id: params.productId,
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending out of stock alert:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send new order notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendNewOrderNotification(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  amount: number;
  customerName?: string;
}) {
  console.log('📧 Sending new order notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const orderData = {
      orderNumber: params.orderNumber,
      totalAmount: params.amount,
      itemCount: params.quantity,
      customerName: params.customerName || 'Customer',
      dashboardUrl: `/orders`
    };
    
    const result = await sendSellerNotificationViaProxy(email, 'new_order', orderData);
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          notification_type: 'email',
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `🎉 New Order Received - #${params.orderNumber}`,
          alert_type: 'new_order_received',
          related_order_id: params.orderId,
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending new order notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send payout processed notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendPayoutNotification(params: {
  sellerId: string;
  amount: number;
  transactionId: string;
}) {
  console.log('📧 Sending payout notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'payout_processed', {
      amount: params.amount,
      transactionId: params.transactionId
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          notification_type: 'email',
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `💰 Payout Processed - ₹${params.amount.toFixed(2)}`,
          alert_type: 'payout_processed',
          related_seller_id: params.sellerId,
          transaction_id: params.transactionId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending payout notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send return request notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendReturnRequestNotification(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  reason: string;
}) {
  console.log('📧 Sending return request notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'order_cancelled', {
      orderNumber: params.orderNumber,
      reason: `Return requested: ${params.reason}`
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          notification_type: 'email',
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `🔄 Return Request - Order #${params.orderNumber}`,
          alert_type: 'return_request_received',
          related_order_id: params.orderId,
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending return request notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send order cancellation notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendOrderCancelledNotification(params: {
  sellerId: string;
  orderNumber: string;
  productName: string;
  reason?: string;
  cancelledAt?: string;
}) {
  console.log('📧 Sending order cancelled notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'order_cancelled', {
      orderNumber: params.orderNumber,
      productName: params.productName,
      reason: params.reason,
      cancelledAt: params.cancelledAt
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          recipient_email: email,
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `❌ Order Cancelled - #${params.orderNumber}`,
          alert_type: 'order_cancelled',
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending order cancelled notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send refund completed notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendRefundCompletedNotification(params: {
  sellerId: string;
  orderNumber: string;
  refundAmount: number;
  refundMethod?: string;
  processingTime?: string;
  processedAt?: string;
}) {
  console.log('📧 Sending refund completed notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'refund_completed', {
      orderNumber: params.orderNumber,
      refundAmount: params.refundAmount,
      refundMethod: params.refundMethod,
      processingTime: params.processingTime,
      processedAt: params.processedAt
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          recipient_email: email,
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `💰 Refund Completed - Order #${params.orderNumber}`,
          alert_type: 'refund_completed',
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending refund completed notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send account approved notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendAccountApprovedNotification(params: {
  sellerId: string;
  sellerName: string;
  email: string;
  approvedAt?: string;
  dashboardLink?: string;
}) {
  console.log('📧 Sending account approved notification via proxy:', params);
  
  try {
    const result = await sendSellerNotificationViaProxy(params.email, 'account_approved', {
      sellerId: params.sellerId,
      sellerName: params.sellerName,
      email: params.email,
      approvedAt: params.approvedAt,
      dashboardLink: params.dashboardLink
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          recipient_email: params.email,
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `🎉 Account Approved - Welcome to Seller Portal!`,
          alert_type: 'account_approved',
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending account approved notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send new review notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendNewReviewNotification(params: {
  sellerId: string;
  productName: string;
  rating: number;
  comment?: string;
  customerName?: string;
  reviewedAt?: string;
  reviewLink?: string;
}) {
  console.log('📧 Sending new review notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'new_review', {
      productName: params.productName,
      rating: params.rating,
      comment: params.comment,
      customerName: params.customerName,
      reviewedAt: params.reviewedAt,
      reviewLink: params.reviewLink
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          recipient_email: email,
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `⭐ New Review Received - ${params.rating}/5 Stars`,
          alert_type: 'new_review',
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending new review notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send updated return request notification to seller - PROXY VERSION (NO CORS)
 */
export async function sendUpdatedReturnRequestNotification(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  reason: string;
  videoUrl?: string;
  requestedAt?: string;
  returnLink?: string;
}) {
  console.log('📧 Sending return request notification via proxy:', params);
  
  try {
    const email = await getSellerEmail(params.sellerId);
    if (!email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendSellerNotificationViaProxy(email, 'return_request', {
      orderNumber: params.orderNumber,
      productName: params.productName,
      reason: params.reason,
      videoUrl: params.videoUrl,
      requestedAt: params.requestedAt,
      returnLink: params.returnLink
    });
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          notification_type: 'email',
          recipient_type: 'seller',
          recipient_id: params.sellerId,
          subject: `🔄 Return Request - Order #${params.orderNumber}`,
          alert_type: 'return_request_received',
          related_order_id: params.orderId,
          related_seller_id: params.sellerId,
          status: 'sent'
        });
      } catch (dbError) {
        console.warn('Failed to log email to database:', dbError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending return request notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Export the proxy-based notification functions
export const proxyNotifications = {
  sendLowStockAlert,
  sendOutOfStockAlert,
  sendNewOrderNotification,
  sendPayoutNotification,
  sendReturnRequestNotification,
  sendOrderCancelledNotification,
  sendRefundCompletedNotification,
  sendAccountApprovedNotification,
  sendNewReviewNotification,
  sendUpdatedReturnRequestNotification
};

/**
 * Send Order Delivered notification to seller
 */
export async function sendOrderDeliveredNotification(params: {
  sellerId: string;
  orderNumber: string;
  deliveredDate: string;
  buyerName: string;
  totalAmount: number;
  productName: string;
  quantity: number;
  deliveryAddress: string;
  trackingId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: seller } = await supabase
      .from('sellers')
      .select('email, business_name')
      .eq('id', params.sellerId)
      .single();

    if (!seller?.email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendDirectEmail({
      recipientEmail: seller.email,
      subject: `✅ Order #${params.orderNumber} Delivered Successfully`,
      htmlContent: `
        <h2>Order Delivered</h2>
        <p>Hello ${seller.business_name || 'Seller'},</p>
        <p>Your order has been delivered successfully!</p>
        <ul>
          <li>Order: ${params.orderNumber}</li>
          <li>Delivered: ${params.deliveredDate}</li>
          <li>Customer: ${params.buyerName}</li>
          <li>Amount: ₹${params.totalAmount.toFixed(2)}</li>
        </ul>
      `,
      alertType: 'new_order_received'
    });

    return result;
  } catch (error) {
    console.error('Error sending order delivered notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send Order Cancelled by Seller notification
 */
export async function sendOrderCancelledBySellerNotification(params: {
  sellerId: string;
  orderNumber: string;
  cancelledDate: string;
  orderAmount: number;
  cancellationReason: string;
  buyerName: string;
  productName: string;
  quantity: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: seller } = await supabase
      .from('sellers')
      .select('email, business_name')
      .eq('id', params.sellerId)
      .single();

    if (!seller?.email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendDirectEmail({
      recipientEmail: seller.email,
      subject: `⚠️ Order #${params.orderNumber} Cancellation Confirmed`,
      htmlContent: `
        <h2>Order Cancellation Confirmed</h2>
        <p>Hello ${seller.business_name || 'Seller'},</p>
        <p>This confirms that you have cancelled order #${params.orderNumber}.</p>
        <ul>
          <li>Cancelled: ${params.cancelledDate}</li>
          <li>Amount: ₹${params.orderAmount.toFixed(2)}</li>
          <li>Reason: ${params.cancellationReason}</li>
        </ul>
      `,
      alertType: 'order_canceled_by_buyer'
    });

    return result;
  } catch (error) {
    console.error('Error sending order cancelled notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send Return Received notification to seller
 */
export async function sendReturnReceivedNotification(params: {
  sellerId: string;
  orderNumber: string;
  returnId: string;
  receivedDate: string;
  productName: string;
  quantity: number;
  returnReason: string;
  refundAmount: number;
  buyerName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: seller } = await supabase
      .from('sellers')
      .select('email, business_name')
      .eq('id', params.sellerId)
      .single();

    if (!seller?.email) {
      return { success: false, error: 'Seller email not found' };
    }

    const result = await sendDirectEmail({
      recipientEmail: seller.email,
      subject: `📦 Return Package Received - Order #${params.orderNumber}`,
      htmlContent: `
        <h2>Return Package Received</h2>
        <p>Hello ${seller.business_name || 'Seller'},</p>
        <p>A return package has been received for order #${params.orderNumber}.</p>
        <ul>
          <li>Return ID: ${params.returnId}</li>
          <li>Received: ${params.receivedDate}</li>
          <li>Product: ${params.productName}</li>
          <li>Reason: ${params.returnReason}</li>
          <li>Refund: ₹${params.refundAmount.toFixed(2)}</li>
        </ul>
      `,
      alertType: 'return_request_received'
    });

    return result;
  } catch (error) {
    console.error('Error sending return received notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}