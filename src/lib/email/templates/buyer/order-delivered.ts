/**
 * Order Delivered Email Template
 * Sent to buyer when seller marks order as delivered
 */

import { OrderDeliveredTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton } from '@/lib/email/template-utils';

export function generateOrderDeliveredEmail(data: OrderDeliveredTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `Order Delivered - #${data.orderNumber} ✅`;

  // Build order items HTML
  const itemsHtml = data.items
    .map(
      item => `
    <div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
      <div style="font-weight: 600; color: #111827;">${item.name}</div>
      <div style="color: #6B7280; font-size: 14px;">Quantity: ${item.quantity}</div>
    </div>
  `
    )
    .join('');

  const cardContent = `
    <!-- Delivery Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Order Delivered Successfully!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      Hi <strong>${data.customerName}</strong>! Your order has been delivered on <strong>${data.deliveryDate}</strong>.
    </p>

    <!-- Delivery Details -->
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Order Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Delivery Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10B981;">${data.deliveryDate}</td>
        </tr>
      </table>
    </div>

    <!-- Delivered Items -->
    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Items delivered</h3>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        ${itemsHtml}
      </div>
    </div>

    <!-- View Order Button -->
    ${buildActionButton(data.orderUrl, 'View Order & Leave a Review')}

    <!-- Feedback Request -->
    <div style="background: #EBF8FF; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1E40AF;">
        ⭐ How was your experience?
      </p>
      <p style="margin: 0; font-size: 14px; color: #3B82F6;">
        We'd love to hear your feedback! Please rate and review your purchase.
      </p>
    </div>

    <!-- Help Text -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      Have an issue with your order? <a href="mailto:support@trupromart.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
    </p>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: data.customerName,
    recipientEmail: data.customerEmail,
    content: cardContent,
  });

  return { subject, html };
}
