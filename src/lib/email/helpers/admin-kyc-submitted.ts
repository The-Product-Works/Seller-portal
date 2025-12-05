/**
 * Admin KYC Submitted Email Helper
 * Helper function for notifying admins when sellers submit KYC documents
 */

import { notificationService } from '../enhanced-notification-service';
import { generateAdminDashboardUrl } from '../utils';
import type { AdminKYCSubmittedTemplateData, SendEmailResult } from '../types';

export interface SendAdminKYCSubmittedEmailParams {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  adminId?: string;
  adminName: string;
  adminEmail: string;
  submissionDate?: string;
  documentsSubmitted: string[];
}

export async function sendAdminKYCSubmittedEmail(
  params: SendAdminKYCSubmittedEmailParams
): Promise<SendEmailResult> {
  const {
    sellerId,
    sellerName,
    sellerEmail,
    adminId,
    adminName,
    adminEmail,
    submissionDate,
    documentsSubmitted,
  } = params;

  const templateData: AdminKYCSubmittedTemplateData = {
    adminName,
    sellerName,
    sellerEmail,
    submissionDate: submissionDate || new Date().toISOString(),
    documentsSubmitted,
    reviewUrl: generateAdminDashboardUrl('kyc-review', sellerId),
  };

  return notificationService.sendNotification({
    type: 'admin_kyc_submitted',
    recipientEmail: adminEmail,
    templateData,
    relatedSellerId: sellerId,
    metadata: {
      sellerName,
      sellerEmail,
      documentsSubmitted,
      submissionDate: templateData.submissionDate,
    },
  });
}

/**
 * Send KYC submission notification to multiple admins
 */
export async function sendAdminKYCSubmittedEmailToMultiple(
  params: Omit<SendAdminKYCSubmittedEmailParams, 'adminId' | 'adminName' | 'adminEmail'> & {
    admins: Array<{
      adminId?: string;
      adminName: string;
      adminEmail: string;
    }>;
  }
): Promise<{ success: number; failed: number; errors: string[] }> {
  const { admins, ...baseParams } = params;

  const emailPromises = admins.map(admin =>
    sendAdminKYCSubmittedEmail({
      ...baseParams,
      ...admin,
    })
  );

  const results = await Promise.allSettled(emailPromises);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      success++;
    } else {
      failed++;
      const errorMessage = result.status === 'fulfilled' 
        ? result.value.error 
        : result.reason?.message || 'Unknown error';
      
      errors.push(`Admin ${index + 1} (${admins[index].adminEmail}): ${errorMessage}`);
    }
  });

  return { success, failed, errors };
}