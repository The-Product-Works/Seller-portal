/**
 * Admin - Seller KYC Submitted Email Template
 * Sent to admin when a seller submits KYC documents
 */

import { buildEmailWrapper, buildActionButton, formatDate } from '@/lib/email/template-utils';

export interface SellerKYCSubmittedTemplateData {
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  businessName?: string;
  documentsSubmitted: string[]; // ['selfie', 'aadhaar', 'pan', 'gstin']
  submittedAt: string;
  dashboardUrl: string;
}

export function generateAdminSellerKYCEmail(data: SellerKYCSubmittedTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `KYC Submitted - ${data.sellerName}`;

  const cardContent = `
    <!-- Document Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      KYC Documents Submitted
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      A seller has submitted their KYC documents and is awaiting verification.
    </p>

    <!-- Seller Details -->
    <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400E; font-size: 14px;">⚠️ ACTION REQUIRED</p>
      <p style="margin: 0; color: #92400E; font-size: 14px;">Please review and verify the submitted documents.</p>
    </div>

    <!-- Seller Information -->
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
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Submitted At</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(data.submittedAt)}</td>
        </tr>
      </table>
    </div>

    <!-- Documents Submitted -->
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Documents Submitted</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${data.documentsSubmitted
          .map(
            (doc) => `
        <span style="display: inline-block; padding: 6px 12px; background: #DBEAFE; color: #1E40AF; border-radius: 6px; font-size: 13px; font-weight: 500;">
          ✓ ${doc.charAt(0).toUpperCase() + doc.slice(1)}
        </span>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Review Button -->
    ${buildActionButton(data.dashboardUrl, 'Review KYC Documents')}

    <!-- Instructions -->
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #6B7280; line-height: 1.6;">
        <strong style="color: #111827;">Verification Steps:</strong>
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6B7280; line-height: 1.8;">
        <li>Review all submitted documents for authenticity</li>
        <li>Verify Aadhaar and PAN details match</li>
        <li>Check business information if applicable</li>
        <li>Approve or reject the seller's KYC</li>
      </ul>
    </div>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: 'Admin Team',
    recipientEmail: import.meta.env.VITE_ADMIN_EMAIL || 'devops-team@theproductworks.in',
    content: cardContent,
  });

  return { subject, html };
}
