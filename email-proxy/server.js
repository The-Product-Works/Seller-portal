const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'], // Allow your frontend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Resend API proxy endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    console.log('📧 Received email request:', {
      to: req.body.to,
      subject: req.body.subject
    });

    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_FJ8AtYR2_DdXyYoLNmGTvonL6WPiQZxK1';
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    // Make request to Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: req.body.to,
        subject: req.body.subject,
        html: req.body.html,
        tags: req.body.tags || []
      }),
    });

    const data = await response.json();
    console.log('📧 Resend response:', data);

    if (!response.ok) {
      console.error('❌ Resend error:', data);
      return res.status(response.status).json({
        success: false,
        error: data.message || 'Failed to send email'
      });
    }

    console.log('✅ Email sent successfully!');
    res.json({
      success: true,
      messageId: data.id,
      data
    });

  } catch (error) {
    console.error('❌ Proxy server error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Email proxy server is running',
    timestamp: new Date().toISOString()
  });
});

// Real-time monitoring state
let realtimeMonitoring = {
  active: false,
  sellerId: null,
  config: null,
  startedAt: null
};

// Get real-time monitoring status
app.get('/api/realtime-status', (req, res) => {
  res.json({
    monitoring: realtimeMonitoring.active,
    sellerId: realtimeMonitoring.sellerId,
    config: realtimeMonitoring.config,
    startedAt: realtimeMonitoring.startedAt,
    timestamp: new Date().toISOString()
  });
});

// Start real-time monitoring
app.post('/api/realtime-start', (req, res) => {
  try {
    const { sellerId, config } = req.body;
    
    console.log('🚀 Starting real-time monitoring for seller:', sellerId);
    console.log('📋 Configuration:', config);
    
    realtimeMonitoring = {
      active: true,
      sellerId: sellerId,
      config: config,
      startedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Real-time monitoring started',
      monitoring: realtimeMonitoring
    });
    
    console.log('✅ Real-time monitoring started successfully');
  } catch (error) {
    console.error('❌ Error starting real-time monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop real-time monitoring
app.post('/api/realtime-stop', (req, res) => {
  try {
    console.log('🛑 Stopping real-time monitoring');
    
    const previousState = { ...realtimeMonitoring };
    realtimeMonitoring = {
      active: false,
      sellerId: null,
      config: null,
      startedAt: null
    };
    
    res.json({
      success: true,
      message: 'Real-time monitoring stopped',
      previousState: previousState
    });
    
    console.log('✅ Real-time monitoring stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping real-time monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Real-time notification webhook (for testing)
app.post('/api/realtime-webhook', async (req, res) => {
  try {
    if (!realtimeMonitoring.active) {
      return res.status(400).json({
        success: false,
        error: 'Real-time monitoring is not active'
      });
    }
    
    const { eventType, data } = req.body;
    console.log(`📧 Real-time event received: ${eventType}`, data);
    
    // This would trigger the actual notification sending
    // For now, just simulate it
    const emailResult = {
      success: true,
      messageId: `realtime-${Date.now()}`,
      eventType: eventType,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: `Real-time notification processed for ${eventType}`,
      result: emailResult
    });
    
  } catch (error) {
    console.error('❌ Real-time webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`📧 Email proxy server running on http://localhost:${PORT}`);
  console.log(`🔧 API endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;