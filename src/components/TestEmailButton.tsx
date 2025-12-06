import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { sendEmail } from '@/services/email-service';
import { useToast } from '@/hooks/use-toast';

interface TestEmailButtonProps {
  sellerEmail?: string;
  sellerName?: string;
  sellerId?: string;
}

export function TestEmailButton({ sellerEmail, sellerName, sellerId }: TestEmailButtonProps) {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; messageId?: string; error?: string } | null>(null);
  const { toast } = useToast();

  const handleSendTestEmail = async () => {
    if (!sellerEmail) {
      toast({
        title: "Error",
        description: "Seller email not found. Please complete your profile.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      // Create HTML email content
      const emailHtml = `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
.badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 10px 0; }
.info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
.footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
.button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
</style>
</head>
<body>
<div class="header">
<h1>✅ Email System Active!</h1>
<p style="margin: 0; opacity: 0.9;">Your Resend integration is working perfectly</p>
</div>
<div class="content">
<div class="badge">🎉 Test Email</div>
<h2>Hello ${sellerName || 'Seller'}!</h2>
<p>This is a test email to confirm that your seller portal's email notification system is working correctly.</p>
<div class="info-box">
<h3 style="margin-top: 0; color: #667eea;">📧 Email Details</h3>
<ul style="padding-left: 20px;">
<li><strong>Recipient:</strong> ${sellerEmail}</li>
<li><strong>Seller ID:</strong> ${sellerId || 'N/A'}</li>
<li><strong>Service:</strong> Resend API via Vercel Serverless Functions</li>
<li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
</ul>
</div>
<h3>✨ What's Working:</h3>
<ul>
<li>✅ Vercel Serverless Function is running</li>
<li>✅ Resend API connection established</li>
<li>✅ Email delivery successful</li>
<li>✅ Database logging configured</li>
</ul>
<h3>🚀 Ready for Production:</h3>
<p>Your seller portal can now send automated email notifications for:</p>
<ul>
<li>Order shipped confirmations</li>
<li>Order delivered notifications</li>
<li>Refund status updates</li>
<li>Return confirmations</li>
<li>And more...</li>
</ul>
<div style="text-align: center;">
<a href="https://trupromart.com" class="button">Visit Dashboard</a>
</div>
<div class="footer">
<p>This is an automated test email from TruproMart Seller Portal</p>
<p>Powered by Resend API • Vercel Serverless Functions</p>
</div>
</div>
</body>
</html>`;

      const result = await sendEmail({
        alertType: 'test_email',
        recipientEmail: sellerEmail,
        recipientType: 'seller',
        recipientId: sellerId,
        subject: '🧪 Test Email - Resend Integration Working!',
        htmlContent: emailHtml,
        relatedSellerId: sellerId,
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });

      setLastResult(result);

      if (result.success) {
        toast({
          title: "✅ Test Email Sent!",
          description: `Email delivered to ${sellerEmail}. Check your inbox!`,
        });
      } else {
        toast({
          title: "❌ Email Failed",
          description: result.error || "Failed to send test email",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({ success: false, error: errorMessage });
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-purple-900">Email System Test</CardTitle>
          </div>
          {lastResult && (
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          )}
        </div>
        <CardDescription>
          Test the Resend email integration by sending a test email to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <Button
            onClick={handleSendTestEmail}
            disabled={sending || !sellerEmail}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
          
          <div className="flex-1">
            {sellerEmail ? (
              <div className="text-sm">
                <p className="text-gray-600">Email will be sent to:</p>
                <p className="font-mono font-medium text-purple-700">{sellerEmail}</p>
              </div>
            ) : (
              <div className="text-sm text-red-600">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Seller email not found
              </div>
            )}
          </div>
        </div>

        {lastResult && (
          <div className={`p-4 rounded-lg ${lastResult.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            {lastResult.success ? (
              <div className="space-y-2">
                <p className="font-medium text-green-900">✅ Email sent successfully!</p>
                <p className="text-sm text-green-700">Message ID: <code className="bg-white px-2 py-1 rounded">{lastResult.messageId}</code></p>
                <p className="text-xs text-green-600">Check your inbox for the test email. It should arrive within seconds.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium text-red-900">❌ Failed to send email</p>
                <p className="text-sm text-red-700">{lastResult.error}</p>
                <p className="text-xs text-red-600">Check console for more details or verify environment variables.</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>Tip:</strong> Check your spam folder if you don't receive the email within 1 minute.</p>
          <p>🔍 <strong>Testing Mode:</strong> If RESEND_TESTING_MODE=true, emails go to verified email address.</p>
        </div>
      </CardContent>
    </Card>
  );
}
