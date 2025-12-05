/**
 * Order Packed Email Helper
 * Helper function for sending order packed notification to buyers
 */

import { notificationService } from '../enhanced-notification-service';
import type { OrderUpdateBuyerTemplateData } from '../types';

export async function sendOrderPackedEmail(
  data: OrderUpdateBuyerTemplateData
): Promise<{ success: boolean; error?: string }> {
  try {
    return await notificationService.sendNotification({
      type: 'order_confirmed', // Map to closest available type for now
      recipientEmail: data.customerEmail,
      templateData: data,
    });
  } catch (error) {
    console.error('Failed to send order packed email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}