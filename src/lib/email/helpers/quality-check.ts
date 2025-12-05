/**
 * Quality Check Email Helper
 * Helper function for sending quality check results to buyers
 */

import { notificationService } from '../enhanced-notification-service';
import { generateBuyerOrderUrl } from '../utils';
import type { QualityCheckTemplateData, SendEmailResult } from '../types';

export interface SendQualityCheckEmailParams {
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  checkDate: string;
  status: 'passed' | 'failed';
  items: Array<{
    name: string;
    quantity: number;
    status: 'passed' | 'failed';
    notes?: string;
  }>;
  nextSteps: string;
}

export async function sendQualityCheckEmail(
  params: SendQualityCheckEmailParams
): Promise<SendEmailResult> {
  const {
    orderId,
    customerId,
    customerName,
    customerEmail,
    orderNumber,
    checkDate,
    status,
    items,
    nextSteps,
  } = params;

  const templateData: QualityCheckTemplateData = {
    customerName,
    orderNumber,
    checkDate,
    status,
    items,
    nextSteps,
    orderUrl: generateBuyerOrderUrl(orderId),
  };

  const alertType = status === 'passed' ? 'order_quality_check_passed' : 'order_quality_check_failed';

  return notificationService.sendNotification({
    type: alertType,
    recipientEmail: customerEmail,
    templateData,
    relatedOrderId: orderId,
    metadata: {
      orderNumber,
      qualityStatus: status,
      itemCount: items.length,
      failedItems: items.filter(item => item.status === 'failed').length,
    },
  });
}