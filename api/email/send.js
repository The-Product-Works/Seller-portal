/**
 * Vercel Serverless Function for Email Sending
 * Path: /api/email/send
 * 
 * This runs on Vercel's serverless infrastructure
 * Environment variables are accessed via process.env (set in Vercel Dashboard)
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize Resend with API key (lazy initialization inside handler)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing API key' 
      });
    }

    const resend = new Resend(apiKey);

    // Initialize Supabase for logging
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Email configuration
    const EMAIL_CONFIG = {
      isTestingMode: process.env.RESEND_TESTING_MODE === 'true',
      verifiedEmail: process.env.RESEND_VERIFIED_EMAIL || 'devops-team@theproductworks.in',
      fromEmail: process.env.RESEND_FROM_EMAIL || 'support@trupromart.com',
    };
    const {
      alertType,
      recipientEmail,
      recipientType,
      recipientId,
      subject,
      htmlContent,
      relatedOrderId,
      relatedProductId,
      relatedSellerId,
      relatedEntityId,
      trackingId,
      transactionId,
      metadata
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !subject || !htmlContent || !alertType || !recipientType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Map alert types to database-compatible values
    // Database constraint only allows specific alert_type values
    const ALERT_TYPE_MAP = {
      'test_email': 'welcome', // Map test emails to 'welcome' type for database
    };
    
    const dbAlertType = ALERT_TYPE_MAP[alertType] || alertType;

    // Apply testing mode
    const actualRecipient = EMAIL_CONFIG.isTestingMode 
      ? EMAIL_CONFIG.verifiedEmail 
      : recipientEmail;

    if (EMAIL_CONFIG.isTestingMode) {
      console.log(`📧 [TESTING MODE] Redirecting ${recipientEmail} to ${EMAIL_CONFIG.verifiedEmail}`);
    }

    // Send email via Resend
    console.log('📧 Sending email via Resend...', {
      to: actualRecipient,
      subject,
      alertType
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.fromEmail,
      to: actualRecipient,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      
    // Log failure to database
    // Note: recipient_id foreign key references users(id)
    // For sellers, use related_seller_id instead of recipient_id
    const dbRecipientId = recipientType === 'seller' ? null : recipientId;
    const dbRelatedSellerId = recipientType === 'seller' ? (recipientId || relatedSellerId) : relatedSellerId;

    await logEmailToDatabase(supabase, {
      alertType: dbAlertType,
      recipientEmail,
      recipientType,
      recipientId: dbRecipientId,
      subject,
      status: 'failed',
      relatedOrderId,
      relatedProductId,
      relatedSellerId: dbRelatedSellerId,
      relatedEntityId,
      trackingId,
      transactionId,
      metadata: { ...metadata, error: error.message }
    });      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log('✅ Email sent successfully:', data.id);

    // Log success to database
    // Note: recipient_id foreign key references users(id)
    // For sellers, use related_seller_id instead of recipient_id
    const dbRecipientId = recipientType === 'seller' ? null : recipientId;
    const dbRelatedSellerId = recipientType === 'seller' ? (recipientId || relatedSellerId) : relatedSellerId;

    await logEmailToDatabase(supabase, {
      alertType: dbAlertType,
      recipientEmail,
      recipientType,
      recipientId: dbRecipientId,
      subject,
      status: 'sent',
      messageId: data.id,
      relatedOrderId,
      relatedProductId,
      relatedSellerId: dbRelatedSellerId,
      relatedEntityId,
      trackingId,
      transactionId,
      metadata
    });

    return res.status(200).json({
      success: true,
      messageId: data.id
    });

  } catch (error) {
    console.error('❌ Error in serverless function:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Log email to database
 */
async function logEmailToDatabase(supabaseClient, params) {
  try {
    const { error } = await supabaseClient
      .from('email_notifications')
      .insert({
        notification_type: 'email',
        recipient_type: params.recipientType,
        recipient_id: params.recipientId || null,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        alert_type: params.alertType,
        related_order_id: params.relatedOrderId || null,
        related_product_id: params.relatedProductId || null,
        related_seller_id: params.relatedSellerId || null,
        related_entity_id: params.relatedEntityId || null,
        tracking_id: params.trackingId || null,
        transaction_id: params.transactionId || null,
        status: params.status,
        metadata: params.metadata || null,
      });

    if (error) {
      console.error('❌ Failed to log email to database:', error);
    } else {
      console.log('✅ Email logged to database');
    }
  } catch (error) {
    console.error('❌ Error logging to database:', error);
  }
}
