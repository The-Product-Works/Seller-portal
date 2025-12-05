/**
 * Account Approved Email Helper
 * Helper function for sending account approval emails to sellers
 */

import { notificationService } from '../enhanced-notification-service';
import { generateSellerDashboardUrl, generateSupportUrl } from '../utils';
import type { AccountApprovedTemplateData, SendEmailResult } from '../types';

export interface SendAccountApprovedEmailParams {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  approvalDate?: string;
}

export async function sendAccountApprovedEmail(
  params: SendAccountApprovedEmailParams
): Promise<SendEmailResult> {
  const { sellerId, sellerName, sellerEmail, approvalDate } = params;

  const templateData: AccountApprovedTemplateData = {
    sellerName,
    sellerEmail,
    approvalDate: approvalDate || new Date().toISOString(),
    dashboardUrl: generateSellerDashboardUrl(),
    supportUrl: generateSupportUrl(),
  };

  return notificationService.sendNotification({
    type: 'account_approved',
    recipientEmail: sellerEmail,
    templateData,
    relatedSellerId: sellerId,
    metadata: {
      sellerName,
      approvalDate: templateData.approvalDate,
    },
  });
}