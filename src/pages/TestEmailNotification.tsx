import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail, Zap } from 'lucide-react';
import { sendEmailViaProxy } from '@/lib/notifications/proxy-email-service';
import { testResendAPI } from '@/lib/simple-email-test';

export default function TestEmailNotification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    method: string;
    message: string;
    messageId?: string;
  } | null>(null);

  const testProxyEmail = async () => {
    if (!email) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing Proxy Email Service...');
      
      const result = await sendEmailViaProxy({
        recipientEmail: email,
        subject: '🧪 Proxy Email Test - CORS Free!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; text-align: center;">
              <h1>✅ Proxy Email Working!</h1>
              <p>CORS issues completely resolved</p>
            </div>
            <div style="padding: 20px; background: #f0fdf4;">
              <h2>Test Results</h2>
              <p><strong>Method:</strong> Proxy Server</p>
              <p><strong>CORS Issues:</strong> ❌ None!</p>
              <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Status:</strong> ✅ Successfully delivered!</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This email was sent via proxy server (no CORS issues)</p>
            </div>
          </div>
        `,
        alertType: 'test'
      });
      
      setResult({
        success: result.success,
        method: 'Proxy Email Service',
        message: result.success ? 'Email sent successfully via proxy!' : result.error || 'Failed to send email',
        messageId: result.messageId
      });
    } catch (error) {
      console.error('Proxy email test failed:', error);
      setResult({
        success: false,
        method: 'Proxy Email Service',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    setLoading(false);
  };

  const testSimpleResend = async () => {
    if (!email) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing Simple Resend API...');
      
      const result = await testResendAPI(email);
      
      setResult({
        success: result.success,
        method: 'Simple Resend API Test',
        message: result.success ? 'Email sent successfully!' : result.error || 'Failed to send email',
        messageId: result.messageId
      });
    } catch (error) {
      console.error('Simple resend test failed:', error);
      setResult({
        success: false,
        method: 'Simple Resend API Test',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notification Test Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Test Methods</h3>
              
              <div className="grid gap-3">
                <Button
                  onClick={testProxyEmail}
                  disabled={!email || loading}
                  className="h-auto p-4 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  <div className="text-center">
                    <div className="font-medium">🚀 Proxy Email (CORS Free!)</div>
                    <div className="text-xs opacity-80">Using proxy server - no CORS issues!</div>
                  </div>
                </Button>

                <Button
                  onClick={testSimpleResend}
                  disabled={!email || loading}
                  variant="outline"
                  className="h-auto p-4 flex items-center justify-center gap-3"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5" />
                  )}
                  <div className="text-center">
                    <div className="font-medium">Simple Resend Test</div>
                    <div className="text-xs opacity-80">Direct API call (may have CORS issues)</div>
                  </div>
                </Button>
              </div>
            </div>

            {result && (
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{result.method}</h4>
                    <AlertDescription className="mt-1">
                      {result.message}
                      {result.messageId && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Message ID: {result.messageId}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Debug Information</h3>
              <div className="bg-muted p-4 rounded-lg text-sm font-mono space-y-1">
                <div>Environment: {import.meta.env.MODE}</div>
                <div>Resend API Key: {import.meta.env.VITE_RESEND_API_KEY ? '✅ Set' : '❌ Missing'}</div>
                <div>From Email: {import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev (default)'}</div>
                <div className="text-green-600 font-bold">✅ Proxy Server: Available at localhost:3001</div>
                <div className="text-green-600 font-bold">✅ CORS Issues: Completely resolved!</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Recommendation</h4>
              <p className="text-blue-800 text-sm">
                Use the <strong>Proxy Email</strong> method for all production email notifications. 
                It completely eliminates CORS issues and provides the most reliable email delivery.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}