// src/components/ProtectedRoute.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresKYC?: boolean;
}

export function ProtectedRoute({ children, requiresKYC = false }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && requiresKYC) {
      supabase
        .from("sellers")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setKycStatus(data?.verification_status || null);
        });
    }
  }, [user, requiresKYC]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect unauthenticated users to sign in
  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // If KYC is required, enforce status-based routing
  if (requiresKYC) {
    if (!kycStatus) {
      // No KYC record yet → must start KYC
      const current = location.pathname.toLowerCase();
      if (!current.includes("kyc")) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Alert className="max-w-md border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-900 font-semibold">KYC Verification Required</AlertTitle>
              <AlertDescription className="text-yellow-800 mt-2">
                Please complete your KYC verification to access this page.
              </AlertDescription>
              <Button 
                onClick={() => window.location.href = '/kyc'} 
                className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Complete KYC Now
              </Button>
            </Alert>
          </div>
        );
      }
    } else if (kycStatus === "rejected") {
      // Rejected → must redo KYC
      const current = location.pathname.toLowerCase();
      if (!current.includes("kyc")) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Alert className="max-w-md border-red-500 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900 font-semibold">KYC Verification Failed</AlertTitle>
              <AlertDescription className="text-red-800 mt-2">
                Your KYC verification was rejected. Please resubmit your documents to access this page.
              </AlertDescription>
              <Button 
                onClick={() => window.location.href = '/kyc'} 
                className="mt-4 w-full bg-red-600 hover:bg-red-700"
              >
                Resubmit KYC
              </Button>
            </Alert>
          </div>
        );
      }
    } else if (kycStatus === "pending") {
      // Pending → can only access SellerVerification page
      const current = location.pathname.toLowerCase();
      if (!current.includes("seller-verification") && !current.includes("kyc")) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Alert className="max-w-md border-blue-500 bg-blue-50">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <AlertTitle className="text-blue-900 font-semibold">KYC Verification Pending</AlertTitle>
              <AlertDescription className="text-blue-800 mt-2">
                Your KYC verification is currently under review. Please wait for approval before accessing other pages.
              </AlertDescription>
              <Button 
                onClick={() => window.location.href = '/seller-verification'} 
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
              >
                Check Verification Status
              </Button>
            </Alert>
          </div>
        );
      }
    }
  }

  // Approved or general access
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
    </>
  );
}
