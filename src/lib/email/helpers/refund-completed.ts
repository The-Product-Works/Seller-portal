/**
 * Refund Completed Email Helper
 * Generates and sends refund completion notification to buyer or seller
 */

import { generateRefundCompletedEmail } from '@/lib/email/templates/buyer/refund-completed';
import { sendEmail } from '@/services/email-service';
import { RecipientType } from '@/lib/email/types';

export interface RefundCompletedParams {
  recipientName: string;
  recipientEmail: string;
  recipientType: RecipientType;
  recipientId?: string;
  orderNumber: string; // Display version
  orderId: string; // Actual UUID for database
  refundAmount: number;
  refundMethod: string;
  refundDate: string;
  transactionId: string;
  orderUrl: string;
  sellerId?: string; // Actual seller UUID
}

export async function sendRefundCompletedEmail(params: RefundCompletedParams): Promise<void> {
  const { subject, html } = generateRefundCompletedEmail(params);

  await sendEmail({
    alertType: params.recipientType === 'seller' ? 'seller_refund_completed' : 'refund_completed',
    recipientEmail: params.recipientEmail,
    recipientType: params.recipientType,
    recipientId: params.recipientId,
    subject,
    htmlContent: html,
    relatedOrderId: params.orderId, // Use actual UUID for database
    relatedSellerId: params.sellerId, // Already a UUID
    transactionId: params.transactionId,
    metadata: {
      orderNumber: params.orderNumber, // Display version in metadata
      refundAmount: params.refundAmount,
      refundMethod: params.refundMethod,
      refundDate: params.refundDate,
    },
  });
}
