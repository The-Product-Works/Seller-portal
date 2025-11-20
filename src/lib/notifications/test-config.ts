/**
 * Test notification system configuration
 * Use this in browser console to check if notifications are configured
 */

export function testNotificationConfig() {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;
  const fromEmail = import.meta.env.VITE_RESEND_FROM_EMAIL;
  
  console.log('=== Notification Configuration Test ===');
  console.log('RESEND_API_KEY exists:', !!apiKey);
  console.log('RESEND_API_KEY length:', apiKey?.length || 0);
  console.log('FROM_EMAIL:', fromEmail);
  console.log('=======================================');
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set! Did you restart the dev server after adding it to .env?');
    return false;
  }
  
  if (!fromEmail) {
    console.warn('⚠️ RESEND_FROM_EMAIL is not set, will use default: onboarding@resend.dev');
  }
  
  console.log('✅ Notification system is configured');
  return true;
}

// Auto-run on import
if (typeof window !== 'undefined') {
  (window as { testNotificationConfig?: () => boolean }).testNotificationConfig = testNotificationConfig;
  console.log('Run testNotificationConfig() in console to check notification configuration');
}
