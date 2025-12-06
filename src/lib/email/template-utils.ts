/**
 * Email Template Utilities
 * Helper functions for building consistent email templates
 */

/**
 * Build email wrapper
 * Provides consistent styling and structure for all emails
 */
export function buildEmailWrapper(params: {
  title: string;
  recipientName: string;
  recipientEmail: string;
  content: string;
}): string {
  const { title, recipientName, recipientEmail, content } = params;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
        <!-- Main Content -->
        <div style="padding: 30px;">
          ${content}
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
            © ${new Date().getFullYear()} TruProMart. All rights reserved.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Format currency amount
 */
export function formatAmount(amount: number, currency: string = 'INR'): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Build action button
 */
export function buildActionButton(url: string, text: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}
