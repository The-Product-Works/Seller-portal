/**
 * Admin - Dispute Raised Email Template
 * Sent to admin when a seller raises a dispute
 */

import { buildEmailWrapper, buildActionButton, formatDate } from '@/lib/email/template-utils';

export interface DisputeRaisedTemplateData {
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  disputeId: string;
  subject: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  disputeType: 'order' | 'product' | 'earnings' | 'platform';
  orderNumber?: string;
  productName?: string;
  raisedAt: string;
  dashboardUrl: string;
  hasEvidence: boolean;
  hasVideo: boolean;
}

const severityConfig = {
  low: { color: '#10B981', bgColor: '#D1FAE5', label: 'Low Priority' },
  medium: { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Medium Priority' },
  high: { color: '#EF4444', bgColor: '#FEE2E2', label: 'High Priority' },
  critical: { color: '#DC2626', bgColor: '#FEE2E2', label: '🚨 CRITICAL' },
};

export function generateAdminDisputeRaisedEmail(data: DisputeRaisedTemplateData): {
  subject: string;
  html: string;
} {
  const severityInfo = severityConfig[data.severity];
  const subject = `[${severityInfo.label}] Dispute Raised - ${data.subject}`;

  const cardContent = `
    <!-- Alert Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, ${severityInfo.color} 0%, ${severityInfo.color}dd 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 9v4M12 17h.01" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Dispute Raised
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      A seller has raised a ${data.severity} priority dispute that requires attention.
    </p>

    <!-- Severity Alert -->
    <div style="background: ${severityInfo.bgColor}; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid ${severityInfo.color};">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: ${severityInfo.color}; font-size: 14px;">
        ${data.severity === 'critical' ? '🚨 CRITICAL - IMMEDIATE ACTION REQUIRED' : '⚠️ ACTION REQUIRED'}
      </p>
      <p style="margin: 0; color: ${severityInfo.color}; font-size: 14px;">
        Severity: ${severityInfo.label}
      </p>
    </div>

    <!-- Dispute Details -->
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Dispute ID</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #667eea;">${data.disputeId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Raised By</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.sellerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.sellerEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Type</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.disputeType.charAt(0).toUpperCase() + data.disputeType.slice(1)}</td>
        </tr>
        ${
          data.orderNumber
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Order</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #667eea;">#${data.orderNumber}</td>
        </tr>
        `
            : ''
        }
        ${
          data.productName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Product</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.productName}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Raised At</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(data.raisedAt)}</td>
        </tr>
      </table>
    </div>

    <!-- Dispute Subject & Description -->
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Subject</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #374151; line-height: 1.6;">${data.subject}</p>
      
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Description</h3>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${data.description}</p>
    </div>

    <!-- Evidence Available -->
    ${
      data.hasEvidence || data.hasVideo
        ? `
    <div style="background: #EFF6FF; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #3B82F6;">
      <p style="margin: 0; font-size: 14px; color: #1E40AF;">
        📎 Evidence attached: 
        ${data.hasEvidence ? 'Images' : ''}
        ${data.hasEvidence && data.hasVideo ? ' & ' : ''}
        ${data.hasVideo ? 'Video' : ''}
      </p>
    </div>
    `
        : ''
    }

    <!-- Review Button -->
    ${buildActionButton(data.dashboardUrl, 'Review Dispute')}

    <!-- Instructions -->
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #6B7280; line-height: 1.6;">
        <strong style="color: #111827;">Next Steps:</strong>
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6B7280; line-height: 1.8;">
        <li>Review the dispute details and evidence</li>
        <li>Contact the seller if additional information is needed</li>
        <li>Investigate the issue thoroughly</li>
        <li>Resolve or escalate the dispute</li>
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
