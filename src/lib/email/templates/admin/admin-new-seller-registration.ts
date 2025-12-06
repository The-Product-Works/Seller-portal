/**
 * Admin - New Seller Registration Email Template
 * Sent to admin when a new seller registers
 */

import { NewSellerRegistrationTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton } from '@/lib/email/template-utils';

export function generateAdminNewSellerEmail(data: NewSellerRegistrationTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `New Seller Registration - ${data.sellerName}`;

  const cardContent = `
    <!-- Alert Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      New Seller Registration
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      A new seller has registered on the platform and requires verification.
    </p>

    <!-- Seller Details -->
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Seller Name</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.sellerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.sellerEmail}</td>
        </tr>
        ${
          data.businessName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Business Name</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.businessName}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Seller ID</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #667eea;">${data.sellerId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Registration Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.registrationDate}</td>
        </tr>
      </table>
    </div>

    <!-- Action Required -->
    <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #F59E0B;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400E; font-size: 16px;">
        ⚠️ Action Required
      </p>
      <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.6;">
        Please review this seller's registration and KYC documents (when submitted) to approve or reject their account.
      </p>
    </div>

    <!-- View Seller Button -->
    ${buildActionButton(data.sellerDashboardUrl, 'Review Seller Profile')}

    <!-- Help Text -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      This is an automated admin notification from TruProMart Seller Portal
    </p>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: data.adminName,
    recipientEmail: data.adminEmail,
    content: cardContent,
  });

  return { subject, html };
}
