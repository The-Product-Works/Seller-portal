import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

const signupSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/kyc`,
      },
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({ username, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        fieldErrors[field] = error.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    // Check if user with this email already exists in public.users table
    const { data: existingUsers, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email);

    if (userCheckError) {
      console.error("Error checking existing user:", userCheckError);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to verify email availability. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // If any user exists with this email, check their roles
    if (existingUsers && existingUsers.length > 0) {
      for (const user of existingUsers) {
        const { data: userRoles, error: roleCheckError } = await supabase
          .from("user_roles")
          .select(`
            role_id,
            roles (
              role_name
            )
          `)
          .eq("user_id", user.id);

        if (roleCheckError) {
          console.error("Error checking user roles:", roleCheckError);
          setLoading(false);
          toast({
            title: "Error",
            description: "Failed to verify account status. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Check if user has buyer role
        const hasBuyerRole = userRoles?.some(
          (ur: { roles?: { role_name: string } | null }) => ur.roles?.role_name === "buyer"
        );

        if (hasBuyerRole) {
          setLoading(false);
          toast({
            title: "Account Already Exists",
            description: "This email is already registered as a buyer account. Please use a different email for seller registration.",
            variant: "destructive",
          });
          setErrors({
            email: "Email already registered as buyer",
          });
          return;
        }

        // Check if user has seller role (they might be trying to signup again)
        const hasSellerRole = userRoles?.some(
          (ur: { roles?: { role_name: string } | null }) => ur.roles?.role_name === "seller"
        );

        if (hasSellerRole) {
          setLoading(false);
          toast({
            title: "Account Already Exists",
            description: "You already have a seller account. Please sign in instead.",
            variant: "destructive",
          });
          setErrors({
            email: "Email already registered",
          });
          return;
        }
      }

      // User exists but has no role assigned - this shouldn't happen but block it anyway
      setLoading(false);
      toast({
        title: "Email Already Registered",
        description: "This email is already registered. Please sign in or contact support.",
        variant: "destructive",
      });
      setErrors({
        email: "Email already registered",
      });
      return;
    }

    const redirectUrl = `${window.location.origin}/kyc`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
        },
      },
    });

    setLoading(false);

    if (authError) {
      toast({
        title: "Error",
        description: authError.message,
        variant: "destructive",
      });
      return;
    }

    // Create seller record after successful signup
    if (authData.user) {
      const { error: sellerError } = await supabase.from("sellers").insert({
        user_id: authData.user.id,
        email: email,
        is_individual: true,
        onboarding_status: "started",
        created_at: new Date().toISOString(),
      });

      if (sellerError) {
        console.error("Failed to create seller record:", sellerError);
        toast({
          title: "Warning",
          description: "Account created but failed to initialize seller profile. Please contact support.",
          variant: "destructive",
        });
      }
    }

    // Auto sign-in after successful signup
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Auto sign-in failed:", signInError);
      toast({
        title: "Success",
        description: "Account created! Redirecting to sign in...",
      });
      navigate("/auth/signin");
      return;
    }

    toast({
      title: "Success",
      description: "Account created! Please complete your KYC verification.",
    });
    navigate("/kyc");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-background px-4">
      <Card className="w-full max-w-md shadow-pink">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Heart className="w-12 h-12 text-primary fill-primary animate-float" />
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">Join ProtiMart</CardTitle>
          <CardDescription>Create your seller account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogleSignUp}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? "Signing up..." : "Continue with Google"}
          </Button>
          
          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
              Or continue with email
            </span>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={errors.username ? "border-destructive" : ""}
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>
            <Button type="submit" className="w-full gradient-primary shadow-glow" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/auth/signin" className="text-primary hover:underline font-medium ml-1">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
