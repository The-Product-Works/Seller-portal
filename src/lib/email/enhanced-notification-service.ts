/**
 * Enhanced Email Notification Service for Seller Portal
 * Updated version with template mapping support
 */

import { supabaseSeller as supabase } from '@/integrations/supabase/supabaseSeller';
import type {
  AlertType,
  RecipientType,
  EmailTemplateData,
  SendEmailResult,
} from './types';
import { generateEmailContent, hasTemplate } from './template-mapping-service';

/**
 * Enhanced notification parameters that support template data
 */
export interface EnhancedNotificationParams {
  type: AlertType;
  recipientEmail?: string;
  recipientId?: string;
  templateData: EmailTemplateData;
  customSubject?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  relatedSellerId?: string;
  relatedEntityId?: string;
  trackingId?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send notification using template data (New Recommended Approach)
 */
export async function sendNotificationWithTemplate(
  params: EnhancedNotificationParams
): Promise<SendEmailResult> {
  const {
    type: alertType,
    recipientEmail,
    recipientId,
    templateData,
    customSubject,
    relatedOrderId,
    relatedProductId,
    relatedSellerId,
    relatedEntityId,
    trackingId,
    transactionId,
    metadata = {},
  } = params;

  try {
    // Check if template exists
    if (!hasTemplate(alertType)) {
      throw new Error(`No email template found for alert type: ${alertType}`);
    }

    // Generate email content using template mapping service
    const { htmlContent, subject, recipientType } = generateEmailContent(alertType, templateData);

    // Use custom subject if provided
    const finalSubject = customSubject || subject;

    console.log(`Sending ${alertType} email to ${recipientEmail}...`);

    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        recipientEmail,
        recipientId,
        recipientType,
        alertType,
        subject: finalSubject,
        htmlContent,
        relatedOrderId,
        relatedProductId,
        relatedSellerId,
        relatedEntityId,
        trackingId,
        transactionId,
        metadata: {
          ...metadata,
          templateGenerated: true,
          templateVersion: '2.0',
        },
      },
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`,
      };
    }

    console.log(`${alertType} email sent successfully to ${recipientEmail}`);

    return {
      success: true,
      messageId: data?.messageId || 'generated',
      notificationId: data?.notificationId,
    };
  } catch (error) {
    console.error(`Failed to send ${alertType} email:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Enhanced notification service class with template support
 */
export class NotificationService {
  /**
   * Send a notification using alert type and template data
   */
  async sendNotification(params: EnhancedNotificationParams): Promise<SendEmailResult> {
    return sendNotificationWithTemplate(params);
  }

  /**
   * Send notifications in bulk
   */
  async sendBulkNotifications(
    notifications: EnhancedNotificationParams[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`Sending ${notifications.length} bulk notifications...`);

    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        success++;
      } else {
        failed++;
        const errorMessage = result.status === 'fulfilled'
          ? result.value.error
          : result.reason?.message || 'Unknown error';

        errors.push(`Email ${index + 1}: ${errorMessage}`);
      }
    });

    console.log(`Bulk send complete: ${success} successful, ${failed} failed`);

    return { success, failed, errors };
  }

  /**
   * Send notification with retry logic
   */
  async sendNotificationWithRetry(
    params: EnhancedNotificationParams,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<SendEmailResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendNotification(params);

        if (result.success) {
          if (attempt > 1) {
            console.log(`Email sent successfully on attempt ${attempt}`);
          }
          return result;
        }

        lastError = new Error(result.error || 'Unknown error');

        if (attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError?.message}`,
    };
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipientEmail: string): Promise<SendEmailResult> {
    const testTemplateData = {
      sellerName: 'Test Seller',
      sellerEmail: recipientEmail,
      approvalDate: new Date().toISOString(),
      dashboardUrl: 'https://sellerportal.com/dashboard',
      supportUrl: 'https://sellerportal.com/support',
    };

    return this.sendNotification({
      type: 'account_approved',
      recipientEmail,
      templateData: testTemplateData,
      customSubject: 'Test Email - Seller Portal',
      metadata: { isTest: true },
    });
  }
}

// Create singleton instance
export const notificationService = new NotificationService();