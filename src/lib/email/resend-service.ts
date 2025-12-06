/**
 * Resend Email Service
 * Handles all email sending operations using Resend API
 */

import { Resend } from 'resend';
import type { SendEmailParams, SendEmailResult } from './types';

// Initialize Resend client
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

// Email configuration
const EMAIL_CONFIG = {
  // Testing mode - when true, all emails go to verified email only
  isTestingMode: import.meta.env.VITE_RESEND_TESTING_MODE === 'true',
  // Verified email address (required for free tier)
  verifiedEmail:
    import.meta.env.VITE_RESEND_VERIFIED_EMAIL || 'devops-team@theproductworks.in',
  // From email address
  fromEmail: import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev',
};

/**
 * Get the configured 'from' email address
 */
const getFromEmail = (): string => {
  return EMAIL_CONFIG.fromEmail;
};

/**
 * Get the recipient email based on testing mode
 * In testing mode: returns verified email
 * In production mode: returns the actual recipient
 */
export const getRecipientEmail = (intendedRecipient: string): string => {
  if (EMAIL_CONFIG.isTestingMode) {
    console.log(
      `📧 [TESTING MODE] Redirecting email from ${intendedRecipient} to ${EMAIL_CONFIG.verifiedEmail}`
    );
    return EMAIL_CONFIG.verifiedEmail;
  }
  return intendedRecipient;
};

/**
 * Check if the system is in testing mode
 */
export const isTestingMode = (): boolean => {
  return EMAIL_CONFIG.isTestingMode;
};

/**
 * Get email configuration status
 */
export const getEmailConfig = () => {
  return {
    ...EMAIL_CONFIG,
    configured: !!import.meta.env.VITE_RESEND_API_KEY,
  };
};

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send an email using Resend API with retry logic for rate limits
 * @param params - Email sending parameters
 * @param retryCount - Current retry attempt (internal use)
 * @returns Result with success status and message ID or error
 */
export async function sendEmail(
  params: SendEmailParams,
  retryCount: number = 0
): Promise<SendEmailResult> {
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 500; // Start with 500ms delay

  try {
    // Validate API key
    if (!import.meta.env.VITE_RESEND_API_KEY) {
      console.error('❌ VITE_RESEND_API_KEY is not configured');
      return {
        success: false,
        error: 'Email service not configured. Please set VITE_RESEND_API_KEY.',
      };
    }

    // Validate recipient
    if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
      console.error('❌ No recipient email provided');
      return {
        success: false,
        error: 'Recipient email is required',
      };
    }

    // Validate subject and content
    if (!params.subject || !params.html) {
      console.error('❌ Subject or HTML content is missing');
      return {
        success: false,
        error: 'Email subject and content are required',
      };
    }

    // Prepare email data
    const from = params.from || getFromEmail();

    // Apply testing mode - redirect recipient if in testing mode
    let actualRecipient = params.to;
    if (EMAIL_CONFIG.isTestingMode) {
      // In testing mode, redirect all emails to verified email
      if (Array.isArray(params.to)) {
        actualRecipient = EMAIL_CONFIG.verifiedEmail;
        console.log(
          `📧 [TESTING MODE] Redirecting ${params.to.length} recipients to ${EMAIL_CONFIG.verifiedEmail}`
        );
      } else {
        const originalRecipient = params.to;
        actualRecipient = EMAIL_CONFIG.verifiedEmail;
        console.log(
          `📧 [TESTING MODE] Redirecting ${originalRecipient} to ${EMAIL_CONFIG.verifiedEmail}`
        );
      }
    }

    const emailData = {
      from,
      to: actualRecipient,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo && { reply_to: params.replyTo }),
    };

    console.log('📧 Sending email via Resend...', {
      from,
      to: actualRecipient,
      subject: params.subject,
      testingMode: EMAIL_CONFIG.isTestingMode,
      attempt: retryCount + 1,
    });

    // Send email
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      // Check if it's a rate limit error
      if (error.name === 'rate_limit_exceeded' && retryCount < MAX_RETRIES) {
        // Calculate exponential backoff delay: 500ms, 1000ms, 2000ms
        const delay = INITIAL_DELAY * Math.pow(2, retryCount);
        console.log(
          `⏳ Rate limit hit. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`
        );

        await sleep(delay);
        return sendEmail(params, retryCount + 1);
      }

      console.error('❌ Resend API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    if (!data?.id) {
      console.error('❌ No message ID returned from Resend');
      return {
        success: false,
        error: 'Email sent but no confirmation received',
      };
    }

    console.log('✅ Email sent successfully', {
      messageId: data.id,
      to: params.to,
      attempts: retryCount + 1,
    });

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send a test email
 * @param recipientEmail - Email address to send test email to
 * @param recipientName - Optional name for personalization
 * @returns Result with success status
 */
export async function sendTestEmail(
  recipientEmail: string,
  recipientName: string = 'User'
): Promise<SendEmailResult> {
  // Determine actual recipient based on testing mode
  const actualRecipient = EMAIL_CONFIG.isTestingMode
    ? EMAIL_CONFIG.verifiedEmail
    : recipientEmail;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Test Email Success!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; margin-bottom: 20px;">
          Hello <strong>${recipientName}</strong>! 👋
        </p>
        
        <p style="margin-bottom: 15px;">
          This is a test email from the <strong>Seller Portal</strong> email notification system.
        </p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-weight: bold; color: #667eea;">✅ Email Service Status</p>
          <p style="margin: 10px 0 0 0;">Your Resend integration is working correctly!</p>
        </div>

        <!-- Recipient Information -->
        <div style="background: white; padding: 20px; border-left: 4px solid ${EMAIL_CONFIG.isTestingMode ? '#f59e0b' : '#10b981'}; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-weight: bold; color: ${EMAIL_CONFIG.isTestingMode ? '#f59e0b' : '#10b981'};">
            📧 Intended Recipient
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            <strong>Name:</strong> ${recipientName}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 14px;">
            <strong>Email:</strong> ${recipientEmail}
          </p>
        </div>

        ${
          EMAIL_CONFIG.isTestingMode
            ? `
        <!-- Testing Mode Warning -->
        <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-weight: bold; color: #92400e; font-size: 14px;">
            ⚠️ Testing Mode Active
          </p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #78350f;">
            This email was sent to <strong>${actualRecipient}</strong> instead of the intended recipient because the system is in testing mode. In production, it will be sent to the actual recipient.
          </p>
        </div>
        `
            : ''
        }
        
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          <strong>Sent at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
        
        <p style="margin-top: 10px; font-size: 14px; color: #666;">
          <strong>From:</strong> ${getFromEmail()}
        </p>

        <p style="margin-top: 10px; font-size: 14px; color: #666;">
          <strong>Mode:</strong> <span style="color: ${EMAIL_CONFIG.isTestingMode ? '#f59e0b' : '#10b981'}; font-weight: 600;">${EMAIL_CONFIG.isTestingMode ? 'Testing' : 'Production'}</span>
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #888; margin: 0;">
            This is an automated test email from Seller Portal. If you received this in error, please ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: '✅ Test Email - Resend Integration Working',
    html,
  });
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email service configuration status
 * @returns Configuration status
 */
export function getEmailServiceStatus() {
  return {
    configured: !!import.meta.env.VITE_RESEND_API_KEY,
    fromEmail: getFromEmail(),
    apiKeySet: !!import.meta.env.VITE_RESEND_API_KEY,
  };
}
