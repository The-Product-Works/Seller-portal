/**
 * Order Cancelled Email Template
 * Sent to buyer when seller cancels an order
 */

import { OrderCancelledTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton, formatAmount } from '@/lib/email/template-utils';

export function generateOrderCancelledEmail(data: OrderCancelledTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `Order Cancelled - #${data.orderNumber}`;

  // Build order items HTML
  const itemsHtml = data.items
    .map(
      item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 600; color: #111827;">${item.name}</div>
        <div style="color: #6B7280; font-size: 14px;">Qty: ${item.quantity} × ${formatAmount(item.price)}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
        ${formatAmount(item.price * item.quantity)}
      </td>
    </tr>
  `
    )
    .join('');

  const cardContent = `
    <!-- Cancellation Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 18L18 6M6 6l12 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Order Cancelled
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      Hi <strong>${data.customerName}</strong>, your order #${data.orderNumber} has been cancelled.
    </p>

    <!-- Cancellation Details -->
    <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #EF4444;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #DC2626; font-size: 14px;">
        Cancellation Reason
      </p>
      <p style="margin: 0; color: #7F1D1D; font-size: 14px;">
        ${data.cancellationReason}
      </p>
    </div>

    <!-- Cancelled Items -->
    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Cancelled Items</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        ${itemsHtml}
      </table>
    </div>

    ${
      data.refundAmount
        ? `
    <!-- Refund Information -->
    <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #059669; font-size: 16px;">
        💰 Refund Information
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 4px 0; color: #166534; font-size: 14px;">Refund Amount</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #059669;">${formatAmount(data.refundAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #166534; font-size: 14px;">Refund Method</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #059669;">${data.refundMethod || 'Original payment method'}</td>
        </tr>
      </table>
      <p style="margin: 12px 0 0 0; color: #166534; font-size: 13px;">
        Your refund will be processed within 7-14 business days.
      </p>
    </div>
    `
        : ''
    }

    <!-- View Order Button -->
    ${buildActionButton(data.orderUrl, 'View Order Details')}

    <!-- Help Text -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      Have questions? <a href="mailto:support@trupromart.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
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
