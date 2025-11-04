// src/pages/KYC.tsx
import React, { useEffect, useState, useRef } from "react";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle, Loader2 } from "lucide-react";
import { z } from "zod";

/**
 * KYC.tsx
 * Seller side KYC with:
 * - Tabs (KYC / Notifications)
 * - Editable fields per admin allowed_fields
 * - Request-change flow via modal -> creates seller_verifications(step='edit_request') and inserts notification
 * - Validation via zod
 */

const kycSchema = z.object({
  aadhaarNumber: z.string().regex(/^[2-9]{1}[0-9]{11}$/, "Invalid Aadhaar number").optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number").optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN").optional(),
  bankAccountNumber: z.string().min(9, "Invalid account number").max(18, "Invalid account number").optional(),
  bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code").optional(),

});

type ReasonModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  targetFields: string[]; // what fields seller requests to change
};

function ReasonModal({ open, onClose, onConfirm, targetFields }: ReasonModalProps) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Request Edit</h3>
        <p className="text-sm text-muted-foreground mt-1">You're requesting to change: {targetFields.join(", ")}</p>
        <label className="block mt-4">
          <span className="text-sm">Reason for change</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-2 p-2 border rounded" rows={4} />
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-4 py-2 text-sm rounded border" onClick={() => { setReason(""); onClose(); }}>
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-primary text-white"
            onClick={() => {
              if (!reason.trim()) return alert("Please enter a reason.");
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KYC() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [seller, setSeller] = useState<any | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  const [allowedFields, setAllowedFields] = useState<string[] | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    aadhaarNumber: "",
    panNumber: "",
    gstin: "",
    businessName: "",
    businessType: "",
    phone: "",
    address: "",
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  // reason modal state (for requesting restricted field edits)
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonTargetFields, setReasonTargetFields] = useState<string[]>([]);
  const [pendingRequestPayload, setPendingRequestPayload] = useState<any | null>(null); // holds changes to include in request once modal confirmed

  // notifications (for the seller)
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsPollRef = useRef<number | null>(null);

  // restricted list
  const restrictedFields = ["aadhaar", "pan", "selfie", "bank_details", "gstin", "email"];

  // decide whether a logical field is allowed to be edited now
  const isAllowed = (logicalField: string) => {
    // map some logical names
    if (logicalField === "name" || logicalField === "address") return true;
    if (logicalField === "phone") return false;
    if (!allowedFields) return !restrictedFields.includes(logicalField);
    return allowedFields.includes(logicalField) || !restrictedFields.includes(logicalField);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // load seller row if exists
        const { data: s, error } = await supabase.from("sellers").select("*").eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        setSeller(s ?? null);
        setKycStatus(s?.verification_status ?? null);

        // if seller exists, fetch admin feedback (latest edit_request_feedback)
        if (s?.id) {
          const fb = await supabase
            .from("seller_verifications")
            .select("details")
            .eq("seller_id", s.id)
            .eq("step", "edit_request_feedback")
            .order("verified_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!fb.error && fb.data?.details) {
          const details = fb.data.details as Record<string, any>;
          setAllowedFields(details?.allowed_fields ?? null);
          setAdminMessage(details?.admin_message ?? details?.admin_note ?? null);
          }
 else {
            setAllowedFields(null);
            setAdminMessage(null);
          }

          setFormData((prev) => ({
            ...prev,
            aadhaarNumber: s.aadhaar ?? "",
            panNumber: s.pan ?? "",
            gstin: s.gstin ?? "",
            businessName: s.business_name ?? "",
            businessType: s.business_type ?? "",
            phone: s.phone ?? "",
            address: s.address_line1 ?? "",
            bankName: s.bank_name ?? "",
            bankAccountNumber: s.account_number ?? "",
            bankIfscCode: s.ifsc_code ?? "",
            bankAccountHolderName: s.account_holder_name ?? "",
            email: s.email ?? "",
          }));

          // load recent notifications for this seller
          await loadNotifications(s.id);
          // start polling notifications
          if (!notificationsPollRef.current) {
            notificationsPollRef.current = window.setInterval(async () => {
              await loadNotifications(s.id);
            }, 8000) as any;
          }
        }
      } catch (err: any) {
        console.error("KYC load error", err);
        toast({ title: "Error", description: err?.message || "Failed to load KYC", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (notificationsPollRef.current) {
        window.clearInterval(notificationsPollRef.current);
        notificationsPollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotifications = async (sellerId: string) => {
    try {
      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("related_seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error) setNotifications(notifs ?? []);
    } catch (e) {
      console.warn("load notifications error", e);
    }
  };

  // upload file helper
  const uploadFile = async (file: File, folder: string) => {
    if (!seller?.id) throw new Error("No seller id");
    const ext = (file.name.split(".").pop() || "dat").toLowerCase();
    const path = `${seller.id}/${folder}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("seller_details").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    const signed = await supabase.storage.from("seller_details").createSignedUrl(up.data.path, 60 * 60 * 24 * 365 * 10);
    if (signed.error) throw signed.error;
    return signed.data.signedUrl;
  };

  const createEditRequest = async (changes: any, reason: string) => {
    if (!seller) throw new Error("No seller");
    const payload = {
      seller_id: seller.id,
      step: "edit_request",
      status: "pending",
      details: { requested_changes: changes, reason },
      verified_at: new Date().toISOString(),
    };
    const ins = await supabase.from("seller_verifications").insert(payload);
    if (ins.error) throw ins.error;
    // notifications: send to admin (receiver_id null; admin side will manage)
    await supabase.from("notifications").insert({
      sender_id: seller.user_id,
      receiver_id: null,
      related_seller_id: seller.id,
      type: "edit_request",
      title: "Seller requested edits",
      message: `Seller requested fields: ${Object.keys(changes).join(", ")} — reason: ${reason}`,
    });
    // refresh local pending state by reloading notifications
    await loadNotifications(seller.id);
    return ins.data;
  };

  // handle main submit (initial KYC or allowed edits)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const validation = kycSchema.safeParse({
        aadhaarNumber: formData.aadhaarNumber || undefined,
        panNumber: formData.panNumber || undefined,
        gstin: formData.gstin || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIfscCode: formData.bankIfscCode || undefined,
      });

      if (!validation.success) {
        const errs: Record<string, string> = {};
        validation.error.errors.forEach((er) => (errs[er.path[0] as string] = er.message));
        setErrors(errs);
        toast({ title: "Validation error", description: "Fix form errors", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // ensure GSTIN contains PAN if both provided
      if (formData.gstin && formData.panNumber && !formData.gstin.includes(formData.panNumber)) {
        setErrors({ gstin: "GSTIN must contain PAN" });
        toast({ title: "Validation error", description: "GSTIN must contain PAN", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // if seller doesn't exist, create + require photos
      if (!seller) {
        if (!selfiePhoto || !aadhaarPhoto || !panPhoto) {
          toast({ title: "Missing photos", description: "Please upload Selfie, Aadhaar and PAN photos", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        // create seller
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const ins = await supabase
          .from("sellers")
          .insert({
            user_id: user.id,
            name: formData.bankAccountHolderName || formData.businessName || user.email,
            email: user.email,
            phone: formData.phone || null,
            aadhaar: formData.aadhaarNumber || null,
            pan: formData.panNumber || null,
            gstin: formData.gstin || null,
            business_name: formData.businessName || null,
            business_type: formData.businessType || null,
            address_line1: formData.address || null,
            bank_name: formData.bankName || null,
            account_number: formData.bankAccountNumber || null,
            ifsc_code: formData.bankIfscCode || null,
            account_holder_name: formData.bankAccountHolderName || null,
            account_type: formData.accountType || null,
            verification_status: "pending",
            onboarding_status: "in_review",
          })
          .select()
          .single();
        if (ins.error) throw ins.error;
        setSeller(ins.data);
        setKycStatus(ins.data.verification_status);

        // upload files and insert into seller_documents
        const selfieUrl = await uploadFile(selfiePhoto!, "selfie");
        const aadhaarUrl = await uploadFile(aadhaarPhoto!, "aadhaar");
        const panUrl = await uploadFile(panPhoto!, "pan");

        const docs = [
          { type: "selfie", file: selfiePhoto!, url: selfieUrl },
          { type: "aadhaar", file: aadhaarPhoto!, url: aadhaarUrl },
          { type: "pan", file: panPhoto!, url: panUrl },
        ];
        for (const d of docs) {
          const r = await supabase.from("seller_documents").insert({
            seller_id: ins.data.id,
            doc_type: d.type,
            file_name: d.file.name,
            file_size: d.file.size,
            mime_type: d.file.type,
            storage_path: d.url,
            uploaded_at: new Date().toISOString(),
          });
          if (r.error) throw r.error;
        }

        // insert bank account if present
        if (formData.bankAccountNumber) {
          const bankRes = await supabase.from("seller_bank_accounts").insert({
            seller_id: ins.data.id,
            account_number: formData.bankAccountNumber,
            account_holder_name: formData.bankAccountHolderName,
            ifsc_code: formData.bankIfscCode,
            bank_name: formData.bankName || null,
            account_type: formData.accountType,
            is_primary: true,
          });
          if (bankRes.error) throw bankRes.error;
        }

        // create seller_verifications row marking kyc_submission
        const ver = await supabase.from("seller_verifications").insert({
          seller_id: ins.data.id,
          step: "kyc_submission",
          status: "submitted",
          provider: "seller",
          confidence: 1.0,
          verified_at: new Date().toISOString(),
        });
        if (ver.error) throw ver.error;

        // insert notification to admin (receiver_id=null)
        await supabase.from("notifications").insert({
          sender_id: ins.data.user_id,
          receiver_id: null,
          related_seller_id: ins.data.id,
          type: "kyc_submission",
          title: "New KYC submitted",
          message: `Seller ${ins.data.email} submitted KYC for review.`,
        });

        toast({ title: "KYC submitted", description: "Documents are under review" });
        setSubmitting(false);
        return;
      }

      // For existing seller: handle editableNow vs restricted changes
      const editableNow: any = {};
      const restrictedChanges: any = {};

      const mapping: [string, string][] = [
        ["aadhaar", "aadhaarNumber"],
        ["pan", "panNumber"],
        ["gstin", "gstin"],
        ["business_name", "businessName"],
        ["business_type", "businessType"],
        ["phone", "phone"],
        ["address_line1", "address"],
        ["bank_name", "bankName"],
        ["account_number", "bankAccountNumber"],
        ["ifsc_code", "bankIfscCode"],
        ["account_holder_name", "bankAccountHolderName"],
        ["email", "email"],
      ];

      for (const [col, key] of mapping) {
        const newVal = (formData as any)[key];
        const oldVal = (seller as any)[col];
        if (newVal === oldVal) continue;
        let logical = col === "address_line1" ? "address" : col === "business_name" ? "name" : col;
        if (!isAllowed(logical)) {
          restrictedChanges[logical] = { old_value: oldVal ?? null, new_value: newVal ?? null };
        } else {
          editableNow[col] = newVal ?? null;
        }
      }

      // files handling: if user uploaded new files and not allowed, mark in restrictedChanges
      const docsToUpload: { type: string; file: File }[] = [];
      if (selfiePhoto) docsToUpload.push({ type: "selfie", file: selfiePhoto });
      if (aadhaarPhoto) docsToUpload.push({ type: "aadhaar", file: aadhaarPhoto });
      if (panPhoto) docsToUpload.push({ type: "pan", file: panPhoto });
      for (const d of docsToUpload) {
        if (!isAllowed(d.type)) restrictedChanges[d.type] = { old_value: "file", new_value: d.file.name };
      }

      // apply editableNow immediately to seller
      if (Object.keys(editableNow).length) {
        const upd = await supabase.from("sellers").update(editableNow).eq("id", seller.id);
        if (upd.error) throw upd.error;
      }

      // if restrictedChanges exist, open reason modal for the seller to confirm reason
      if (Object.keys(restrictedChanges).length) {
        // store the pending payload and show modal
        setPendingRequestPayload({ changes: restrictedChanges, docsToUpload });
        setReasonTargetFields(Object.keys(restrictedChanges));
        setReasonModalOpen(true);
        setSubmitting(false);
        return;
      }

      // otherwise, upload allowed docs (if any)
      if (docsToUpload.length) {
        for (const d of docsToUpload) {
          if (isAllowed(d.type)) {
            const url = await uploadFile(d.file, d.type);
            const r = await supabase.from("seller_documents").insert({
              seller_id: seller.id,
              doc_type: d.type,
              file_name: d.file.name,
              file_size: d.file.size,
              mime_type: d.file.type,
              storage_path: url,
              uploaded_at: new Date().toISOString(),
            });
            if (r.error) throw r.error;
          }
        }
      }

      // If we reached here and no restrictedChanges: optionally insert a re-submission verification entry
      await supabase.from("seller_verifications").insert({
        seller_id: seller.id,
        step: "kyc_submission",
        status: "submitted",
        provider: "seller",
        confidence: 1.0,
        verified_at: new Date().toISOString(),
      });

      // notify admin about this re-submission
      await supabase.from("notifications").insert({
        sender_id: seller.user_id,
        receiver_id: null,
        related_seller_id: seller.id,
        type: "kyc_submission",
        title: "KYC resubmitted",
        message: `Seller ${seller.email} resubmitted KYC / profile changes.`,
      });

      toast({ title: "Submitted", description: "Your changes were submitted for review" });

      // after applying allowed changes, clear allowedFields (one-time change behaviour)
      setAllowedFields(null);

      // reload seller
      const refreshed = await supabase.from("sellers").select("*").eq("id", seller.id).single();
      if (!refreshed.error) setSeller(refreshed.data);

    } catch (err: any) {
      console.error("KYC submit error:", err);
      toast({ title: "Error", description: err?.message || "Failed to submit KYC", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // when reason modal confirms, create edit_request and attach any docs
  const onReasonConfirm = async (reason: string) => {
    setReasonModalOpen(false);
    if (!pendingRequestPayload || !seller) return;
    try {
      // insert edit_request
      await createEditRequest(pendingRequestPayload.changes, reason);

      // upload docs if present but not allowed (we'll still store filenames in change details)
      if (pendingRequestPayload.docsToUpload?.length) {
        for (const d of pendingRequestPayload.docsToUpload) {
          // upload file to storage and insert record but do not alter seller until admin approves
          const url = await uploadFile(d.file, d.type);
          await supabase.from("seller_documents").insert({
            seller_id: seller.id,
            doc_type: d.type,
            file_name: d.file.name,
            file_size: d.file.size,
            mime_type: d.file.type,
            storage_path: url,
            uploaded_at: new Date().toISOString(),
            note: "Uploaded as part of edit_request (pending admin approval)",
          });
        }
      }

      // notify user locally
      toast({ title: "Request sent", description: "Admin will review your request" });
      setPendingRequestPayload(null);
      // refresh notifications
      await loadNotifications(seller.id);
    } catch (err: any) {
      console.error("Create edit request error", err);
      toast({ title: "Error", description: err?.message || "Failed to create request", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (kycStatus === "approved")
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">KYC Verified</CardTitle>
            <CardDescription>Your account is verified.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            <div className="mt-4 text-sm text-muted-foreground">If you need to change sensitive fields, use the "Request Change" buttons below.</div>
          </CardContent>
        </Card>
        <ReasonModal open={reasonModalOpen} onClose={() => setReasonModalOpen(false)} onConfirm={onReasonConfirm} targetFields={reasonTargetFields} />
      </div>
    );

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Complete KYC Verification</CardTitle>
            <CardDescription>Provide accurate information for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kyc">
              <TabsList>
                <TabsTrigger value="kyc">KYC</TabsTrigger>
                <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="kyc" className="mt-4">
                {adminMessage && (
                  <div className="mb-4 p-3 bg-yellow-50 border rounded">
                    <strong>Admin message:</strong>
                    <div className="mt-2">{adminMessage}</div>
                    <div className="mt-2 text-sm text-muted-foreground">Allowed to change: {allowedFields?.length ? allowedFields.join(", ") : "None"}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4 p-4 bg-accent/20 rounded-lg">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Camera className="w-5 h-5" /> Upload Documents
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Selfie Photo {isAllowed("selfie") ? "" : "(Locked)"}</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setSelfiePhoto(e.target.files?.[0] || null)} disabled={!isAllowed("selfie")} />
                      </div>
                      <div>
                        <Label>Aadhaar Photo {isAllowed("aadhaar") ? "" : "(Locked)"}</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setAadhaarPhoto(e.target.files?.[0] || null)} disabled={!isAllowed("aadhaar")} />
                      </div>
                      <div>
                        <Label>PAN Photo {isAllowed("pan") ? "" : "(Locked)"}</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setPanPhoto(e.target.files?.[0] || null)} disabled={!isAllowed("pan")} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Aadhaar Number</Label>
                      <Input value={formData.aadhaarNumber} onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })} disabled={!isAllowed("aadhaar")} />
                      {errors.aadhaarNumber && <p className="text-sm text-destructive">{errors.aadhaarNumber}</p>}
                    </div>
                    <div>
                      <Label>PAN Number</Label>
                      <Input value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })} disabled={!isAllowed("pan")} />
                      {errors.panNumber && <p className="text-sm text-destructive">{errors.panNumber}</p>}
                    </div>

                    <div>
                      <Label>GSTIN</Label>
                      <Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} disabled={!isAllowed("gstin")} />
                      {errors.gstin && <p className="text-sm text-destructive">{errors.gstin}</p>}
                    </div>

                    <div>
                      <Label>Business Name</Label>
                      <Input value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} />
                    </div>

                    <div>
                      <Label>Business Type</Label>
                      <Input value={formData.businessType} onChange={(e) => setFormData({ ...formData, businessType: e.target.value })} />
                    </div>

                    <div>
                      <Label>Phone (locked)</Label>
                      <Input value={formData.phone} disabled />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>

                    <div>
                      <Label>Bank Name</Label>
                      <Input value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} disabled={!isAllowed("bank_details")} />
                    </div>

                    <div>
                      <Label>Account Number</Label>
                      <Input value={formData.bankAccountNumber} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} disabled={!isAllowed("bank_details")} />
                      {errors.bankAccountNumber && <p className="text-sm text-destructive">{errors.bankAccountNumber}</p>}
                    </div>

                    <div>
                      <Label>IFSC</Label>
                      <Input value={formData.bankIfscCode} onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })} disabled={!isAllowed("bank_details")} />
                      {errors.bankIfscCode && <p className="text-sm text-destructive">{errors.bankIfscCode}</p>}
                    </div>

                    <div>
                      <Label>Account Holder Name</Label>
                      <Input value={formData.bankAccountHolderName} onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })} disabled={!isAllowed("bank_details")} />
                    </div>

                    <div>
                      <Label>Email</Label>
                      <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={!isAllowed("email")} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                      Submit / Request Change
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="notifications" className="mt-4">
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className="border rounded p-3 flex justify-between items-start">
                        <div>
                          <div className="text-sm"><strong>{n.title || n.type}</strong></div>
                          <div className="text-xs text-muted-foreground">{n.message}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <ReasonModal open={reasonModalOpen} onClose={() => setReasonModalOpen(false)} onConfirm={onReasonConfirm} targetFields={reasonTargetFields} />
    </div>
  );
}
