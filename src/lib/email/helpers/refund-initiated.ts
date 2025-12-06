/**
 * Refund Initiated Email Helper
 * Generates and sends refund initiation notification to buyer
 */

import { generateRefundInitiatedEmail } from '@/lib/email/templates/buyer/refund-initiated';
import { sendEmail } from '@/services/email-service';

export interface RefundInitiatedParams {
  customerName: string;
  customerEmail: string;
  orderNumber: string; // Display version
  orderId: string; // Actual UUID for database
  refundAmount: number;
  refundMethod: string;
  estimatedRefundDate: string;
  reason: string;
  orderUrl: string;
}

export async function sendRefundInitiatedEmail(params: RefundInitiatedParams): Promise<void> {
  const { subject, html } = generateRefundInitiatedEmail(params);

  await sendEmail({
    alertType: 'refund_initiated',
    recipientEmail: params.customerEmail,
    recipientType: 'buyer',
    recipientId: undefined, // Buyer ID if available
    subject,
    htmlContent: html,
    relatedOrderId: params.orderId, // Use actual UUID for database
    metadata: {
      orderNumber: params.orderNumber, // Display version in metadata
      refundAmount: params.refundAmount,
      refundMethod: params.refundMethod,
      estimatedRefundDate: params.estimatedRefundDate,
      reason: params.reason,
    },
  });
}
