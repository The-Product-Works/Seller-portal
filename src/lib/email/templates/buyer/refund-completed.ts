/**
 * Refund Completed Email Template
 * Sent to buyer and seller when refund is processed
 */

import { RefundCompletedTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton, formatAmount } from '@/lib/email/template-utils';

export function generateRefundCompletedEmail(data: RefundCompletedTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `Refund Completed - Order #${data.orderNumber} ✅`;

  const isSeller = data.recipientType === 'seller';

  const cardContent = `
    <!-- Success Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Refund Completed Successfully!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      Hi <strong>${data.recipientName}</strong>, the refund for order #${data.orderNumber} has been processed.
    </p>

    <!-- Refund Details -->
    <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #10B981;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Order Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #065F46;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Refund Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669; font-size: 20px;">${formatAmount(data.refundAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Refund Method</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #065F46;">${data.refundMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Completion Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #065F46;">${data.refundDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Transaction ID</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #065F46; font-size: 12px;">${data.transactionId}</td>
        </tr>
      </table>
    </div>

    ${
      !isSeller
        ? `
    <!-- What's Next (Buyer) -->
    <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #1E40AF; font-size: 16px;">
        💳 When will I see my refund?
      </p>
      <p style="margin: 0; color: #1E3A8A; font-size: 14px; line-height: 1.6;">
        The refund has been processed and should appear in your ${data.refundMethod} within 2-5 business days, depending on your bank's processing time.
      </p>
    </div>
    `
        : `
    <!-- Seller Notice -->
    <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400E; font-size: 16px;">
        ℹ️ Seller Notice
      </p>
      <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.6;">
        The refund amount has been deducted from your pending payout. This transaction is recorded in your seller dashboard.
      </p>
    </div>
    `
    }

    <!-- View Order Button -->
    ${buildActionButton(data.orderUrl, isSeller ? 'View in Dashboard' : 'View Order Details')}

    <!-- Help Text -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      Have questions? <a href="mailto:support@trupromart.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
    </p>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    content: cardContent,
  });

  return { subject, html };
}
