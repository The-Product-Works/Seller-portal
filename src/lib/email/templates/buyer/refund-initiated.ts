/**
 * Refund Initiated Email Template
 * Sent to buyer when refund process starts
 */

import { RefundInitiatedTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton, formatAmount } from '@/lib/email/template-utils';

export function generateRefundInitiatedEmail(data: RefundInitiatedTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `Refund Initiated - Order #${data.orderNumber}`;

  const cardContent = `
    <!-- Refund Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Refund Initiated
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      Hi <strong>${data.customerName}</strong>, your refund request has been approved and initiated.
    </p>

    <!-- Refund Details -->
    <div style="background: #FFFBEB; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #78350F; font-size: 14px;">Order Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #92400E;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #78350F; font-size: 14px;">Refund Amount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #D97706; font-size: 18px;">${formatAmount(data.refundAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #78350F; font-size: 14px;">Refund Method</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #92400E;">${data.refundMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #78350F; font-size: 14px;">Expected Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #92400E;">${data.estimatedRefundDate}</td>
        </tr>
      </table>
    </div>

    <!-- Reason -->
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827; font-size: 14px;">
        Refund Reason
      </p>
      <p style="margin: 0; color: #6B7280; font-size: 14px;">
        ${data.reason}
      </p>
    </div>

    <!-- Timeline -->
    <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #1E40AF; font-size: 16px;">
        ⏱️ What Happens Next?
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #1E3A8A; font-size: 14px;">
        <li style="margin-bottom: 8px;">Your refund is being processed by our payment team</li>
        <li style="margin-bottom: 8px;">Amount will be credited to your ${data.refundMethod}</li>
        <li style="margin-bottom: 8px;">You'll receive a confirmation email once completed</li>
        <li>Estimated completion: ${data.estimatedRefundDate}</li>
      </ul>
    </div>

    <!-- View Order Button -->
    ${buildActionButton(data.orderUrl, 'View Order Details')}

    <!-- Help Text -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      Questions about your refund? <a href="mailto:support@trupromart.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
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
