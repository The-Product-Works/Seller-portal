/**
 * Welcome Seller Email Helper
 * Generates and sends welcome email to new sellers
 */

import { generateWelcomeSellerEmail } from '@/lib/email/templates/seller/welcome-seller';
import { sendEmail } from '@/services/email-service';

export interface WelcomeSellerParams {
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  businessName?: string;
  dashboardUrl: string;
  kycUrl: string;
  supportEmail: string;
}

export async function sendWelcomeSellerEmail(params: WelcomeSellerParams): Promise<void> {
  const { subject, html } = generateWelcomeSellerEmail(params);

  await sendEmail({
    alertType: 'welcome',
    recipientEmail: params.sellerEmail,
    recipientType: 'seller',
    recipientId: params.sellerId,
    subject,
    htmlContent: html,
    relatedSellerId: params.sellerId,
    metadata: {
      businessName: params.businessName,
      registrationDate: new Date().toISOString(),
    },
  });
}
