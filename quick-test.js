// quick-test.js - Test notification system functionality
console.log('🧪 Quick Test: Real-Time Notification System');

async function quickTest() {
  console.log('📍 Step 1: Testing proxy server...');
  
  try {
    const healthCheck = await fetch('http://localhost:3001/api/health');
    const health = await healthCheck.json();
    console.log('✅ Proxy server:', health.status);
  } catch (error) {
    console.log('❌ Proxy server not running! Start with: cd email-proxy && node server.js');
    return;
  }

  console.log('📍 Step 2: Testing email delivery...');
  
  try {
    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '22052204@kiit.ac.in',
        subject: '🔥 Notification System Test',
        html: `
          <h2 style="color: #10b981;">✅ System Working!</h2>
          <p>Real-time notifications are functioning correctly.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0;">
            <h3>🎯 Next Steps:</h3>
            <ol>
              <li>Visit Profile page</li>
              <li>Click "Start Monitoring"</li>
              <li>Create database events to trigger notifications</li>
            </ol>
          </div>
        `
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('❌ Email sending failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
  }

  console.log('🎯 Test Complete! Check your email: 22052204@kiit.ac.in');
  console.log('📱 Next: Enable monitoring in your Profile page');
}

// Auto-run
quickTest();