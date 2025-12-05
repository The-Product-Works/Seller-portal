/**
 * Return Initiated Email Helper
 * Helper function for sending return request notification to sellers
 */

import { notificationService } from '../enhanced-notification-service';
import type { ReturnInitiatedSellerTemplateData } from '../types';

export async function sendReturnInitiatedEmail(
  data: ReturnInitiatedSellerTemplateData
): Promise<{ success: boolean; error?: string }> {
  try {
    return await notificationService.sendNotification({
      type: 'return_request_received',
      recipientEmail: data.sellerEmail,
      templateData: data,
    });
  } catch (error) {
    console.error('Failed to send return initiated email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}