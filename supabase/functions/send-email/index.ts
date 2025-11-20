import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  recipientEmail: string
  recipientId?: string
  recipientType: 'seller' | 'buyer' | 'admin'
  alertType: string
  subject: string
  htmlContent: string
  relatedOrderId?: string
  relatedProductId?: string
  relatedSellerId?: string
  relatedEntityId?: string
  trackingId?: string
  transactionId?: string
  metadata?: Record<string, unknown>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const emailRequest: EmailRequest = await req.json()

    console.log('Sending email via Resend API...', {
      to: emailRequest.recipientEmail,
      alertType: emailRequest.alertType,
    })

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: emailRequest.recipientEmail,
        subject: emailRequest.subject,
        html: emailRequest.htmlContent,
      }),
    })

    const resendResult = await resendResponse.json()
    console.log('Resend API response:', resendResult)

    const emailStatus = resendResponse.ok ? 'sent' : 'failed'

    // Track notification in database
    const { data: notification, error: dbError } = await supabaseClient
      .from('email_notifications')
      .insert({
        notification_type: 'email',
        recipient_type: emailRequest.recipientType,
        recipient_id: emailRequest.recipientId || null,
        recipient_email: emailRequest.recipientEmail,
        subject: emailRequest.subject,
        alert_type: emailRequest.alertType,
        related_order_id: emailRequest.relatedOrderId || null,
        related_product_id: emailRequest.relatedProductId || null,
        related_seller_id: emailRequest.relatedSellerId || null,
        related_entity_id: emailRequest.relatedEntityId || null,
        tracking_id: emailRequest.trackingId || null,
        transaction_id: emailRequest.transactionId || null,
        status: emailStatus,
        metadata: emailRequest.metadata || null,
      })
      .select('notification_id')
      .single()

    if (dbError) {
      console.error('Error tracking notification:', dbError)
    }

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: resendResult.message || 'Failed to send email',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification?.notification_id,
        resendId: resendResult.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
