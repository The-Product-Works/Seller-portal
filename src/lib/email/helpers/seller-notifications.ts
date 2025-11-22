/**
 * Seller Email Notification Helpers
 * Easy-to-use functions for sending all seller notifications
 */

import { sendEmail } from '@/lib/notifications';

// Define EmailResult type locally since it's not exported from notifications
interface EmailResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

// Import all seller templates
import {
  generateNewOrderReceivedEmail,
  type NewOrderReceivedData,
} from '../templates/seller/new-order-received';
import {
  generateOrderCancelledEmail,
  type OrderCancelledData,
} from '../templates/seller/order-cancelled';
import {
  generateReturnRequestEmail,
  type ReturnRequestData,
} from '../templates/seller/return-request';
import {
  generateRefundCompletedEmail,
  type RefundCompletedData,
} from '../templates/seller/refund-completed';
import {
  generateLowStockAlertEmail,
  type LowStockAlertData,
} from '../templates/seller/low-stock-alert';
import {
  generateOutOfStockEmail,
  type OutOfStockData,
} from '../templates/seller/out-of-stock';
import {
  generateAccountApprovedEmail,
  type AccountApprovedData,
} from '../templates/seller/account-approved';
import {
  generateNewReviewEmail,
  type NewReviewData,
} from '../templates/seller/new-review';
import {
  generatePayoutProcessedEmail,
  type PayoutProcessedData,
} from '../templates/seller/payout-processed';

/**
 * Send New Order Received notification to seller
 * Triggered when a new order is placed
 */
export async function sendNewOrderNotification(
  sellerId: string,
  sellerEmail: string,
  data: NewOrderReceivedData
): Promise<EmailResult> {
  const html = generateNewOrderReceivedEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'new_order_received',
    subject: `🎉 New Order #${data.orderNumber} Received!`,
    htmlContent: html,
    relatedOrderId: data.orderNumber,
  });
}

/**
 * Send Order Cancelled notification to seller
 * Triggered when buyer cancels an order
 */
export async function sendOrderCancelledNotification(
  sellerId: string,
  sellerEmail: string,
  data: OrderCancelledData
): Promise<EmailResult> {
  const html = generateOrderCancelledEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'order_canceled_by_buyer',
    subject: `Order #${data.orderNumber} Cancelled by Buyer`,
    htmlContent: html,
    relatedOrderId: data.orderNumber,
  });
}

/**
 * Send Return Request notification to seller
 * Triggered when buyer initiates a return
 */
export async function sendReturnRequestNotification(
  sellerId: string,
  sellerEmail: string,
  data: ReturnRequestData
): Promise<EmailResult> {
  const html = generateReturnRequestEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'return_request_received',
    subject: `🔄 Return Request for Order #${data.orderNumber}`,
    htmlContent: html,
    relatedOrderId: data.orderNumber,
  });
}

/**
 * Send Refund Completed notification to seller
 * Triggered when refund is successfully processed
 */
export async function sendRefundCompletedNotification(
  sellerId: string,
  sellerEmail: string,
  data: RefundCompletedData
): Promise<EmailResult> {
  const html = generateRefundCompletedEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'seller_refund_completed',
    subject: `✅ Refund Completed for Order #${data.orderNumber}`,
    htmlContent: html,
    relatedOrderId: data.orderNumber,
    transactionId: data.refundId,
  });
}

/**
 * Send Low Stock Alert to seller
 * Triggered when product stock reaches threshold
 */
export async function sendLowStockAlert(
  sellerId: string,
  sellerEmail: string,
  data: LowStockAlertData
): Promise<EmailResult> {
  const html = generateLowStockAlertEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'low_stock_alert',
    subject: `⚠️ Low Stock Alert: ${data.productName}`,
    htmlContent: html,
  });
}

/**
 * Send Out of Stock notification to seller
 * Triggered when product inventory hits zero
 */
export async function sendOutOfStockAlert(
  sellerId: string,
  sellerEmail: string,
  data: OutOfStockData
): Promise<EmailResult> {
  const html = generateOutOfStockEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'product_out_of_stock',
    subject: `🚫 URGENT: ${data.productName} is Out of Stock`,
    htmlContent: html,
  });
}

/**
 * Send Account Approved notification to seller
 * Triggered after successful KYC verification
 */
export async function sendAccountApprovedNotification(
  sellerId: string,
  sellerEmail: string,
  data: AccountApprovedData
): Promise<EmailResult> {
  const html = generateAccountApprovedEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'account_approved',
    subject: `🎉 Congratulations! Your Seller Account is Approved`,
    htmlContent: html,
  });
}

/**
 * Send New Review notification to seller
 * Triggered when buyer submits a rating/review
 */
export async function sendNewReviewNotification(
  sellerId: string,
  sellerEmail: string,
  data: NewReviewData
): Promise<EmailResult> {
  const html = generateNewReviewEmail(data);

  const ratingEmoji = data.rating >= 4 ? '⭐' : data.rating >= 3 ? '😊' : '📝';

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'new_review_rating',
    subject: `${ratingEmoji} New ${data.rating}-Star Review for ${data.productName}`,
    htmlContent: html,
    relatedOrderId: data.orderNumber,
  });
}

/**
 * Send Payout Processed notification to seller
 * Triggered when earnings transfer is completed
 */
export async function sendPayoutProcessedNotification(
  sellerId: string,
  sellerEmail: string,
  data: PayoutProcessedData
): Promise<EmailResult> {
  const html = generatePayoutProcessedEmail(data);

  return await sendEmail({
    recipientEmail: sellerEmail,
    recipientId: sellerId,
    recipientType: 'seller',
    alertType: 'payout_processed',
    subject: `💰 Payout of ₹${data.netAmount.toFixed(2)} Processed Successfully`,
    htmlContent: html,
    transactionId: data.payoutId,
  });
}

// Export all data types for easy importing
export type {
  NewOrderReceivedData,
  OrderCancelledData,
  ReturnRequestData,
  RefundCompletedData,
  LowStockAlertData,
  OutOfStockData,
  AccountApprovedData,
  NewReviewData,
  PayoutProcessedData,
};
