/**
 * Order Cancelled Email Helper (Buyer)
 * Helper function for sending order cancellation notification to buyers
 */

import { notificationService } from '../enhanced-notification-service';
import type { OrderCancelledBuyerTemplateData } from '../types';

export async function sendOrderCancelledBuyerEmail(
  data: OrderCancelledBuyerTemplateData
): Promise<{ success: boolean; error?: string }> {
  try {
    return await notificationService.sendNotification({
      type: 'order_cancelled',
      recipientEmail: data.customerEmail,
      templateData: data,
    });
  } catch (error) {
    console.error('Failed to send order cancelled (buyer) email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}