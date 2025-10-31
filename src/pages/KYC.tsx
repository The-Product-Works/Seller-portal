import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, CheckCircle } from "lucide-react";
import { z } from "zod";

const kycSchema = z.object({
  aadhaarNumber: z.string().regex(/^[2-9]{1}[0-9]{11}$/, "Invalid Aadhaar number"),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number"),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN"),
  bankAccountNumber: z.string().min(9, "Invalid account number").max(18, "Invalid account number"),
  bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
});

export default function KYC() {
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    aadhaarNumber: "",
    panNumber: "",
    gstin: "",
    businessName: "",
    businessType: "",
    phone: "",
    address: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankAccountHolderName: "",
    bankName: "",
    accountType: "savings",
  });
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<File | null>(null);
  const [panPhoto, setPanPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkKYCStatus();
  }, []);

  const checkKYCStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: seller } = await supabase
      .from("sellers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (seller) {
      setKycStatus(seller.verification_status);
      if (seller.verification_status === "pending" || seller.verification_status === "rejected") {
        setFormData(prev => ({
          ...prev,
          aadhaarNumber: seller.aadhaar || "",
          panNumber: seller.pan || "",
          gstin: seller.gstin || "",
          businessName: seller.business_name || "",
          businessType: seller.business_type || "",
          phone: seller.phone || "",
          address: seller.address_line1 || "",
          bankAccountNumber: seller.account_number || "",
          bankIfscCode: seller.ifsc_code || "",
          bankAccountHolderName: seller.account_holder_name || "",
          bankName: seller.bank_name || "",
          accountType: seller.account_type || "savings",
        }));
      }
    }
  };

  const uploadFile = async (file: File, folder: string, sellerId: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `seller_details/${sellerId}/${folder}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("seller_details")
      .upload(fileName, file);

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return null;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("seller_details")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 100);

    if (signedUrlError) {
      console.error("❌ Signed URL error:", signedUrlError);
      return null;
    }

    return signedUrlData.signedUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selfiePhoto || !aadhaarPhoto || !panPhoto) {
      toast({
        title: "Missing Photos",
        description: "Upload all required photos (Selfie, Aadhaar, and PAN)",
        variant: "destructive",
      });
      return;
    }

    const result = kycSchema.safeParse({
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      gstin: formData.gstin,
      bankAccountNumber: formData.bankAccountNumber,
      bankIfscCode: formData.bankIfscCode,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => (fieldErrors[err.path[0] as string] = err.message));
      setErrors(fieldErrors);
      toast({ title: "Validation Error", description: "Check form errors", variant: "destructive" });
      return;
    }

    if (!formData.gstin.includes(formData.panNumber)) {
      setErrors({ gstin: "GSTIN must contain your PAN number" });
      toast({ title: "Validation Error", description: "GSTIN must contain your PAN number", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 🔹 Step 1: Insert or Update Seller
    const { data: existingSeller } = await supabase
      .from("sellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let sellerData;
    let sellerError;

    if (existingSeller) {
      const result = await supabase
        .from("sellers")
        .update({
          name: formData.bankAccountHolderName,
          email: user.email,
          phone: formData.phone,
          aadhaar: formData.aadhaarNumber,
          pan: formData.panNumber,
          gstin: formData.gstin,
          business_name: formData.businessName,
          business_type: formData.businessType,
          address_line1: formData.address,
          verification_status: "pending",
          onboarding_status: "in_review",
        })
        .eq("id", existingSeller.id)
        .select()
        .single();

      sellerData = result.data;
      sellerError = result.error;
    } else {
      const result = await supabase
        .from("sellers")
        .insert({
          user_id: user.id,
          name: formData.bankAccountHolderName,
          email: user.email,
          phone: formData.phone,
          aadhaar: formData.aadhaarNumber,
          pan: formData.panNumber,
          gstin: formData.gstin,
          business_name: formData.businessName,
          business_type: formData.businessType,
          address_line1: formData.address,
          verification_status: "pending",
          onboarding_status: "in_review",
        })
        .select()
        .single();

      sellerData = result.data;
      sellerError = result.error;
    }

    if (sellerError || !sellerData) {
      console.error("❌ SELLER UPSERT FAILED:", sellerError);
      toast({ title: "Error", description: sellerError?.message || "Failed to create seller record", variant: "destructive" });
      setLoading(false);
      return;
    }

    const sellerId = sellerData.id;

    // 🔹 Step 2: Upload documents
    const [selfieUrl, aadhaarUrl, panUrl] = await Promise.all([
      uploadFile(selfiePhoto, "selfie", sellerId),
      uploadFile(aadhaarPhoto, "aadhaar", sellerId),
      uploadFile(panPhoto, "pan", sellerId),
    ]);

    if (!selfieUrl || !aadhaarUrl || !panUrl) {
      toast({ title: "Upload Error", description: "Failed to upload photos", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 🔹 Step 3: Bank Account Insert/Update
    const { data: existingBank } = await supabase
      .from("seller_bank_accounts")
      .select("id")
      .eq("seller_id", sellerId)
      .eq("is_primary", true)
      .maybeSingle();

    let bankError;

    if (existingBank) {
      const result = await supabase
        .from("seller_bank_accounts")
        .update({
          account_number: formData.bankAccountNumber,
          account_holder_name: formData.bankAccountHolderName,
          ifsc_code: formData.bankIfscCode,
          bank_name: formData.bankName || null,
          account_type: formData.accountType,
        })
        .eq("id", existingBank.id);
      bankError = result.error;
    } else {
      const result = await supabase
        .from("seller_bank_accounts")
        .insert({
          seller_id: sellerId,
          account_number: formData.bankAccountNumber,
          account_holder_name: formData.bankAccountHolderName,
          ifsc_code: formData.bankIfscCode,
          bank_name: formData.bankName || null,
          account_type: formData.accountType,
          is_primary: true,
        });
      bankError = result.error;
    }

    if (bankError) {
      toast({ title: "❌ Bank Account Error", description: bankError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // 🔹 Step 4: Insert documents into seller_documents
    const docFiles = [
      { file: aadhaarPhoto, url: aadhaarUrl, type: "aadhaar" },
      { file: panPhoto, url: panUrl, type: "pan" },
      { file: selfiePhoto, url: selfieUrl, type: "selfie" },
    ];

    for (const doc of docFiles) {
      const { error: docError } = await supabase.from("seller_documents").insert({
        seller_id: sellerId,
        doc_type: doc.type,
        file_name: doc.file.name,
        file_size: doc.file.size,
        mime_type: doc.file.type,
        storage_path: doc.url,
        uploaded_at: new Date().toISOString(),
      });

      if (docError) {
        toast({
          title: `❌ Document Insert Error (${doc.type})`,
          description: docError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    // 🔹 Step 5: Optional Verification Entry
    await supabase.from("seller_verifications").insert({
      seller_id: sellerId,
      step: "kyc_submission",
      status: "submitted",
      provider: "system",
      confidence: 1.0,
      verified_at: new Date().toISOString(),
    });

    setLoading(false);
    toast({
      title: "✅ KYC Submitted Successfully!",
      description: "Your documents are under review. Redirecting to dashboard...",
      duration: 3000,
    });
    navigate("/dashboard");
  };

  if (kycStatus === "approved")
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center shadow-pink">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl gradient-text">KYC Verified!</CardTitle>
            <CardDescription>Your account has been verified successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/landing")} className="gradient-primary shadow-glow">
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  if (kycStatus === "pending")
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center shadow-pink">
          <CardHeader>
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <CardTitle className="text-2xl gradient-text">KYC Verification Pending</CardTitle>
            <CardDescription>Your documents are under review. We'll notify you once verified.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full gradient-primary shadow-glow">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-pink">
          <CardHeader>
            <CardTitle className="text-3xl gradient-text">Complete KYC Verification</CardTitle>
            <CardDescription>Provide accurate information for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 📸 Photo Upload */}
              <div className="space-y-4 p-4 bg-accent/20 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Photo Verification Required
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {["Selfie", "Aadhaar", "PAN"].map((type) => (
                    <div className="space-y-2" key={type}>
                      <Label>{type} Photo *</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (type === "Selfie") setSelfiePhoto(e.target.files?.[0] || null);
                          if (type === "Aadhaar") setAadhaarPhoto(e.target.files?.[0] || null);
                          if (type === "PAN") setPanPhoto(e.target.files?.[0] || null);
                        }}
                        required
                        className="cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 🧾 Form Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <InputField label="Aadhaar Number" id="aadhaarNumber" value={formData.aadhaarNumber} error={errors.aadhaarNumber} onChange={(v) => setFormData({ ...formData, aadhaarNumber: v })} />
                <InputField label="PAN Number" id="panNumber" value={formData.panNumber} error={errors.panNumber} onChange={(v) => setFormData({ ...formData, panNumber: v.toUpperCase() })} />
                <InputField label="GSTIN" id="gstin" value={formData.gstin} error={errors.gstin} onChange={(v) => setFormData({ ...formData, gstin: v.toUpperCase() })} colSpan={2} />
                <InputField label="Business Name" id="businessName" value={formData.businessName} onChange={(v) => setFormData({ ...formData, businessName: v })} />
                <SelectField label="Business Type" value={formData.businessType} onChange={(v) => setFormData({ ...formData, businessType: v })} />
                <InputField label="Phone" id="phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />
                <InputField label="Address" id="address" value={formData.address} onChange={(v) => setFormData({ ...formData, address: v })} colSpan={2} />
                <InputField label="Bank Name" id="bankName" value={formData.bankName} onChange={(v) => setFormData({ ...formData, bankName: v })} />
                <InputField label="Bank Account Number" id="bankAccountNumber" value={formData.bankAccountNumber} error={errors.bankAccountNumber} onChange={(v) => setFormData({ ...formData, bankAccountNumber: v })} />
                <InputField label="IFSC Code" id="bankIfscCode" value={formData.bankIfscCode} error={errors.bankIfscCode} onChange={(v) => setFormData({ ...formData, bankIfscCode: v.toUpperCase() })} />
                <InputField label="Account Holder Name" id="bankAccountHolderName" value={formData.bankAccountHolderName} onChange={(v) => setFormData({ ...formData, bankAccountHolderName: v })} colSpan={2} />
              </div>

              <Button type="submit" className="w-full gradient-primary shadow-glow" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InputField({ label, id, value, onChange, error, colSpan }: { label: string; id: string; value: string; onChange: (value: string) => void; error?: string; colSpan?: number }) {
  return (
    <div className={`space-y-2 ${colSpan === 2 ? "md:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={error ? "border-destructive" : ""} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, colSpan }: { label: string; value: string; onChange: (value: string) => void; colSpan?: number }) {
  return (
    <div className={`space-y-2 ${colSpan === 2 ? "md:col-span-2" : ""}`}>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="individual">Individual</SelectItem>
          <SelectItem value="proprietorship">Proprietorship</SelectItem>
          <SelectItem value="partnership">Partnership</SelectItem>
          <SelectItem value="private_ltd">Private Limited</SelectItem>
          <SelectItem value="public_ltd">Public Limited</SelectItem>
          <SelectItem value="llp">LLP</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
