import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Edit, Camera, Save } from "lucide-react";

export default function SellerProfile() {
  const { toast } = useToast();
  const [seller, setSeller] = useState<any | null>(null);
  const [allowedFields, setAllowedFields] = useState<string[]>([]);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRequestFields, setEditRequestFields] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [formData, setFormData] = useState<any>({});
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    aadhaar: null,
    pan: null,
    selfie: null,
  });

  const restrictedFields = ["aadhaar", "pan", "gstin", "bank_details", "email", "selfie"];

  const isAllowed = (logicalField: string) => {
    if (!allowedFields.length) return !restrictedFields.includes(logicalField);
    return allowedFields.includes(logicalField) || !restrictedFields.includes(logicalField);
  };

  useEffect(() => {
    loadSellerProfile();
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
        const det = feedback.details as any;
        setAllowedFields(det.allowed_fields || []);
        setAdminMessage(det.admin_message || null);
      }

      const { data: documents } = await supabase
        .from("seller_documents")
        .select("doc_type, storage_path")
        .eq("seller_id", s.id);
      setDocs(documents || []);

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
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
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

  async function handleSave() {
    setSaving(true);
    try {
      const editableNow: any = {};
      const restrictedChanges: any = {};

      for (const key of Object.keys(formData)) {
        const newVal = formData[key];
        const oldVal =
          key === "businessName"
            ? seller.business_name
            : key === "gstin"
            ? seller.gstin
            : seller[key] || "";

        if (newVal === oldVal) continue;
        let logical = key.toLowerCase();
        if (!isAllowed(logical)) restrictedChanges[logical] = { old_value: oldVal, new_value: newVal };
        else editableNow[key] = newVal;
      }

      const docsToUpload: { type: string; file: File }[] = [];
      for (const t of ["aadhaar", "pan", "selfie"]) {
        if (selectedFiles[t]) {
          if (isAllowed(t)) docsToUpload.push({ type: t, file: selectedFiles[t]! });
          else restrictedChanges[t] = { old_value: "file", new_value: selectedFiles[t]!.name };
        }
      }

      if (Object.keys(editableNow).length) {
        const upd = await supabase
          .from("sellers")
          .update({
            business_name: editableNow.businessName,
            business_type: editableNow.businessType,
            gstin: editableNow.gstin,
            aadhaar: editableNow.aadhaar,
            pan: editableNow.pan,
            address_line1: editableNow.address,
            bank_name: editableNow.bankName,
            account_number: editableNow.accountNumber,
            ifsc_code: editableNow.ifsc,
            account_holder_name: editableNow.accountHolderName,
            email: editableNow.email,
          })
          .eq("id", seller.id);
        if (upd.error) throw upd.error;
      }

      if (docsToUpload.length) {
        for (const d of docsToUpload) {
          const url = await uploadFile(d.file, d.type);
          await supabase.from("seller_documents").insert({
            seller_id: seller.id,
            doc_type: d.type,
            file_name: d.file.name,
            storage_path: url,
            uploaded_at: new Date().toISOString(),
          });
        }
      }

      if (Object.keys(restrictedChanges).length) {
        await supabase.from("seller_verifications").insert({
          seller_id: seller.id,
          step: "edit_request",
          status: "pending",
          details: { requested_changes: restrictedChanges, reason },
          verified_at: new Date().toISOString(),
        });

        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("notifications").insert({
          sender_id: user?.id,
          receiver_id: null,
          related_seller_id: seller.id,
          type: "edit_request",
          title: "Seller requested change",
          message: `Seller requested updates: ${Object.keys(restrictedChanges).join(", ")}`,
        });

        toast({
          title: "Change Request Sent",
          description: "Admin will review your change request.",
        });
      } else {
        toast({ title: "Saved", description: "Profile updated successfully" });
      }

      setReason("");
      setSelectedFiles({ aadhaar: null, pan: null, selfie: null });
      loadSellerProfile();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Seller Profile</CardTitle>
          <CardDescription>View or edit your business and KYC information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {adminMessage && (
            <div className="p-3 bg-yellow-50 border rounded">
              <strong>Admin Message:</strong>
              <p className="text-sm mt-1">{adminMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Allowed fields: {allowedFields.length ? allowedFields.join(", ") : "None"}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries({
              "Business Name": "businessName",
              "Business Type": "businessType",
              GSTIN: "gstin",
              Aadhaar: "aadhaar",
              PAN: "pan",
              Address: "address",
              "Bank Name": "bankName",
              "Account Number": "accountNumber",
              IFSC: "ifsc",
              "Account Holder Name": "accountHolderName",
              Email: "email",
              Phone: "phone",
            }).map(([label, key]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={formData[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  disabled={!isAllowed(key.toLowerCase())}
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Label>Reason for Restricted Field Edit (if any)</Label>
            <Input
              placeholder="Explain why you need to edit restricted fields"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-md font-medium mt-4">Upload Photos</h3>
            <div className="grid grid-cols-3 gap-4">
              {["aadhaar", "pan", "selfie"].map((type) => (
                <div key={type}>
                  <Label>
                    {type.toUpperCase()} {isAllowed(type) ? "" : "(Locked)"}
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={!isAllowed(type)}
                    onChange={(e) => setSelectedFiles({ ...selectedFiles, [type]: e.target.files?.[0] || null })}
                  />
                  {docs.find((d) => d.doc_type === type) && (
                    <img
                      src={docs.find((d) => d.doc_type === type)?.storage_path}
                      alt={type}
                      className="rounded border shadow-sm mt-2 w-full h-40 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save / Request Change
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
