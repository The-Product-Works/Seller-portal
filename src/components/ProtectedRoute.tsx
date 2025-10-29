import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && requiresKYC) {
      // Check KYC status from sellers table
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

  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  if (requiresKYC && kycStatus !== "approved" && kycStatus !== "pending") {
    return <Navigate to="/kyc" state={{ from: location }} replace />;
  }

  return (
    <>
      <Navbar />
      <main className="pt-16">{/* reserve space for fixed navbar (h-16) */}
        {children}
      </main>
    </>
  );
}
