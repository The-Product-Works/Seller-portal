/**
 * Simple Email Test Function
 * Test Resend API directly without complex dependencies
 */

export async function testResendAPI(testEmail: string) {
  console.log('=== Testing Resend API ===');
  
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  const fromEmail = import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  if (!apiKey) {
    console.error('❌ VITE_RESEND_API_KEY is not set!');
    return { success: false, error: 'API key not configured' };
  }
  
  if (!testEmail) {
    console.error('❌ Please provide a test email address');
    return { success: false, error: 'No email provided' };
  }
  
  console.log('📧 API Key:', `${apiKey.substring(0, 8)}...`);
  console.log('📧 From:', fromEmail);
  console.log('📧 To:', testEmail);
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [testEmail],
        subject: '🧪 Resend API Test from Seller Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 20px; text-align: center; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 24px;">✅ Email Test Successful!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your email notification system is working</p>
            </div>
            <div style="padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 20px;">
              <h2 style="color: #334155; margin-top: 0;">Test Details</h2>
              <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Method:</strong> Direct Resend API</p>
              <p><strong>Status:</strong> ✅ Successfully delivered!</p>
            </div>
            <div style="text-align: center; padding-top: 20px; color: #64748b; font-size: 12px;">
              <p>This email was sent from the Seller Authentication Portal</p>
            </div>
          </div>
        `
      }),
    });
    
    const data = await response.json();
    console.log('📧 Response:', data);
    
    if (!response.ok) {
      console.error('❌ Resend API Error:', data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', data.id);
    
    return {
      success: true,
      messageId: data.id,
      data
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}