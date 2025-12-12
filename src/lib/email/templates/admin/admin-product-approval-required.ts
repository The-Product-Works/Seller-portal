/**
 * Admin - Product Approval Required Email Template
 * Sent to admin when seller adds new product or updates existing product requiring approval
 */

import { buildEmailWrapper, buildActionButton, formatDate, formatAmount } from '@/lib/email/template-utils';

export interface ProductApprovalRequiredTemplateData {
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  productName: string;
  listingId: string;
  isNewProduct: boolean; // true = new product, false = update
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

export function generateAdminProductApprovalEmail(data: ProductApprovalRequiredTemplateData): {
  subject: string;
  html: string;
} {
  const actionType = data.isNewProduct ? 'New Product Submission' : 'Product Update';
  const subject = `${actionType} - ${data.productName} (Approval Required)`;

  const cardContent = `
    <!-- Product Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, ${data.isNewProduct ? '#10B981' : '#3B82F6'} 0%, ${data.isNewProduct ? '#059669' : '#2563EB'} 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${data.isNewProduct 
            ? '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
            : '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
          }
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      ${data.isNewProduct ? 'New Product Submitted' : 'Product Updated'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      ${data.isNewProduct 
        ? 'A seller has submitted a new product listing for approval.'
        : 'A seller has updated an existing product listing that requires re-approval.'}
    </p>

    <!-- Action Alert -->
    <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400E; font-size: 14px;">⚠️ APPROVAL REQUIRED</p>
      <p style="margin: 0; color: #92400E; font-size: 14px;">Please review and approve/reject this product listing.</p>
    </div>

    <!-- Product Details -->
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Product Name</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.productName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Global Product</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.globalProductName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Brand</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.brandName}</td>
        </tr>
        ${
          data.categoryName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Category</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.categoryName}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Listing ID</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #667eea;">${data.listingId}</td>
        </tr>
      </table>
    </div>

    <!-- Seller Information -->
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Seller Information</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Seller Name</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.sellerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.sellerEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Submitted At</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(data.submittedAt)}</td>
        </tr>
      </table>
    </div>

    <!-- Product Stats -->
    <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Product Statistics</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Variants</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.variantCount} variant${data.variantCount !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Price Range</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatAmount(data.priceRange.min)} - ${formatAmount(data.priceRange.max)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Total Stock</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.totalStock} units</td>
        </tr>
        ${
          data.discountPercentage && data.discountPercentage > 0
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Discount</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10B981;">${data.discountPercentage}% OFF</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      data.productDescription
        ? `
    <!-- Product Description -->
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Description</h3>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${data.productDescription.substring(0, 300)}${data.productDescription.length > 300 ? '...' : ''}</p>
    </div>
    `
        : ''
    }

    <!-- Review Button -->
    ${buildActionButton(data.dashboardUrl, data.isNewProduct ? 'Review New Product' : 'Review Product Update')}

    <!-- Instructions -->
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #6B7280; line-height: 1.6;">
        <strong style="color: #111827;">Review Checklist:</strong>
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6B7280; line-height: 1.8;">
        <li>Verify product details and descriptions</li>
        <li>Check product images and quality</li>
        <li>Review pricing and discount structure</li>
        <li>Validate variant information (size, flavor, etc.)</li>
        <li>Check ingredient lists and allergen information</li>
        <li>Verify nutritional information accuracy</li>
        <li>Review FSSAI compliance</li>
        <li>Approve or reject the product listing</li>
      </ul>
    </div>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: 'Admin Team',
    recipientEmail: import.meta.env.VITE_ADMIN_EMAIL || 'admin@trupromart.com',
    content: cardContent,
  });

  return { subject, html };
}
