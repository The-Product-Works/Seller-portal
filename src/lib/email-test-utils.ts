/**
 * Quick Email Test Script
 * Run this in browser console to test email functionality
 */

// Test 1: Check Environment Configuration
export function checkEmailConfig() {
  console.log('=== Email Configuration Check ===');
  
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  const fromEmail = import.meta.env.VITE_RESEND_FROM_EMAIL;
  
  console.log('✅ Resend API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : '❌ NOT SET');
  console.log('✅ From Email:', fromEmail || 'onboarding@resend.dev (default)');
  console.log('✅ Environment:', import.meta.env.MODE);
  
  if (!apiKey) {
    console.error('❌ VITE_RESEND_API_KEY is missing from environment variables!');
    return false;
  }
  
  console.log('✅ Email configuration looks good!');
  return true;
}

// Test 2: Direct Resend API Test
export async function testDirectEmail(email: string) {
  console.log('=== Testing Direct Resend API ===');
  
  if (!email) {
    console.error('❌ Please provide an email address');
    return;
  }
  
  try {
    const { sendDirectEmail } = await import('@/lib/notifications/resend-direct');
    
    const result = await sendDirectEmail({
      recipientEmail: email,
      subject: '🧪 Direct Resend API Test',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #333;">✅ Direct Email Test Successful!</h1>
          <p>This email was sent directly via Resend API</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Method:</strong> Direct Resend API</p>
        </div>
      `,
      alertType: 'low_stock_alert'
    });
    
    if (result.success) {
      console.log('✅ Direct email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.error('❌ Direct email failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error testing direct email:', error);
    return { success: false, error: error.message };
  }
}

// Test 3: Supabase Edge Function Test
export async function testEdgeFunction(email: string) {
  console.log('=== Testing Supabase Edge Function ===');
  
  if (!email) {
    console.error('❌ Please provide an email address');
    return;
  }
  
  try {
    const { sendEmail } = await import('@/lib/notifications/email-service');
    
    const result = await sendEmail({
      recipientEmail: email,
      recipientType: 'seller',
      alertType: 'new_order_received',
      subject: '🚀 Supabase Edge Function Test',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #333;">✅ Edge Function Test Successful!</h1>
          <p>This email was sent via Supabase Edge Function + Resend</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Method:</strong> Supabase Edge Function</p>
        </div>
      `
    });
    
    if (result.success) {
      console.log('✅ Edge function email sent successfully!');
      console.log('📧 Notification ID:', result.notificationId);
    } else {
      console.error('❌ Edge function email failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error testing edge function:', error);
    return { success: false, error: error.message };
  }
}

// Test 4: Test Seller Notification Helper
export async function testSellerNotification(email: string) {
  console.log('=== Testing Seller Notification Helper ===');
  
  if (!email) {
    console.error('❌ Please provide an email address');
    return;
  }
  
  try {
    const { sendNewOrderNotification } = await import('@/lib/email/helpers/seller-notifications');
    
    const result = await sendNewOrderNotification(
      'test-seller-id',
      email,
      {
        orderNumber: 'TEST-' + Date.now(),
        orderDate: new Date().toISOString(),
        totalAmount: 299.99,
        itemCount: 2,
        customerName: 'Test Customer',
        shippingAddress: '123 Test Street, Test City',
        dashboardUrl: 'https://seller-portal.com/orders'
      }
    );
    
    if (result.success) {
      console.log('✅ Seller notification sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.error('❌ Seller notification failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error testing seller notification:', error);
    return { success: false, error: error.message };
  }
}

// Auto-expose functions to window for console access
if (typeof window !== 'undefined') {
  window.emailTest = {
    checkConfig: checkEmailConfig,
    testDirect: testDirectEmail,
    testEdge: testEdgeFunction,
    testSeller: testSellerNotification
  };
  
  console.log('📧 Email testing functions available:');
  console.log('  emailTest.checkConfig() - Check configuration');
  console.log('  emailTest.testDirect("your@email.com") - Test direct Resend API');
  console.log('  emailTest.testEdge("your@email.com") - Test Supabase Edge Function');
  console.log('  emailTest.testSeller("your@email.com") - Test seller notification helper');
}