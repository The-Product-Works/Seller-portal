// Simple test to debug email sending
async function testEmailSystem() {
  console.log('🔧 Testing Email System...');
  
  // 1. Test proxy server health
  console.log('1. Checking proxy server health...');
  try {
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Proxy health:', healthData);
  } catch (error) {
    console.error('❌ Proxy health check failed:', error);
    return;
  }
  
  // 2. Test direct email via proxy
  console.log('2. Testing direct email via proxy...');
  try {
    const emailResponse = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ['22052204@kiit.ac.in'],
        subject: '🧪 Test Email from Browser Console',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">✅ Browser Console Test</h1>
            <p>This email was sent directly from the browser console at ${new Date().toLocaleString()}</p>
            <p><strong>Purpose:</strong> Debug email sending issue</p>
          </div>
        `
      })
    });
    
    const emailData = await emailResponse.json();
    console.log('📧 Email response:', emailData);
    
    if (emailResponse.ok) {
      console.log('✅ Direct email sent successfully!');
    } else {
      console.error('❌ Direct email failed:', emailData);
    }
  } catch (error) {
    console.error('❌ Direct email request failed:', error);
  }
  
  // 3. Test via sendEmailViaProxy function (if available)
  console.log('3. Testing via sendEmailViaProxy function...');
  try {
    if (typeof window !== 'undefined' && window.proxyEmails) {
      const result = await window.proxyEmails.test('22052204@kiit.ac.in');
      console.log('📧 Proxy function result:', result);
    } else {
      console.log('⚠️ Proxy functions not available on window');
    }
  } catch (error) {
    console.error('❌ Proxy function test failed:', error);
  }
}

// Run the test
testEmailSystem();

// Also make it available globally
window.testEmailSystem = testEmailSystem;
console.log('🔧 Email test function loaded. Run testEmailSystem() to debug email issues.');