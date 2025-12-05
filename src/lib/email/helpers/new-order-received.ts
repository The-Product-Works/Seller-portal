/**
 * New Order Received Email Helper
 * Helper function for sending new order notification to sellers
 */

import { notificationService } from '../enhanced-notification-service';
import type { NewOrderSellerTemplateData } from '../types';

export async function sendNewOrderReceivedEmail(
  data: NewOrderSellerTemplateData
): Promise<{ success: boolean; error?: string }> {
  try {
    return await notificationService.sendNotification({
      type: 'new_order_received',
      recipientEmail: data.sellerEmail,
      templateData: data,
    });
  } catch (error) {
    console.error('Failed to send new order received email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}