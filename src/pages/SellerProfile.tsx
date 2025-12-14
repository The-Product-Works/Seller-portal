// src/pages/SellerProfile.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/database.types";
import { Loader2, Save, PlusCircle, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Seller = Database["public"]["Tables"]["sellers"]["Row"];
type SellerDocument = Database["public"]["Tables"]["seller_documents"]["Row"];

export default function SellerProfile() {
  const { toast } = useToast();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [allowedFields, setAllowedFields] = useState<string[]>([]);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  type SellerDocPartial = Pick<SellerDocument, "doc_type" | "storage_path">;
  const [docs, setDocs] = useState<SellerDocPartial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [reason, setReason] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    aadhaar: null,
    pan: null,
    selfie: null,
  });
  const [requestedFields, setRequestedFields] = useState<string[]>([]);

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingAccount, setUpdatingAccount] = useState(false);

  // 🔒 Restricted fields needing admin approval (GSTIN now included)
  const restrictedFields = [
    "aadhaar",
    "pan",
    "selfie",
    "bank_details",
    "gstin",
    "fssai",
  ];

  // ✅ Instantly editable fields
  const alwaysAllowed = ["businessname", "businesstype", "address", "phone"];

  const isAllowed = (logicalField: string) => {
    if (alwaysAllowed.includes(logicalField)) return true;
    if (!allowedFields.length) return !restrictedFields.includes(logicalField);
    return allowedFields.includes(logicalField) || !restrictedFields.includes(logicalField);
  };

  const toggleRequestField = (field: string) => {
    setRequestedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  useEffect(() => {
    loadSellerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSellerProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: s } = await supabase.from("sellers").select("*").eq("user_id", user.id).maybeSingle();
      if (!s) return;
      setSeller(s);

      const { data: feedback } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("seller_id", s.id)
        .eq("step", "edit_request_feedback")
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (feedback?.details) {
        const det = feedback.details as Record<string, unknown>;
        setAllowedFields((det.allowed_fields as string[]) || []);
        setAdminMessage((det.admin_message as string | null) || null);
      }

      const { data: documents } = await supabase
        .from("seller_documents")
        .select("doc_type, storage_path")
        .eq("seller_id", s.id)
        .order("uploaded_at", { ascending: false });

      // Group by doc_type and take only the most recent of each type
      // storage_path is already a Supabase signed URL, use it directly
      const latestDocsMap = new Map<string, SellerDocPartial>();
      
      if (documents && Array.isArray(documents)) {
        for (const d of documents) {
          const docType = (d as SellerDocument).doc_type;
          if (!docType) continue;
          
          // Only keep the first occurrence of each doc_type (most recent due to ORDER BY)
          if (!latestDocsMap.has(docType)) {
            latestDocsMap.set(docType, d as SellerDocPartial);
          }
        }
      }

      // Convert map to array ensuring we have all 3 doc types
      const docsWithUrls = Array.from(latestDocsMap.values());
      console.log("Profile viewing documents:", docsWithUrls.length, "docs -", Array.from(latestDocsMap.keys()));
      console.log("Document URLs:", docsWithUrls.map(d => ({ type: d.doc_type, url: d.storage_path })));
      setDocs(docsWithUrls || []);

      setFormData({
        businessName: s.business_name || "",
        businessType: s.business_type || "",
        gstin: s.gstin || "",
        aadhaar: s.aadhaar || "",
        pan: s.pan || "",
        address: s.address_line1 || "",
        bankName: s.bank_name || "",
        accountNumber: s.account_number || "",
        ifsc: s.ifsc_code || "",
        accountHolderName: s.account_holder_name || "",
        email: s.email || "",
        phone: s.phone || "",
      });

      // Set account fields
      setNewUsername(s.name || "");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ title: "Error loading profile", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File, folder: string) {
    if (!seller?.id) throw new Error("Seller not found");
    const ext = file.name.split(".").pop();
    const path = `${seller.id}/${folder}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("seller_details").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    const { data: urlData } = await supabase.storage
      .from("seller_details")
      .createSignedUrl(up.data.path, 60 * 60 * 24 * 365 * 5);
    return urlData.signedUrl;
  }

  // ✅ Save only allowed fields directly
  async function handleSave() {
    setSaving(true);
    try {
  const editableNow: Record<string, string> = {};

      for (const key of Object.keys(formData)) {
        const newVal = formData[key];
        const oldVal =
          key === "businessName"
            ? seller.business_name
            : key === "gstin"
            ? seller.gstin
            : key === "aadhaar"
            ? seller.aadhaar
            : key === "pan"
            ? seller.pan
            : key === "address"
            ? seller.address_line1
            : key === "bankName"
            ? seller.bank_name
            : key === "accountNumber"
            ? seller.account_number
            : key === "ifsc"
            ? seller.ifsc_code
            : key === "accountHolderName"
            ? seller.account_holder_name
            : key === "email"
            ? seller.email
            : key === "phone"
            ? seller.phone
            : "";

        if (newVal === oldVal) continue;

        const logical = key.toLowerCase();
        if (isAllowed(logical)) editableNow[key] = newVal;
      }

      if (Object.keys(editableNow).length) {
        await supabase
          .from("sellers")
          .update({
            business_name: editableNow.businessName,
            business_type: editableNow.businessType,
            address_line1: editableNow.address,
            phone: editableNow.phone,
          })
          .eq("id", seller.id);

        toast({ title: "Saved", description: "Profile updated successfully." });
      } else {
        toast({ title: "No editable changes found" });
      }

      loadSellerProfile();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // 🔒 Send restricted edit request (e.g. GSTIN, Aadhaar, PAN, Bank, Email)
  async function handleRequestChange() {
    if (!requestedFields.length) {
      toast({ title: "No requested fields", description: "Use + icons to select locked fields." });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Please explain why you need this change." });
      return;
    }

    setSubmittingRequest(true);
    try {
      const restrictedChanges: Record<string, unknown> = {};

      for (const field of requestedFields) {
        if (field === "bank_details") {
          restrictedChanges["bank_details"] = {
            old_value: {
              bank_name: seller.bank_name,
              account_number: seller.account_number,
              ifsc: seller.ifsc_code,
              account_holder_name: seller.account_holder_name,
            },
            new_value: {
              bank_name: formData.bankName,
              account_number: formData.accountNumber,
              ifsc: formData.ifsc,
              account_holder_name: formData.accountHolderName,
            },
          };
        } else {
          restrictedChanges[field] = {
            old_value: field === "bank_details" ? {
              bank_name: seller.bank_name,
              account_number: seller.account_number,
              ifsc: seller.ifsc_code,
              account_holder_name: seller.account_holder_name,
            } : seller[field as keyof typeof seller] || "",
            new_value: formData[field as keyof typeof formData] || "",
          };
        }
      }

      const detailsObj: Json = JSON.parse(JSON.stringify({ requested_changes: restrictedChanges, reason }));
      await supabase.from("seller_verifications").insert({
        seller_id: seller.id,
        step: "edit_request",
        status: "pending",
        details: detailsObj,
        verified_at: new Date().toISOString(),
      });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("notifications").insert({
        sender_id: user?.id,
        receiver_id: null,
        related_seller_id: seller.id,
        type: "edit_request",
        title: "Seller requested change",
        message: `Requested updates: ${requestedFields.join(", ")}`,
      });

      toast({ title: "Request Sent", description: "Your edit request has been sent to admin." });
      setRequestedFields([]);
      setReason("");
      loadSellerProfile();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingRequest(false);
    }
  }

  // ✅ Instantly update account settings (email, password, username)
  async function handleUpdateAccount() {
    if (!newEmail && !newPassword && !newUsername) {
      toast({ title: "No changes", description: "Please enter at least one field to update." });
      return;
    }

    setUpdatingAccount(true);
    try {
      const updates: {
        email?: string;
        password?: string;
      } = {};

      // Update email via Supabase Auth
      if (newEmail && newEmail !== seller?.email) {
        updates.email = newEmail;
      }

      // Update password via Supabase Auth
      if (newPassword) {
        updates.password = newPassword;
      }

      // Update username in sellers table
      if (newUsername && newUsername !== seller?.name) {
        await supabase
          .from("sellers")
          .update({ name: newUsername, email: newEmail || seller?.email })
          .eq("id", seller!.id);
      } else if (newEmail && newEmail !== seller?.email) {
        // Update email in sellers table if only email changed
        await supabase
          .from("sellers")
          .update({ email: newEmail })
          .eq("id", seller!.id);
      }

      // Apply auth updates
      if (updates.email || updates.password) {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;
      }

      toast({ 
        title: "Account Updated", 
        description: "Your account settings have been updated successfully." 
      });

      // Clear form
      setNewEmail("");
      setNewPassword("");
      setNewUsername("");

      // Reload profile
      loadSellerProfile();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ 
        title: "Update Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUpdatingAccount(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">{seller?.name || seller?.email?.split('@')[0] || "Seller"}</CardTitle>
          <CardDescription className="text-lg font-medium text-muted-foreground">Seller</CardDescription>
          <p className="text-sm text-muted-foreground mt-2">View or edit your business and KYC information</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 📋 Current Information Overview */}
          <div className="border rounded-lg p-4 bg-gray-50/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📋 Current Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                  <p className="text-sm font-medium">{seller?.business_name || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
                  <p className="text-sm font-medium">{seller?.business_type || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{seller?.email || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{seller?.phone || "Not set"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <p className="text-sm font-medium">{seller?.name || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-sm font-medium">{seller?.address_line1 || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">GSTIN</Label>
                  <p className="text-sm font-medium">{seller?.gstin || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">FSSAI License</Label>
                  <p className="text-sm font-medium">{seller?.fssai_license_number || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">FSSAI Expiry</Label>
                  <p className="text-sm font-medium">{seller?.fssai_license_expiry_date ? new Date(seller.fssai_license_expiry_date).toLocaleDateString() : "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Seller ID</Label>
                  <p className="text-sm font-medium font-mono">{seller?.id || "Not set"}</p>
                </div>
              </div>
            </div>
            
            {/* KYC Status */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">KYC Documents Status</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${seller?.aadhaar ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-xs">Aadhaar</p>
                </div>
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${seller?.pan ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-xs">PAN</p>
                </div>
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${docs.some(d => d.doc_type === 'selfie') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-xs">Selfie</p>
                </div>
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${docs.some(d => d.doc_type === 'fssai_certificate') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-xs">FSSAI</p>
                </div>
              </div>
            </div>
          </div>

          {/* 🔓 Account Settings - Instantly Editable */}
          <div className="border rounded-lg p-4 bg-blue-50/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Save className="w-5 h-5" />
              Account Settings (Instant Updates)
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="new-email">Change Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {seller?.email || "Not set"}
                </p>
              </div>

              <div>
                <Label htmlFor="new-password">Change Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to keep current password
                </p>
              </div>

              <div>
                <Label htmlFor="new-username">Change Username</Label>
                <Input
                  id="new-username"
                  placeholder="Enter username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {seller?.name || "Not set"}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleUpdateAccount} disabled={updatingAccount}>
                {updatingAccount ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Account
              </Button>
            </div>
          </div>

          {/* ✅ Instantly Editable Business Fields */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏢 Business Information (Editable)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ["Business Name", "businessName"],
                ["Business Type", "businessType"],
                ["Address", "address"],
                ["Phone", "phone"],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {seller?.[key === "businessName" ? "business_name" : key === "address" ? "address_line1" : key] || "Not set"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Business Info
              </Button>
            </div>
          </div>

          {/* 🔒 Locked Fields (Require Admin Approval) */}
          <div className="border rounded-lg p-4 bg-red-50/30">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔒 Sensitive Information (Locked - Admin Approval Required)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These fields contain sensitive KYC information. Changes require admin verification.
            </p>

            {/* 🔒 GSTIN (locked + requestable) */}
            <div className="relative border rounded-md p-3 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">GSTIN (Tax ID)</Label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Locked</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Current: {seller?.gstin || "Not set"}</p>
              <Input
                placeholder="Enter new GSTIN if needed"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                disabled={!isAllowed("gstin") && !requestedFields.includes("gstin")}
                className={requestedFields.includes("gstin") ? "border-blue-400 bg-blue-50" : ""}
              />
              <Button
                size="icon"
                variant={requestedFields.includes("gstin") ? "secondary" : "outline"}
                className="absolute right-2 top-2"
                onClick={() => toggleRequestField("gstin")}
              >
                <PlusCircle className={`h-4 w-4 ${requestedFields.includes("gstin") ? "text-blue-600" : ""}`} />
              </Button>
            </div>

            {/* 🔒 Aadhaar */}
            <div className="relative border rounded-md p-3 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Aadhaar Number & Photo</Label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Locked</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Current: {seller?.aadhaar || "Not set"}</p>
              <Input
                placeholder="Enter new Aadhaar number"
                value={formData.aadhaar}
                onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                disabled={!isAllowed("aadhaar") && !requestedFields.includes("aadhaar")}
                className={`mb-2 ${requestedFields.includes("aadhaar") ? "border-blue-400 bg-blue-50" : ""}`}
              />
              <Input
                type="file"
                accept="image/*"
                disabled={!isAllowed("aadhaar") && !requestedFields.includes("aadhaar")}
                placeholder="Upload new Aadhaar photo"
              />
              <Button
                size="icon"
                variant={requestedFields.includes("aadhaar") ? "secondary" : "outline"}
                className="absolute right-2 top-2"
                onClick={() => toggleRequestField("aadhaar")}
              >
                <PlusCircle className={`h-4 w-4 ${requestedFields.includes("aadhaar") ? "text-blue-600" : ""}`} />
              </Button>
            </div>

            {/* 🔒 PAN */}
            <div className="relative border rounded-md p-3 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">PAN Number & Photo</Label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Locked</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Current: {seller?.pan || "Not set"}</p>
              <Input
                placeholder="Enter new PAN number"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                disabled={!isAllowed("pan") && !requestedFields.includes("pan")}
                className={`mb-2 ${requestedFields.includes("pan") ? "border-blue-400 bg-blue-50" : ""}`}
              />
              <Input
                type="file"
                accept="image/*"
                disabled={!isAllowed("pan") && !requestedFields.includes("pan")}
                placeholder="Upload new PAN photo"
              />
              <Button
                size="icon"
                variant={requestedFields.includes("pan") ? "secondary" : "outline"}
                className="absolute right-2 top-2"
                onClick={() => toggleRequestField("pan")}
              >
                <PlusCircle className={`h-4 w-4 ${requestedFields.includes("pan") ? "text-blue-600" : ""}`} />
              </Button>
            </div>

            {/* 🔒 Selfie */}
            <div className="relative border rounded-md p-3 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Selfie Photo</Label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Locked</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Status: {docs.some(d => d.doc_type === 'selfie') ? "Uploaded" : "Not uploaded"}
              </p>
              <Input
                type="file"
                accept="image/*"
                disabled={!isAllowed("selfie") && !requestedFields.includes("selfie")}
                placeholder="Upload new selfie"
              />
              <Button
                size="icon"
                variant={requestedFields.includes("selfie") ? "secondary" : "outline"}
                className="absolute right-2 top-2"
                onClick={() => toggleRequestField("selfie")}
              >
                <PlusCircle className={`h-4 w-4 ${requestedFields.includes("selfie") ? "text-blue-600" : ""}`} />
              </Button>
            </div>

            {/* 🔒 FSSAI License */}
            <div className="relative border rounded-md p-3 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">FSSAI License</Label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Locked</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Current License: {seller?.fssai_license_number || "Not set"}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Expiry: {seller?.fssai_license_expiry_date ? new Date(seller.fssai_license_expiry_date).toLocaleDateString() : "Not set"}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Certificate: {docs.some(d => d.doc_type === 'fssai_certificate') ? "Uploaded" : "Not uploaded"}
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm">License Number</Label>
                  <Input
                    placeholder="Enter 14-digit FSSAI license number"
                    maxLength={14}
                    disabled={!isAllowed("fssai") && !requestedFields.includes("fssai")}
                    className={requestedFields.includes("fssai") ? "border-blue-400 bg-blue-50" : ""}
                  />
                </div>
                <div>
                  <Label className="text-sm">Expiry Date</Label>
                  <Input
                    type="date"
                    disabled={!isAllowed("fssai") && !requestedFields.includes("fssai")}
                    className={requestedFields.includes("fssai") ? "border-blue-400 bg-blue-50" : ""}
                  />
                </div>
                <div>
                  <Label className="text-sm">Certificate Photo</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={!isAllowed("fssai") && !requestedFields.includes("fssai")}
                    placeholder="Upload FSSAI certificate"
                  />
                </div>
              </div>
              <Button
                size="icon"
                variant={requestedFields.includes("fssai") ? "secondary" : "outline"}
                className="absolute right-2 top-2"
                onClick={() => toggleRequestField("fssai")}
              >
                <PlusCircle className={`h-4 w-4 ${requestedFields.includes("fssai") ? "text-blue-600" : ""}`} />
              </Button>
            </div>

            {/* 🔒 Bank Details (grouped) */}
            <div className="relative border rounded-md p-3 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Bank Details</Label>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Locked</span>
              </div>
              <div className="mb-3 text-sm text-muted-foreground">
                <p>Current Bank: {seller?.bank_name || "Not set"}</p>
                <p>Account: {seller?.account_number ? `****${seller.account_number.slice(-4)}` : "Not set"}</p>
                <p>IFSC: {seller?.ifsc_code || "Not set"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Bank Name", "bankName"],
                  ["Account Number", "accountNumber"],
                  ["IFSC Code", "ifsc"],
                  ["Account Holder Name", "accountHolderName"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <Label className="text-sm">{label}</Label>
                    <Input
                      placeholder={`Enter new ${label.toLowerCase()}`}
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      disabled={!isAllowed("bank_details") && !requestedFields.includes("bank_details")}
                      className={requestedFields.includes("bank_details") ? "border-blue-400 bg-blue-50" : ""}
                    />
                  </div>
                ))}
              </div>
              <Button
                size="icon"
                variant={requestedFields.includes("bank_details") ? "secondary" : "outline"}
                className="absolute right-2 top-2"
                onClick={() => toggleRequestField("bank_details")}
              >
                <PlusCircle
                  className={`h-4 w-4 ${requestedFields.includes("bank_details") ? "text-blue-600" : ""}`}
                />
              </Button>
            </div>
          </div>

          {requestedFields.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">📝 Change Request Summary</h4>
              <p className="text-sm text-blue-700 mb-3">
                You have selected {requestedFields.length} field(s) to request changes for: <strong>{requestedFields.join(", ")}</strong>
              </p>
              <Label className="text-sm font-medium">Reason for changes (required):</Label>
              <Input
                placeholder="Please explain why you need to change these fields..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Account settings update instantly. Business info saves immediately. Locked fields require admin approval.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="outline">
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Business Changes
              </Button>
              <Button
                variant="secondary"
                onClick={handleRequestChange}
                disabled={requestedFields.length === 0 || submittingRequest}
              >
                {submittingRequest ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Request Admin Approval ({requestedFields.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
