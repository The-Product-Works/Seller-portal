/**
 * Admin KYC Submitted Email Helper
 * Sends notification to admin when seller submits KYC
 */

import {
  generateAdminSellerKYCEmail,
  type SellerKYCSubmittedTemplateData,
} from '../templates/admin/admin-seller-kyc-submitted';
import { sendEmail } from '@/services/email-service';

export interface AdminKYCSubmittedParams {
  adminEmail: string;
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  businessName?: string;
  documentsSubmitted: string[];
  submittedAt: string;
  dashboardUrl: string;
}

export async function sendAdminKYCSubmittedEmail(
  params: AdminKYCSubmittedParams
): Promise<void> {
  try {
    console.log('[Admin KYC Email] Preparing to send:', {
      adminEmail: params.adminEmail,
      sellerId: params.sellerId,
    });

    const templateData: SellerKYCSubmittedTemplateData = {
      sellerName: params.sellerName,
      sellerEmail: params.sellerEmail,
      sellerId: params.sellerId,
      businessName: params.businessName,
      documentsSubmitted: params.documentsSubmitted,
      submittedAt: params.submittedAt,
      dashboardUrl: params.dashboardUrl,
    };

    const { subject, html } = generateAdminSellerKYCEmail(templateData);

    console.log('[Admin KYC Email] Sending email via email service');

    await sendEmail({
      alertType: 'admin_seller_kyc_submitted',
      recipientEmail: params.adminEmail,
      recipientType: 'admin',
      subject,
      htmlContent: html,
      relatedSellerId: params.sellerId,
      metadata: {
        sellerEmail: params.sellerEmail,
        documentsCount: params.documentsSubmitted.length,
        documents: params.documentsSubmitted,
      },
    });

    console.log('[Admin KYC Email] Email sent successfully');
  } catch (error) {
    console.error('[Admin KYC Email] Failed to send:', error);
    throw error;
  }
}
