import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendEmail, getLowStockAlertTemplate } from "@/lib/notifications";
import { Navbar } from "@/components/Navbar";

export default function TestNotifications() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleTest = async () => {
    if (!email) {
      setResult("❌ Please enter an email address");
      return;
    }

    setLoading(true);
    setResult("Sending test email via Edge Function... Check browser console for details.");

    console.log('===== TEST NOTIFICATION START =====');
    console.log('Test email:', email);

    try {
      const htmlContent = getLowStockAlertTemplate({
        productName: "Test Product",
        currentStock: 5,
        threshold: 10
      });

      console.log('Calling sendEmail function (Edge Function)...');

      const response = await sendEmail({
        recipientEmail: email,
        recipientType: 'seller',
        alertType: 'low_stock_alert',
        subject: "🧪 Test Low Stock Alert",
        htmlContent,
      });

      console.log('sendEmail response:', response);
      console.log('===== TEST NOTIFICATION END =====');

      if (response.success) {
        setResult(`✅ Email sent successfully! Notification ID: ${response.notificationId}\n\nCheck your email inbox.`);
      } else {
        setResult(`❌ Failed to send email: ${response.error}\n\nCheck browser console (F12) for more details.`);
      }
    } catch (error) {
      console.error('Test error:', error);
      console.log('===== TEST NOTIFICATION END =====');
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck browser console (F12) for details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Test Notification System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-900">✅ Using Supabase Edge Function</p>
              <p className="text-blue-700 mt-1">Emails are sent server-side, bypassing CORS restrictions.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Test Email Address</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button onClick={handleTest} disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Test Email"}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg whitespace-pre-wrap ${
                result.startsWith('✅') ? 'bg-green-100 text-green-800' :
                result.startsWith('❌') ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
