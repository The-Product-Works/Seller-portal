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
import { Camera, CheckCircle, Loader2, Lock } from "lucide-react";
import { z } from "zod";

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
  targetFields: string[];
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
        <p className="text-sm text-muted-foreground mt-1">
          You're requesting to change: {targetFields.join(", ")}
        </p>
        <label className="block mt-4">
          <span className="text-sm">Reason for change</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-2 p-2 border rounded"
            rows={4}
          />
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 text-sm rounded border"
            onClick={() => {
              setReason("");
              onClose();
            }}
          >
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

  const [isNewSeller, setIsNewSeller] = useState(false);
  const [isSubmittedOnce, setIsSubmittedOnce] = useState(false);

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

  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonTargetFields, setReasonTargetFields] = useState<string[]>([]);
  const [pendingRequestPayload, setPendingRequestPayload] = useState<any | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsPollRef = useRef<number | null>(null);

  const restrictedFields = ["aadhaar", "pan", "selfie", "bank_details", "gstin", "email"];

  const isAllowed = (logicalField: string) => {
    if (isNewSeller) return true;
    if (isSubmittedOnce && kycStatus !== "rejected" && !allowedFields?.length) return false;
    if (allowedFields?.includes(logicalField)) return true;
    if (!allowedFields) return !restrictedFields.includes(logicalField);
    return allowedFields.includes(logicalField) || !restrictedFields.includes(logicalField);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: s, error } = await supabase.from("sellers").select("*").eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        setSeller(s ?? null);
        setKycStatus(s?.verification_status ?? null);

        if (!s) {
          setIsNewSeller(true);
          setIsSubmittedOnce(false);
        } else {
          setIsNewSeller(false);
          const { data: verif } = await supabase
            .from("seller_verifications")
            .select("id")
            .eq("seller_id", s.id)
            .eq("step", "kyc_submission")
            .maybeSingle();
          setIsSubmittedOnce(!!verif);
        }

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
          } else {
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

          await loadNotifications(s.id);
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
  }, []);

  const loadNotifications = async (sellerId: string) => {
    try {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("related_seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(notifs ?? []);
    } catch (e) {
      console.warn("load notifications error", e);
    }
  };

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

  // ... (retain your handleSubmit + modal logic exactly as before)

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {isSubmittedOnce && kycStatus !== "rejected" && !allowedFields?.length && (
          <div className="p-4 mb-4 rounded bg-yellow-50 border flex items-center gap-2">
            <Lock className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Your KYC is under review. You cannot edit details until admin responds.
            </p>
          </div>
        )}

        {/* Keep your existing Card, Tabs, and form below unchanged */}
      </div>
    </div>
  );
}
