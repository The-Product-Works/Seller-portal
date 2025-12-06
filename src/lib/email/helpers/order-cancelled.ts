/**
 * Order Cancelled Email Helper
 * Generates and sends order cancellation notification to buyer
 */

import { generateOrderCancelledEmail } from '@/lib/email/templates/buyer/order-cancelled';
import { sendEmail } from '@/services/email-service';

export interface OrderCancelledParams {
  customerName: string;
  customerEmail: string;
  orderNumber: string; // Display version
  orderId: string; // Actual UUID for database
  cancellationReason: string;
  cancelledBy: 'seller' | 'buyer' | 'admin';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  refundAmount?: number;
  refundMethod?: string;
  orderUrl: string;
}

export async function sendOrderCancelledEmail(params: OrderCancelledParams): Promise<void> {
  const { subject, html } = generateOrderCancelledEmail(params);

  await sendEmail({
    alertType: 'order_cancelled',
    recipientEmail: params.customerEmail,
    recipientType: 'buyer',
    recipientId: undefined, // Buyer ID if available
    subject,
    htmlContent: html,
    relatedOrderId: params.orderId, // Use actual UUID for database
    metadata: {
      orderNumber: params.orderNumber, // Display version in metadata
      cancellationReason: params.cancellationReason,
      cancelledBy: params.cancelledBy,
      refundAmount: params.refundAmount,
    },
  });
}
