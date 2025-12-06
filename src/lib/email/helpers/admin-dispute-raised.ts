/**
 * Admin Dispute Raised Email Helper
 * Sends notification to admin when seller raises a dispute
 */

import {
  generateAdminDisputeRaisedEmail,
  type DisputeRaisedTemplateData,
} from '../templates/admin/admin-dispute-raised';
import { sendEmail } from '@/services/email-service';

export interface AdminDisputeRaisedParams {
  adminEmail: string;
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

export async function sendAdminDisputeRaisedEmail(
  params: AdminDisputeRaisedParams
): Promise<void> {
  try {
    console.log('[Admin Dispute Email] Preparing to send:', {
      adminEmail: params.adminEmail,
      disputeId: params.disputeId,
      severity: params.severity,
    });

    const templateData: DisputeRaisedTemplateData = {
      sellerName: params.sellerName,
      sellerEmail: params.sellerEmail,
      sellerId: params.sellerId,
      disputeId: params.disputeId,
      subject: params.subject,
      description: params.description,
      severity: params.severity,
      disputeType: params.disputeType,
      orderNumber: params.orderNumber,
      productName: params.productName,
      raisedAt: params.raisedAt,
      dashboardUrl: params.dashboardUrl,
      hasEvidence: params.hasEvidence,
      hasVideo: params.hasVideo,
    };

    const { subject, html } = generateAdminDisputeRaisedEmail(templateData);

    console.log('[Admin Dispute Email] Sending email via email service');

    await sendEmail({
      alertType: 'admin_dispute_raised',
      recipientEmail: params.adminEmail,
      recipientType: 'admin',
      subject,
      htmlContent: html,
      relatedSellerId: params.sellerId,
      relatedEntityId: params.disputeId,
      metadata: {
        disputeType: params.disputeType,
        severity: params.severity,
        orderNumber: params.orderNumber,
        productName: params.productName,
        hasEvidence: params.hasEvidence,
        hasVideo: params.hasVideo,
      },
    });

    console.log('[Admin Dispute Email] Email sent successfully');
  } catch (error) {
    console.error('[Admin Dispute Email] Failed to send:', error);
    throw error;
  }
}
