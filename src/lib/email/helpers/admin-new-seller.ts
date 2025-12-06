/**
 * Admin New Seller Registration Email Helper
 * Generates and sends notification to admin when new seller registers
 */

import { generateAdminNewSellerEmail } from '@/lib/email/templates/admin/admin-new-seller-registration';
import { sendEmail } from '@/services/email-service';

export interface AdminNewSellerParams {
  adminName: string;
  adminEmail: string;
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  businessName?: string;
  registrationDate: string;
  sellerDashboardUrl: string;
}

export async function sendAdminNewSellerEmail(params: AdminNewSellerParams): Promise<void> {
  const { subject, html } = generateAdminNewSellerEmail(params);

  await sendEmail({
    alertType: 'admin_new_seller_registration',
    recipientEmail: params.adminEmail,
    recipientType: 'admin',
    subject,
    htmlContent: html,
    relatedSellerId: params.sellerId,
    metadata: {
      sellerName: params.sellerName,
      sellerEmail: params.sellerEmail,
      businessName: params.businessName,
      registrationDate: params.registrationDate,
    },
  });
}
