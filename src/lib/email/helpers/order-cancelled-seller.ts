/**
 * Order Cancelled Email Helper (Seller)
 * Helper function for sending order cancellation notification to sellers
 */

import { notificationService } from '../enhanced-notification-service';
import type { OrderCancelledSellerTemplateData } from '../types';

export async function sendOrderCancelledSellerEmail(
  data: OrderCancelledSellerTemplateData
): Promise<{ success: boolean; error?: string }> {
  try {
    return await notificationService.sendNotification({
      type: 'order_canceled_by_buyer',
      recipientEmail: data.sellerEmail,
      templateData: data,
    });
  } catch (error) {
    console.error('Failed to send order cancelled (seller) email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}