// src/pages/KYC.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SellerData {
  id?: string;
  aadhaar: string | null;
  pan: string | null;
  email: string | null;
  gstin: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  account_holder_name: string | null;
  verification_status: string | null;
}

export default function KYC() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [seller, setSeller] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    fetchSeller();
  }, []);

  async function fetchSeller() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/signin");
        return;
      }

      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      setSeller(data);

      // ✅ Smart routing logic
      switch (data.verification_status) {
        case "verified":
          toast({
            title: "KYC Verified",
            description: "Redirecting to dashboard...",
          });
          navigate("/dashboard");
          setDisabled(true);
          break;

        case "pending":
          toast({
            title: "KYC Under Review",
            description: "Redirecting to Seller Profile...",
          });
          navigate("/SellerProfile");
          setDisabled(true);
          break;

        case "failed":
        case "rejected":
          toast({
            title: "KYC Rejected",
            description: "Please re-submit your details for admin review.",
            variant: "destructive",
          });
          setDisabled(false);
          break;

        case "banned":
          toast({
            title: "Account Banned",
            description: "Contact support for further assistance.",
            variant: "destructive",
          });
          setDisabled(true);
          break;

        default:
          setDisabled(false);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const { name, value } = e.target;
    setSeller((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  async function handleSubmit() {
    if (!seller) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "User not authenticated" });
        return;
      }

      const updateData = {
        aadhaar: seller.aadhaar,
        pan: seller.pan,
        gstin: seller.gstin,
        email: seller.email,
        bank_name: seller.bank_name,
        account_number: seller.account_number,
        ifsc_code: seller.ifsc_code,
        account_holder_name: seller.account_holder_name,
        verification_status: "pending",
      };

      const { error } = await supabase
        .from("sellers")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      // ✅ Create notification for admin
      await supabase.from("notifications").insert({
        sender_id: user.id,
        receiver_id: null, // sent to admin
        related_seller_id: seller.id,
        type: "kyc_submitted",
        title: "New KYC Submission",
        message: "Seller has submitted KYC details for review.",
      });

      toast({
        title: "KYC Submitted",
        description: "Your KYC has been sent for verification.",
      });

      setDisabled(true);
      navigate("/SellerProfile");
    } catch (err: any) {
      toast({
        title: "Error Submitting KYC",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !seller)
    return (
      <div className="p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
        Loading KYC details...
      </div>
    );

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <Card className="max-w-2xl mx-auto shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">KYC Verification</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {[
            { label: "Aadhaar Number", name: "aadhaar" },
            { label: "PAN Number", name: "pan" },
            { label: "GSTIN", name: "gstin" },
            { label: "Email", name: "email" },
            { label: "Bank Name", name: "bank_name" },
            { label: "Account Holder Name", name: "account_holder_name" },
            { label: "Account Number", name: "account_number" },
            { label: "IFSC Code", name: "ifsc_code" },
          ].map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                value={(seller as any)[field.name] || ""}
                onChange={handleChange}
                disabled={disabled}
                placeholder={`Enter ${field.label}`}
              />
            </div>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={disabled || submitting}
            className="w-full mt-4"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" /> Submitting...
              </>
            ) : disabled ? (
              "KYC Already Submitted"
            ) : (
              "Submit KYC"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
