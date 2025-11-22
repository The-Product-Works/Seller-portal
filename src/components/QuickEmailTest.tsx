import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, AlertTriangle } from 'lucide-react';

export function QuickEmailTest() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Notification System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Email System Status:</strong> Domain verification required
            <br />
            <span className="text-sm mt-2 block">
              Resend requires a verified domain to send emails to any address. 
              Currently limited to testing with your registered email (22052204@kiit.ac.in).
              Visit <a 
                href="https://resend.com/domains" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-700 underline hover:text-amber-900"
              >
                Resend Domains
              </a> to verify a domain for production use.
            </span>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}