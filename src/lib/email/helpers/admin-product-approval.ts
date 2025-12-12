/**
 * Admin Product Approval Required Email Helper
 * Sends notification to admin when seller submits new product or updates existing product
 */

import {
  generateAdminProductApprovalEmail,
  type ProductApprovalRequiredTemplateData,
} from '../templates/admin/admin-product-approval-required';
import { sendEmail } from '@/services/email-service';

export interface AdminProductApprovalParams {
  adminEmail: string;
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  productName: string;
  listingId: string;
  isNewProduct: boolean;
  globalProductName: string;
  brandName: string;
  categoryName?: string;
  variantCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  totalStock: number;
  discountPercentage?: number;
  submittedAt: string;
  dashboardUrl: string;
  productDescription?: string;
}

export async function sendAdminProductApprovalEmail(
  params: AdminProductApprovalParams
): Promise<void> {
  try {
    console.log('[Admin Product Approval Email] Preparing to send:', {
      adminEmail: params.adminEmail,
      listingId: params.listingId,
      isNewProduct: params.isNewProduct,
    });

    const templateData: ProductApprovalRequiredTemplateData = {
      sellerName: params.sellerName,
      sellerEmail: params.sellerEmail,
      sellerId: params.sellerId,
      productName: params.productName,
      listingId: params.listingId,
      isNewProduct: params.isNewProduct,
      globalProductName: params.globalProductName,
      brandName: params.brandName,
      categoryName: params.categoryName,
      variantCount: params.variantCount,
      priceRange: params.priceRange,
      totalStock: params.totalStock,
      discountPercentage: params.discountPercentage,
      submittedAt: params.submittedAt,
      dashboardUrl: params.dashboardUrl,
      productDescription: params.productDescription,
    };

    const { subject, html } = generateAdminProductApprovalEmail(templateData);

    console.log('[Admin Product Approval Email] Sending email via email service');

    await sendEmail({
      alertType: 'admin_product_approval_required',
      recipientEmail: params.adminEmail,
      recipientType: 'admin',
      subject,
      htmlContent: html,
      relatedSellerId: params.sellerId,
      relatedProductId: params.listingId,
      metadata: {
        isNewProduct: params.isNewProduct,
        productName: params.productName,
        globalProductName: params.globalProductName,
        brandName: params.brandName,
        variantCount: params.variantCount,
        totalStock: params.totalStock,
      },
    });

    console.log('[Admin Product Approval Email] Email sent successfully');
  } catch (error) {
    console.error('[Admin Product Approval Email] Failed to send:', error);
    throw error;
  }
}
