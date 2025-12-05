/**
 * Email Template Utilities for Seller Portal
 * Helper functions for building consistent email templates
 */

/**
 * Get email configuration for seller portal
 */
const getEmailConfig = () => ({
  // Default configuration for seller portal
  fromEmail: 'noreply@sellerportal.com',
  supportUrl: 'https://sellerportal.com/support',
  dashboardUrl: 'https://sellerportal.com/dashboard',
  brandName: 'Seller Portal',
  brandColor: '#3b82f6', // Blue
  successColor: '#10b981', // Green
  warningColor: '#f59e0b', // Amber
  errorColor: '#ef4444', // Red
});

/**
 * Build recipient info section for email templates
 */
export function buildRecipientInfoSection(
  recipientName: string,
  recipientEmail: string
): string {
  const config = getEmailConfig();

  return `
    <!-- Recipient Information -->
    <div style="background: white; padding: 20px; border-left: 4px solid ${config.brandColor}; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; font-weight: bold; color: ${config.brandColor}; font-size: 14px;">
        📧 Recipient Information
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">
        <strong>Name:</strong> ${recipientName}
      </p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #374151;">
        <strong>Email:</strong> ${recipientEmail}
      </p>
    </div>
  `;
}

/**
 * Build email footer with metadata
 */
export function buildEmailFooter(): string {
  const config = getEmailConfig();
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  });

  return `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
        This email was sent by ${config.brandName} on ${timestamp}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
        Need help? <a href="${config.supportUrl}" style="color: ${config.brandColor}; text-decoration: none;">Contact Support</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} ${config.brandName}. All rights reserved.
      </p>
    </div>
  `;
}

/**
 * Build complete email wrapper
 * Provides consistent styling and structure for all emails
 */
export function buildEmailWrapper(params: {
  title: string;
  recipientName: string;
  recipientEmail: string;
  content: string;
  showRecipientInfo?: boolean;
  headerColor?: string;
  logoUrl?: string;
}): string {
  const config = getEmailConfig();
  const {
    title,
    recipientName,
    recipientEmail,
    content,
    showRecipientInfo = false,
    headerColor = config.brandColor,
    logoUrl
  } = params;

  const logoSection = logoUrl ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${logoUrl}" alt="${config.brandName}" style="max-width: 200px; height: auto;" />
    </div>
  ` : '';

  const recipientSection = showRecipientInfo 
    ? buildRecipientInfoSection(recipientName, recipientEmail)
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: ${headerColor}; padding: 30px 20px; text-align: center;">
          ${logoSection}
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
            ${title}
          </h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
          ${recipientSection}
          ${content}
          ${buildEmailFooter()}
        </div>
        
      </div>
    </body>
    </html>
  `;
}

/**
 * Build order items table for email templates
 */
export function buildOrderItemsTable(items: Array<{
  name: string;
  quantity: number;
  price?: number;
  imageUrl?: string;
}>): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 12px; border-radius: 4px;" />` : ''}
        <span style="font-weight: 500;">${item.name}</span>
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${item.quantity}
      </td>
      ${item.price ? `
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ₹${item.price.toFixed(2)}
        </td>
      ` : ''}
    </tr>
  `).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f9fafb;">
          <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Product</th>
          <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Quantity</th>
          ${items.some(item => item.price) ? '<th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151;">Price</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Build shipping address section
 */
export function buildShippingAddressSection(address: {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}): string {
  return `
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">Shipping Address</h3>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
        ${address.name}<br/>
        ${address.line1}<br/>
        ${address.line2 ? `${address.line2}<br/>` : ''}
        ${address.city}, ${address.state} ${address.postalCode}<br/>
        ${address.country || 'India'}
      </p>
    </div>
  `;
}

/**
 * Build action button
 */
export function buildActionButton(params: {
  text: string;
  url: string;
  color?: string;
  style?: 'primary' | 'secondary';
}): string {
  const config = getEmailConfig();
  const {
    text,
    url,
    color = config.brandColor,
    style = 'primary'
  } = params;

  const buttonStyle = style === 'primary' 
    ? `background: ${color}; color: white;`
    : `background: white; color: ${color}; border: 2px solid ${color};`;

  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" 
         style="display: inline-block; padding: 12px 24px; ${buttonStyle} text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Build status badge
 */
export function buildStatusBadge(status: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): string {
  const config = getEmailConfig();
  
  const colors = {
    success: config.successColor,
    warning: config.warningColor,
    error: config.errorColor,
    info: config.brandColor
  };

  return `
    <span style="display: inline-block; padding: 4px 12px; background: ${colors[type]}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
      ${status}
    </span>
  `;
}

/**
 * Build order summary section
 */
export function buildOrderSummarySection(params: {
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  orderUrl: string;
}): string {
  return `
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Order Summary</h3>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500; color: #6b7280;">Order Number:</span>
        <span style="color: #374151;">${params.orderNumber}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 500; color: #6b7280;">Order Date:</span>
        <span style="color: #374151;">${params.orderDate}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <span style="font-weight: 500; color: #6b7280;">Total Amount:</span>
        <span style="font-weight: 600; color: #374151; font-size: 16px;">${params.currency}${params.totalAmount.toFixed(2)}</span>
      </div>
      ${buildActionButton({ 
        text: 'View Order Details', 
        url: params.orderUrl,
        style: 'secondary'
      })}
    </div>
  `;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toFixed(2)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Build progress steps for order tracking
 */
export function buildProgressSteps(steps: Array<{
  label: string;
  completed: boolean;
  current?: boolean;
}>): string {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
      ${steps.map((step, index) => `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1; position: relative;">
          <!-- Step Circle -->
          <div style="
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            ${step.completed 
              ? 'background: #10b981; color: white;' 
              : step.current 
                ? 'background: #3b82f6; color: white;'
                : 'background: #e5e7eb; color: #6b7280;'
            }
          ">
            ${step.completed ? '✓' : index + 1}
          </div>
          
          <!-- Step Label -->
          <div style="
            text-align: center; 
            font-size: 12px; 
            font-weight: 500;
            color: ${step.completed || step.current ? '#374151' : '#6b7280'};
            max-width: 80px;
          ">
            ${step.label}
          </div>
          
          <!-- Connecting Line -->
          ${index < steps.length - 1 ? `
            <div style="
              position: absolute; 
              top: 16px; 
              left: 60%; 
              width: 40px; 
              height: 2px; 
              background: ${step.completed ? '#10b981' : '#e5e7eb'};
              z-index: -1;
            "></div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}