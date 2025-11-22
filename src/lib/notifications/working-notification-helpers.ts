/**
 * Updated Notification Helpers - Using Working Email Solution
 * This replaces the existing notification-helpers.ts with working functions
 */

import { supabase } from "@/integrations/supabase/client";
import { workingNotifications } from "@/lib/notifications/working-email-fix";
import { format } from "date-fns";

/**
 * Send low stock alert to seller - WORKING VERSION
 */
export async function sendLowStockAlert(params: {
  sellerId: string;
  productName: string;
  currentStock: number;
  productId: string;
}) {
  console.log('📧 Sending low stock alert:', params);
  
  try {
    const result = await workingNotifications.sendLowStockAlert(
      params.sellerId,
      params.productName,
      params.currentStock
    );
    
    // Log to database for tracking
    if (result.success) {
      try {
        await supabase.from('email_notifications').insert({
          notification_type: 'email',
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
 * Send out of stock alert to seller - WORKING VERSION
 */
export async function sendOutOfStockAlert(params: {
  sellerId: string;
  productName: string;
  productId: string;
}) {
  console.log('📧 Sending out of stock alert:', params);
  
  try {
    const result = await workingNotifications.sendOutOfStockAlert(
      params.sellerId,
      params.productName
    );
    
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
 * Send new order notification to seller - WORKING VERSION
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
  console.log('📧 Sending new order notification:', params);
  
  try {
    const orderData = {
      orderNumber: params.orderNumber,
      totalAmount: params.amount,
      itemCount: params.quantity,
      customerName: params.customerName || 'Customer',
      dashboardUrl: `/orders`
    };
    
    const result = await workingNotifications.sendNewOrderNotification(
      params.sellerId,
      orderData
    );
    
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
 * Send payout processed notification to seller - WORKING VERSION
 */
export async function sendPayoutNotification(params: {
  sellerId: string;
  amount: number;
  transactionId: string;
}) {
  console.log('📧 Sending payout notification:', params);
  
  try {
    const result = await workingNotifications.sendPayoutNotification(
      params.sellerId,
      params.amount,
      params.transactionId
    );
    
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
 * Send return request notification to seller - WORKING VERSION
 */
export async function sendReturnRequestNotification(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  reason: string;
}) {
  console.log('📧 Sending return request notification:', params);
  
  try {
    const result = await workingNotifications.sendOrderCancelledNotification(
      params.sellerId,
      params.orderNumber,
      `Return requested: ${params.reason}`
    );
    
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

// Export the working notification functions
export const notifications = {
  sendLowStockAlert,
  sendOutOfStockAlert,
  sendNewOrderNotification,
  sendPayoutNotification,
  sendReturnRequestNotification
};