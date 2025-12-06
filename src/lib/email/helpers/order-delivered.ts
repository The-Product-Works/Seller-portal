/**
 * Order Delivered Email Helper
 * Generates and sends order delivered notification to buyer
 */

import { generateOrderDeliveredEmail } from '@/lib/email/templates/buyer/order-delivered';
import { sendEmail } from '@/services/email-service';

export interface OrderDeliveredParams {
  customerName: string;
  customerEmail: string;
  orderNumber: string; // Display version
  orderId: string; // Actual UUID for database
  deliveryDate: string;
  items: Array<{
    name: string;
    quantity: number;
    imageUrl?: string;
  }>;
  orderUrl: string;
}

export async function sendOrderDeliveredEmail(params: OrderDeliveredParams): Promise<void> {
  const { subject, html } = generateOrderDeliveredEmail(params);

  await sendEmail({
    alertType: 'order_delivered',
    recipientEmail: params.customerEmail,
    recipientType: 'buyer',
    recipientId: undefined, // Buyer ID if available
    subject,
    htmlContent: html,
    relatedOrderId: params.orderId, // Use actual UUID for database
    metadata: {
      orderNumber: params.orderNumber, // Display version in metadata
      deliveryDate: params.deliveryDate,
    },
  });
}
