// test-notification-system.js - Quick test script for real-time notifications
console.log('🧪 Testing Real-Time Notification System...');

async function testNotificationSystem() {
  console.log('📍 Step 1: Testing email proxy server health...');
  
  try {
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Proxy server health:', healthData);
  } catch (error) {
    console.error('❌ Proxy server not running! Start it with: cd email-proxy && node server.js');
    return;
  }

  console.log('📍 Step 2: Testing direct email send...');
  
  try {
    const emailResponse = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '22052204@kiit.ac.in',
        subject: '🧪 Test Notification System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🎉 Real-Time Notification Test</h2>
            <p>Your notification system is working correctly!</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>✅ System Status:</h3>
              <ul>
                <li>📧 Email delivery: WORKING</li>
                <li>🔗 Proxy server: ACTIVE</li>
                <li>⏰ Timestamp: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p><strong>Next step:</strong> Enable real-time monitoring in your profile page!</p>
          </div>
        `
      })
    });
    
    const emailResult = await emailResponse.json();
    console.log('✅ Test email sent:', emailResult);
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }

  console.log('📍 Step 3: Testing real-time monitoring controls...');
  
  try {
    const statusResponse = await fetch('http://localhost:3001/api/realtime-status');
    const statusData = await statusResponse.json();
    console.log('📊 Real-time monitoring status:', statusData);
  } catch (error) {
    console.error('❌ Failed to get monitoring status:', error);
  }

  console.log('🎯 Test complete! Check your email: 22052204@kiit.ac.in');
  console.log('🚀 To enable monitoring: Visit Profile page → Start Monitoring');
}

// Auto-run the test
testNotificationSystem();