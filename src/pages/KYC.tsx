import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";
import { Camera, CheckCircle, Loader2, X } from "lucide-react";
import { z } from "zod";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { sendAdminKYCSubmittedEmail } from "@/lib/email/helpers/admin-kyc-submitted";

// ✅ Validation schema
const kycSchema = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^[2-9]{1}[0-9]{11}$/, "Invalid Aadhaar number"),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number"),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GSTIN"
    )
    .optional(),
  bankAccountNumber: z
    .string()
    .min(9, "Invalid account number")
    .max(18, "Invalid account number"),
  bankIfscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountHolderName: z.string().min(1, "Account holder name is required"),
});

// ✅ Business types (match EXACTLY Supabase enum)
const BUSINESS_TYPES = [
  { label: "Individual", value: "individual" },
  { label: "Sole Proprietorship", value: "proprietorship" },
  { label: "Partnership", value: "partnership" },
  { label: "Private Limited", value: "private_ltd" },
  { label: "Public Limited", value: "public_ltd" },
  { label: "LLP", value: "llp" },
  { label: "Other", value: "other" },
];

export default function KYC() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const { uploadDocument } = useDocumentUpload();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  type Seller = Database["public"]["Tables"]["sellers"]["Row"];
  type Notification = Database["public"]["Tables"]["notifications"]["Row"];

  const [seller, setSeller] = useState<Seller | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    aadhaarNumber: "",
    panNumber: "",
    gstin: "",
    businessName: "",
    businessType: "individual",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    bankName: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankAccountHolderName: "",
    accountType: "savings",
    email: "",
  });

  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<File | null>(null);
  const [panPhoto, setPanPhoto] = useState<File | null>(null);

  // Store uploaded documents URLs for display
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    selfie?: string;
    aadhaar?: string;
    pan?: string;
  }>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth/signin");
          return;
        }

        // Handle Google OAuth seller signup - update user role from buyer to seller
        const sellerSignupPending = localStorage.getItem('seller_signup_pending');
        if (sellerSignupPending === 'true') {
          console.log('Processing seller signup for OAuth user:', user.id);
          localStorage.removeItem('seller_signup_pending');
          
          // Call the database function to assign seller role
          const { error: roleError } = await supabase.rpc('assign_seller_role_for_oauth', {
            p_user_id: user.id
          });
          
          if (roleError) {
            console.error('Failed to assign seller role via RPC:', roleError);
            // Try direct update as fallback (RPC function may not exist yet)
            try {
              const { data: sellerRole } = await supabase
                .from('roles')
                .select('role_id')
                .eq('role_name', 'seller')
                .single();
              
              const { data: buyerRole } = await supabase
                .from('roles')
                .select('role_id')
                .eq('role_name', 'buyer')
                .single();
              
              if (sellerRole?.role_id) {
                // Delete buyer role if exists
                if (buyerRole?.role_id) {
                  await supabase
                    .from('user_roles')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('role_id', buyerRole.role_id);
                }
                
                // Insert seller role (upsert to avoid conflicts)
                await supabase
                  .from('user_roles')
                  .upsert({ user_id: user.id, role_id: sellerRole.role_id }, 
                    { onConflict: 'user_id,role_id' });
                
                // Create seller record if not exists
                await supabase
                  .from('sellers')
                  .upsert({
                    user_id: user.id,
                    email: user.email || '',
                    is_individual: true,
                    onboarding_status: 'started',
                    created_at: new Date().toISOString(),
                  }, { onConflict: 'user_id' });
              }
            } catch (fallbackError) {
              console.error('Fallback role assignment also failed:', fallbackError);
            }
          } else {
            console.log('Successfully assigned seller role via RPC');
          }
        }

        const { data: s, error } = await supabase
          .from("sellers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;

        if (s) {
          setSeller(s);
          setKycStatus(s.verification_status);

          if (s.verification_status === "pending") {
            navigate("/seller-verification");
            return;
          }

          setFormData({
            aadhaarNumber: s.aadhaar ?? "",
            panNumber: s.pan ?? "",
            gstin: s.gstin ?? "",
            businessName: s.business_name ?? "",
            businessType: s.business_type || "individual",
            phone: s.phone ?? "",
            address_line1: s.address_line1 ?? "",
            address_line2: s.address_line2 ?? "",
            city: s.city ?? "",
            state: s.state ?? "",
            pincode: s.pincode ?? "",
            country: s.country ?? "India",
            bankName: s.bank_name ?? "",
            bankAccountNumber: s.account_number ?? "",
            bankIfscCode: s.ifsc_code ?? "",
            bankAccountHolderName: s.account_holder_name ?? "",
            accountType: s.account_type ?? "savings",
            email: s.email ?? "",
          });

          // Load previously uploaded documents
          const { data: docs, error: docsError } = await supabase
            .from("seller_documents")
            .select("*")
            .eq("seller_id", s.id)
            .order("uploaded_at", { ascending: false });

          console.log("Loading seller documents for seller:", s.id);
          console.log("Documents query error:", docsError);
          console.log("Documents found:", docs);
          console.log("Number of documents:", docs?.length);

          if (docs && docs.length > 0) {
            const docMap: { selfie?: string; aadhaar?: string; pan?: string } = {};
            
            // Group documents by type and take only the most recent one (already sorted by uploaded_at DESC)
            const latestDocs = new Map<string, typeof docs[0]>();
            for (const doc of docs) {
              const docType = doc.doc_type;
              if (docType && !latestDocs.has(docType)) {
                latestDocs.set(docType, doc);
              }
            }
            
            console.log("Latest docs by type:", Array.from(latestDocs.keys()));
            
            // Process only the latest document of each type - storage_path is already a signed URL
            for (const [docType, doc] of latestDocs.entries()) {
              console.log("Processing document:", docType, "storage_path:", doc.storage_path);
              
              if (!doc.storage_path) {
                console.warn("No storage_path for", docType);
                continue;
              }
              
              // storage_path is already a Supabase signed URL, use it directly
              const displayUrl = doc.storage_path;
              console.log("Display URL for", docType, ":", displayUrl);
              
              // Map to the correct field based on doc type
              if (docType === "selfie") {
                docMap.selfie = displayUrl;
              } else if (docType === "aadhaar") {
                docMap.aadhaar = displayUrl;
              } else if (docType === "pan") {
                docMap.pan = displayUrl;
              }
            }
            
            console.log("Final docMap with all 3 docs:", docMap);
            console.log("Selfie:", !!docMap.selfie, "Aadhaar:", !!docMap.aadhaar, "PAN:", !!docMap.pan);
            setUploadedDocuments(docMap);
          } else {
            console.log("No documents found or docs is null/empty");
          }

          const { data: notifs } = await supabase
            .from("notifications")
            .select("*")
            .eq("related_seller_id", s.id)
            .order("created_at", { ascending: false })
            .limit(20);
          setNotifications(notifs ?? []);
        }
      } catch (err: unknown) {
        let errorMessage = "Failed to load KYC";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "object" && err !== null) {
          const errObj = err as Record<string, unknown>;
          errorMessage = (errObj.message as string) || (errObj.details as string) || JSON.stringify(err);
        }
        console.error("KYC load error", err);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const validation = kycSchema.safeParse({
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        gstin: formData.gstin || undefined,
        bankAccountNumber: formData.bankAccountNumber,
        bankIfscCode: formData.bankIfscCode,
        bankName: formData.bankName,
        bankAccountHolderName: formData.bankAccountHolderName,
      });

      if (!validation.success) {
        const errs: Record<string, string> = {};
        validation.error.errors.forEach(
          (er) => (errs[er.path[0] as string] = er.message)
        );
        setErrors(errs);
        toast({
          title: "Validation error",
          description: "Fix form errors",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Ensure GSTIN includes PAN
      if (
        formData.gstin &&
        formData.panNumber &&
        !formData.gstin.includes(formData.panNumber)
      ) {
        setErrors({ gstin: "GSTIN must contain PAN" });
        toast({
          title: "Validation error",
          description: "GSTIN must contain PAN",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // ✅ Always send a valid enum value for business_type
      const safeBusinessType =
        BUSINESS_TYPES.find(
          (b) => b.value === formData.businessType?.toLowerCase()
        )?.value || "individual";

      // ✅ Derive is_individual from business_type
      const isIndividual = safeBusinessType === "individual";

      if (!seller) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Update user phone in auth
        if (formData.phone) {
          await supabase.auth.admin.updateUserById(user.id, {
            phone: formData.phone,
          });
        }

        const { data: newSeller, error } = await supabase
          .from("sellers")
          .insert({
            user_id: user.id,
            name: formData.businessName || user.email,
            email: user.email,
            phone: formData.phone || null,
            is_individual: isIndividual,
            aadhaar: formData.aadhaarNumber || null,
            pan: formData.panNumber || null,
            gstin: formData.gstin || null,
            business_name: formData.businessName || null,
            business_type: safeBusinessType,
            address_line1: formData.address_line1 || null,
            address_line2: formData.address_line2 || null,
            city: formData.city || null,
            state: formData.state || null,
            pincode: formData.pincode || null,
            country: formData.country || "India",
            bank_name: formData.bankName || null,
            account_number: formData.bankAccountNumber || null,
            ifsc_code: formData.bankIfscCode || null,
            account_holder_name: formData.bankAccountHolderName || null,
            account_type: formData.accountType || null,
            verification_status: "pending",
            onboarding_status: "in_review",
            onboarding_step: 1,
          })
          .select()
          .single();

        if (error) throw error;

        // Upload provided photos (this also inserts rows into seller_documents via hook)
        try {
          console.log("Starting document uploads for seller:", newSeller.id);
          console.log("Selfie photo:", selfiePhoto?.name, selfiePhoto?.size);
          console.log("Aadhaar photo:", aadhaarPhoto?.name, aadhaarPhoto?.size);
          console.log("PAN photo:", panPhoto?.name, panPhoto?.size);
          
          const uploadResults = {
            selfie: false,
            aadhaar: false,
            pan: false
          };
          
          if (selfiePhoto) {
            console.log("Uploading selfie...");
            const r = await uploadDocument(newSeller.id, selfiePhoto, "selfie");
            console.log("Selfie upload result:", r);
            uploadResults.selfie = r.success;
            if (!r.success) {
              console.error("Selfie upload failed:", r.error);
              toast({
                title: "Selfie upload failed",
                description: r.error || "Failed to upload selfie",
                variant: "destructive",
              });
            }
          }
          
          if (aadhaarPhoto) {
            console.log("Uploading aadhaar...");
            const r = await uploadDocument(newSeller.id, aadhaarPhoto, "aadhaar");
            console.log("Aadhaar upload result:", r);
            uploadResults.aadhaar = r.success;
            if (!r.success) {
              console.error("Aadhaar upload failed:", r.error);
              toast({
                title: "Aadhaar upload failed",
                description: r.error || "Failed to upload aadhaar",
                variant: "destructive",
              });
            }
          }
          
          if (panPhoto) {
            console.log("Uploading pan...");
            const r = await uploadDocument(newSeller.id, panPhoto, "pan");
            console.log("PAN upload result:", r);
            uploadResults.pan = r.success;
            if (!r.success) {
              console.error("PAN upload failed:", r.error);
              toast({
                title: "PAN upload failed",
                description: r.error || "Failed to upload PAN",
                variant: "destructive",
              });
            }
          }
          
          console.log("All document uploads completed. Results:", uploadResults);
          
          // Check if all required uploads succeeded
          const failedUploads = [];
          if (selfiePhoto && !uploadResults.selfie) failedUploads.push("Selfie");
          if (aadhaarPhoto && !uploadResults.aadhaar) failedUploads.push("Aadhaar");
          if (panPhoto && !uploadResults.pan) failedUploads.push("PAN");
          
          if (failedUploads.length > 0) {
            toast({
              title: "Some uploads failed",
              description: `Failed to upload: ${failedUploads.join(", ")}. Please resubmit.`,
              variant: "destructive",
            });
          }
        } catch (upErr: unknown) {
          const error = upErr instanceof Error ? upErr : new Error(String(upErr));
          console.error("Error uploading KYC documents:", error);
          // non-fatal - we still proceed to verification page but notify user
          toast({
            title: "Upload error",
            description: error?.message || "Failed to upload some documents",
            variant: "destructive",
          });
        }

        toast({
          title: `Hi ${user.email?.split('@')[0] || 'Seller'}, welcome to Protimart! 🎉`,
          description: "Your KYC has been submitted successfully. Documents are under review.",
        });

        // Send admin notification email about KYC submission
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
        if (adminEmail && newSeller) {
          try {
            const documentsSubmitted = [];
            if (selfiePhoto) documentsSubmitted.push('selfie');
            if (aadhaarPhoto) documentsSubmitted.push('aadhaar');
            if (panPhoto) documentsSubmitted.push('pan');
            if (formData.gstin) documentsSubmitted.push('gstin');

            await sendAdminKYCSubmittedEmail({
              adminEmail,
              sellerName: formData.businessName || user.email?.split('@')[0] || 'Seller',
              sellerEmail: user.email || '',
              sellerId: newSeller.id,
              businessName: formData.businessName,
              documentsSubmitted,
              submittedAt: new Date().toISOString(),
              dashboardUrl: `${window.location.origin}/admin/sellers/${newSeller.id}`,
            });
            console.log('[KYC] Admin notification email sent successfully');
          } catch (emailError) {
            console.error('[KYC] Failed to send admin notification email:', emailError);
            // Non-fatal - don't block user flow
          }
        }

        navigate("/seller-verification");
        return;
      }
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser && formData.phone) {
        await supabase.auth.admin.updateUserById(currentUser.id, {
          phone: formData.phone,
        });
      }

      const { error: updErr } = await supabase
        .from("sellers")
        .update({
          name: formData.businessName || seller.name,
          phone: formData.phone || null,
          is_individual: isIndividual,
          aadhaar: formData.aadhaarNumber,
          pan: formData.panNumber,
          gstin: formData.gstin,
          business_name: formData.businessName,
          business_type: safeBusinessType,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          pincode: formData.pincode || null,
          country: formData.country || "India",
          bank_name: formData.bankName,
          account_number: formData.bankAccountNumber,
          ifsc_code: formData.bankIfscCode,
          account_holder_name: formData.bankAccountHolderName,
          email: formData.email,
          verification_status: "pending",
        })
        .eq("id", seller.id);

      if (updErr) {
        console.error("Sellers update error details:", updErr);
        throw updErr;
      }

      // If user provided any new photos during resubmission, upload them
      try {
        console.log("Starting document re-uploads for seller:", seller.id);
        console.log("Selfie photo:", selfiePhoto?.name, selfiePhoto?.size);
        console.log("Aadhaar photo:", aadhaarPhoto?.name, aadhaarPhoto?.size);
        console.log("PAN photo:", panPhoto?.name, panPhoto?.size);
        
        const uploadResults = {
          selfie: false,
          aadhaar: false,
          pan: false
        };
        
        if (selfiePhoto) {
          console.log("Uploading new selfie...");
          const r = await uploadDocument(seller.id, selfiePhoto, "selfie");
          console.log("Selfie upload result:", r);
          uploadResults.selfie = r.success;
          if (!r.success) {
            console.error("Selfie upload failed:", r.error);
            toast({
              title: "Selfie upload failed",
              description: r.error || "Failed to upload selfie",
              variant: "destructive",
            });
          }
        }
        
        if (aadhaarPhoto) {
          console.log("Uploading new aadhaar...");
          const r = await uploadDocument(seller.id, aadhaarPhoto, "aadhaar");
          console.log("Aadhaar upload result:", r);
          uploadResults.aadhaar = r.success;
          if (!r.success) {
            console.error("Aadhaar upload failed:", r.error);
            toast({
              title: "Aadhaar upload failed",
              description: r.error || "Failed to upload aadhaar",
              variant: "destructive",
            });
          }
        }
        
        if (panPhoto) {
          console.log("Uploading new pan...");
          const r = await uploadDocument(seller.id, panPhoto, "pan");
          console.log("PAN upload result:", r);
          uploadResults.pan = r.success;
          if (!r.success) {
            console.error("PAN upload failed:", r.error);
            toast({
              title: "PAN upload failed",
              description: r.error || "Failed to upload PAN",
              variant: "destructive",
            });
          }
        }
        
        console.log("All document re-uploads completed. Results:", uploadResults);
      } catch (upErr: unknown) {
        const error = upErr instanceof Error ? upErr : new Error(String(upErr));
        console.error("Error uploading KYC documents:", error);
        toast({
          title: "Upload error",
          description: error?.message || "Failed to upload some documents",
          variant: "destructive",
        });
      }

      toast({ title: "Resubmitting KYC", description: "Your KYC has been resubmitted for review. Thank you for updating your information." });
      navigate("/seller-verification");
    } catch (err: unknown) {
      let errorMessage = "Failed to submit KYC";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        // Handle Supabase error objects
        const errObj = err as Record<string, unknown>;
        errorMessage = (errObj.message as string) || (errObj.details as string) || JSON.stringify(err);
      }
      console.error("KYC submit error", err, errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (kycStatus === "approved" || kycStatus === "verified")
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">KYC Approved</CardTitle>
            <CardDescription>Your KYC has been approved by admin. You can now access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  // Show warning message for failed/revoked status but allow resubmission
  const showRevocationWarning = kycStatus === "failed" || kycStatus === "revoked";

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Complete KYC Verification</CardTitle>
            <CardDescription>Provide accurate information</CardDescription>
            {showRevocationWarning && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <X className="w-5 h-5" />
                  <span className="font-semibold">Verification Status Revoked</span>
                </div>
                <p className="text-red-700 mt-1">Your verification has been revoked. Reason: not correct data</p>
                <p className="text-red-600 text-sm mt-2">Please update your information below and resubmit.</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kyc">
              <TabsList>
                <TabsTrigger value="kyc">KYC</TabsTrigger>
                <TabsTrigger value="notifications">
                  Notifications ({notifications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="kyc" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4 p-4 bg-accent/20 rounded-lg">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Camera className="w-5 h-5" /> Upload Documents
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Selfie */}
                      <div className="space-y-2">
                        <Label>Selfie Photo *</Label>
                        {uploadedDocuments.selfie || selfiePhoto ? (
                          <div className="relative border-2 border-dashed rounded-lg p-2">
                            <img
                              src={
                                selfiePhoto
                                  ? URL.createObjectURL(selfiePhoto)
                                  : uploadedDocuments.selfie
                              }
                              alt="Selfie preview"
                              className="w-full h-40 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSelfiePhoto(null);
                                setUploadedDocuments({ ...uploadedDocuments, selfie: undefined });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              aria-label="Remove selfie photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                console.log("Selfie file selected:", file?.name, file?.size, file?.type);
                                setSelfiePhoto(file || null);
                              }}
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Upload a clear selfie photo (required)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Aadhaar */}
                      <div className="space-y-2">
                        <Label>Aadhaar Photo *</Label>
                        {uploadedDocuments.aadhaar || aadhaarPhoto ? (
                          <div className="relative border-2 border-dashed rounded-lg p-2">
                            <img
                              src={
                                aadhaarPhoto
                                  ? URL.createObjectURL(aadhaarPhoto)
                                  : uploadedDocuments.aadhaar
                              }
                              alt="Aadhaar preview"
                              className="w-full h-40 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAadhaarPhoto(null);
                                setUploadedDocuments({ ...uploadedDocuments, aadhaar: undefined });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              aria-label="Remove aadhaar photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setAadhaarPhoto(e.target.files?.[0] || null)
                              }
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Upload a clear Aadhaar photo (required)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* PAN */}
                      <div className="space-y-2">
                        <Label>PAN Photo *</Label>
                        {uploadedDocuments.pan || panPhoto ? (
                          <div className="relative border-2 border-dashed rounded-lg p-2">
                            <img
                              src={
                                panPhoto
                                  ? URL.createObjectURL(panPhoto)
                                  : uploadedDocuments.pan
                              }
                              alt="PAN preview"
                              className="w-full h-40 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPanPhoto(null);
                                setUploadedDocuments({ ...uploadedDocuments, pan: undefined });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              aria-label="Remove PAN photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setPanPhoto(e.target.files?.[0] || null)
                              }
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Upload a clear PAN photo (required)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Aadhaar Number</Label>
                      <Input
                        value={formData.aadhaarNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            aadhaarNumber: e.target.value,
                          })
                        }
                      />
                      {errors.aadhaarNumber && (
                        <p className="text-sm text-destructive">
                          {errors.aadhaarNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>PAN Number</Label>
                      <Input
                        value={formData.panNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            panNumber: e.target.value.toUpperCase(),
                          })
                        }
                      />
                      {errors.panNumber && (
                        <p className="text-sm text-destructive">
                          {errors.panNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>GSTIN</Label>
                      <Input
                        value={formData.gstin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gstin: e.target.value.toUpperCase(),
                          })
                        }
                      />
                      {errors.gstin && (
                        <p className="text-sm text-destructive">
                          {errors.gstin}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Business Name</Label>
                      <Input
                        value={formData.businessName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            businessName: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* ✅ ENUM dropdown always valid */}
                    <div>
                      <Label>Business Type</Label>
                      <select
                        aria-label="Business Type"
                        className="w-full border border-input rounded-md p-2 bg-background"
                        value={formData.businessType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            businessType: e.target.value,
                          })
                        }
                        required
                      >
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Address Line 1</Label>
                      <Input
                        value={formData.address_line1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address_line1: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Address Line 2 (Optional)</Label>
                      <Input
                        value={formData.address_line2}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address_line2: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>State</Label>
                      <Input
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            state: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Pincode</Label>
                      <Input
                        value={formData.pincode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pincode: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Country</Label>
                      <Input
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            country: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Bank Name *</Label>
                      <Input
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankName: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.bankName && (
                        <p className="text-sm text-destructive">
                          {errors.bankName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Account Number *</Label>
                      <Input
                        value={formData.bankAccountNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankAccountNumber: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.bankAccountNumber && (
                        <p className="text-sm text-destructive">
                          {errors.bankAccountNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>IFSC Code *</Label>
                      <Input
                        value={formData.bankIfscCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankIfscCode: e.target.value.toUpperCase(),
                          })
                        }
                        required
                      />
                      {errors.bankIfscCode && (
                        <p className="text-sm text-destructive">
                          {errors.bankIfscCode}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Account Holder Name *</Label>
                      <Input
                        value={formData.bankAccountHolderName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankAccountHolderName: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.bankAccountHolderName && (
                        <p className="text-sm text-destructive">
                          {errors.bankAccountHolderName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Email</Label>
                      <Input
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting}>
                      {submitting && (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      )}
                      {showRevocationWarning ? "Resubmit KYC" : "Submit KYC"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="notifications" className="mt-4">
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n: Notification) => (
                      <div
                        key={n.id}
                        className="border rounded p-3 flex justify-between items-start"
                      >
                        <div>
                          <div className="text-sm font-semibold">
                            {n.title || n.type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {n.message}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}