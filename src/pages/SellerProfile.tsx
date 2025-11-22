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
import { Loader2, Save, PlusCircle, Send, Mail, Server, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  sendLowStockAlert, 
  sendOutOfStockAlert,
  sendNewOrderNotification,
  sendOrderCancelledNotification,
  sendReturnRequestNotification,
  sendRefundCompletedNotification,
  sendAccountApprovedNotification,
  sendNewReviewNotification,
  sendPayoutNotification
} from "@/lib/notifications/proxy-notification-helpers";
import { sendEmailViaProxy } from "@/lib/notifications/proxy-email-service";
import NotificationControlPanel from "@/components/NotificationControlPanel";

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

  // Email Debug State
  const [emailDebugLoading, setEmailDebugLoading] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'running' | 'stopped'>('checking');
  const [emailResults, setEmailResults] = useState<Record<string, { success: boolean; message: string; messageId?: string }>>({});
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // 🔒 Restricted fields needing admin approval (GSTIN now included)
  const restrictedFields = [
    "aadhaar",
    "pan",
    "selfie",
    "bank_details",
    "email",
    "gstin",
  ];

  // ✅ Instantly editable fields
  const alwaysAllowed = ["businessname", "businesstype", "address", "phone"];

  const isAllowed = (logicalField: string) => {
    if (alwaysAllowed.includes(logicalField)) return true;
    if (!allowedFields.length) return !restrictedFields.includes(logicalField);
    return allowedFields.includes(logicalField) || !restrictedFields.includes(logicalField);
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
            : seller[key] || "";

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
            old_value: seller[field] || "",
            new_value: formData[field] || "",
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

  const toggleRequestField = (field: string) => {
    setRequestedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Email Debug Functions
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  const checkProxyHealth = async () => {
    setProxyStatus('checking');
    addDebugLog('Checking proxy server health...');
    
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        setProxyStatus('running');
        addDebugLog('✅ Proxy server is healthy');
        toast({ title: "Proxy Status", description: "Email proxy server is running" });
      } else {
        setProxyStatus('stopped');
        addDebugLog('❌ Proxy server responded but not healthy');
      }
    } catch (error) {
      setProxyStatus('stopped');
      addDebugLog('❌ Cannot connect to proxy server');
      toast({ title: "Proxy Status", description: "Email proxy server is not running", variant: "destructive" });
    }
  };

  const testDirectEmail = async () => {
    if (!seller?.email) {
      toast({ title: "Error", description: "No seller email found", variant: "destructive" });
      return;
    }

    setEmailDebugLoading(true);
    addDebugLog(`Testing direct email to: ${seller.email}`);

    try {
      const result = await sendEmailViaProxy({
        recipientEmail: seller.email,
        subject: '🧪 Direct Email Test from Profile',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; text-align: center; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 24px;">✅ Direct Email Test</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Sent from Seller Profile</p>
            </div>
            <div style="padding: 20px; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; margin-top: 20px;">
              <h2 style="color: #15803d; margin-top: 0;">Test Details</h2>
              <p><strong>📧 To:</strong> ${seller.email}</p>
              <p><strong>🕐 Sent at:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>🚀 From:</strong> Seller Profile Debug Tool</p>
            </div>
          </div>
        `,
        alertType: 'test'
      });

      setEmailResults(prev => ({
        ...prev,
        direct: {
          success: result.success,
          message: result.success ? `Email sent successfully!` : result.error || 'Failed to send',
          messageId: result.messageId
        }
      }));

      addDebugLog(result.success ? '✅ Direct email sent successfully' : `❌ Direct email failed: ${result.error}`);
      
      if (result.success) {
        toast({ title: "Email Sent", description: `Direct email sent to ${seller.email}` });
      }
    } catch (error: any) {
      addDebugLog(`❌ Direct email error: ${error.message}`);
      setEmailResults(prev => ({
        ...prev,
        direct: { success: false, message: error.message }
      }));
    } finally {
      setEmailDebugLoading(false);
    }
  };

  const testNotificationType = async (type: string, testFunction: () => Promise<any>) => {
    if (!seller?.id || !seller?.email) {
      toast({ title: "Error", description: "Seller information not available", variant: "destructive" });
      return;
    }

    setEmailDebugLoading(true);
    addDebugLog(`Testing ${type} notification...`);

    try {
      const result = await testFunction();
      
      setEmailResults(prev => ({
        ...prev,
        [type]: {
          success: result.success,
          message: result.success ? `${type} notification sent!` : result.error || 'Failed to send',
          messageId: result.messageId
        }
      }));

      addDebugLog(result.success ? `✅ ${type} notification sent` : `❌ ${type} notification failed: ${result.error}`);
      
      if (result.success) {
        toast({ title: "Notification Sent", description: `${type} email sent successfully` });
      }
    } catch (error: any) {
      addDebugLog(`❌ ${type} notification error: ${error.message}`);
      setEmailResults(prev => ({
        ...prev,
        [type]: { success: false, message: error.message }
      }));
    } finally {
      setEmailDebugLoading(false);
    }
  };

  // Auto-check proxy status on load
  useEffect(() => {
    if (seller?.email) {
      checkProxyHealth();
    }
  }, [seller?.email]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Seller Profile</CardTitle>
          <CardDescription>View or edit your business and KYC information</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ✅ Instantly Editable Fields */}
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
              </div>
            ))}
          </div>

          {/* 🔒 GSTIN (locked + requestable) */}
          <div className="relative">
            <Label>GSTIN</Label>
            <Input
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              disabled={!isAllowed("gstin") && !requestedFields.includes("gstin")}
              className={requestedFields.includes("gstin") ? "border-blue-400 bg-blue-50" : ""}
            />
            <Button
              size="icon"
              variant={requestedFields.includes("gstin") ? "secondary" : "outline"}
              className="absolute right-2 top-7"
              onClick={() => toggleRequestField("gstin")}
            >
              <PlusCircle className={`h-4 w-4 ${requestedFields.includes("gstin") ? "text-blue-600" : ""}`} />
            </Button>
          </div>

          {/* 🔒 Aadhaar */}
          <div className="relative">
            <Label>Aadhaar Number & Photo</Label>
            <Input
              value={formData.aadhaar}
              onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
              disabled={!isAllowed("aadhaar") && !requestedFields.includes("aadhaar")}
              className={requestedFields.includes("aadhaar") ? "border-blue-400 bg-blue-50" : ""}
            />
            <Input
              type="file"
              accept="image/*"
              disabled={!isAllowed("aadhaar") && !requestedFields.includes("aadhaar")}
              className="mt-2"
              onChange={(e) => setSelectedFiles({ ...selectedFiles, aadhaar: e.target.files?.[0] || null })}
            />
            <Button
              size="icon"
              variant={requestedFields.includes("aadhaar") ? "secondary" : "outline"}
              className="absolute right-2 top-7"
              onClick={() => toggleRequestField("aadhaar")}
            >
              <PlusCircle className={`h-4 w-4 ${requestedFields.includes("aadhaar") ? "text-blue-600" : ""}`} />
            </Button>
          </div>

          {/* 🔒 PAN */}
          <div className="relative">
            <Label>PAN Number & Photo</Label>
            <Input
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
              disabled={!isAllowed("pan") && !requestedFields.includes("pan")}
              className={requestedFields.includes("pan") ? "border-blue-400 bg-blue-50" : ""}
            />
            <Input
              type="file"
              accept="image/*"
              disabled={!isAllowed("pan") && !requestedFields.includes("pan")}
              className="mt-2"
              onChange={(e) => setSelectedFiles({ ...selectedFiles, pan: e.target.files?.[0] || null })}
            />
            <Button
              size="icon"
              variant={requestedFields.includes("pan") ? "secondary" : "outline"}
              className="absolute right-2 top-7"
              onClick={() => toggleRequestField("pan")}
            >
              <PlusCircle className={`h-4 w-4 ${requestedFields.includes("pan") ? "text-blue-600" : ""}`} />
            </Button>
          </div>

          {/* 🔒 Selfie */}
          <div className="relative">
            <Label>Selfie Photo</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={!isAllowed("selfie") && !requestedFields.includes("selfie")}
              onChange={(e) => setSelectedFiles({ ...selectedFiles, selfie: e.target.files?.[0] || null })}
            />
            <Button
              size="icon"
              variant={requestedFields.includes("selfie") ? "secondary" : "outline"}
              className="absolute right-2 top-7"
              onClick={() => toggleRequestField("selfie")}
            >
              <PlusCircle className={`h-4 w-4 ${requestedFields.includes("selfie") ? "text-blue-600" : ""}`} />
            </Button>
          </div>

          {/* 🔒 Bank Details (grouped) */}
          <div className="relative border rounded-md p-3 mt-4">
            <Label className="font-medium">Bank Details</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                ["Bank Name", "bankName"],
                ["Account Number", "accountNumber"],
                ["IFSC Code", "ifsc"],
                ["Account Holder Name", "accountHolderName"],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
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

          {/* 🔒 Email */}
          <div className="relative">
            <Label>Email</Label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isAllowed("email") && !requestedFields.includes("email")}
              className={requestedFields.includes("email") ? "border-blue-400 bg-blue-50" : ""}
            />
            <Button
              size="icon"
              variant={requestedFields.includes("email") ? "secondary" : "outline"}
              className="absolute right-2 top-7"
              onClick={() => toggleRequestField("email")}
            >
              <PlusCircle className={`h-4 w-4 ${requestedFields.includes("email") ? "text-blue-600" : ""}`} />
            </Button>
          </div>

          {requestedFields.length > 0 && (
            <div className="mt-4">
              <Label>Reason for Requested Edits</Label>
              <Input
                placeholder="Explain why you need to edit these fields"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
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
              Request Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Debug Section */}
      <Card className="max-w-3xl mx-auto mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                🔧 Email System Debug Tool
              </CardTitle>
              <CardDescription>
                Test all seller notification types and verify email delivery
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                proxyStatus === 'running' ? 'bg-green-500' : 
                proxyStatus === 'stopped' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-muted-foreground">
                Proxy: {proxyStatus}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Tests</TabsTrigger>
              <TabsTrigger value="order">Order Management</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="account">Account & Performance</TabsTrigger>
            </TabsList>

            {/* Basic Tests Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4">
                <Alert>
                  <Server className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Proxy Status:</strong> {
                      proxyStatus === 'running' ? '✅ Email proxy server is healthy' :
                      proxyStatus === 'stopped' ? '❌ Email proxy server is not running' :
                      '🔍 Checking proxy server status...'
                    }
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button onClick={checkProxyHealth} variant="outline" size="sm">
                    <Server className="h-4 w-4 mr-2" />
                    Check Proxy Health
                  </Button>
                  <Button 
                    onClick={testDirectEmail} 
                    disabled={emailDebugLoading || proxyStatus !== 'running'}
                    size="sm"
                  >
                    {emailDebugLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Test Direct Email
                  </Button>
                  <Button onClick={clearDebugLogs} variant="ghost" size="sm">
                    Clear Logs
                  </Button>
                </div>

                {emailResults.direct && (
                  <Alert className={emailResults.direct.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {emailResults.direct.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    <AlertDescription>
                      <strong>Direct Email:</strong> {emailResults.direct.message}
                      {emailResults.direct.messageId && (
                        <div className="text-xs mt-1 text-muted-foreground">ID: {emailResults.direct.messageId}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            {/* Order Management Tab */}
            <TabsContent value="order" className="space-y-4">
              <div className="grid gap-3">
                <h4 className="font-medium">Order Management Notifications</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => testNotificationType('New Order', () => 
                      sendNewOrderNotification({
                        sellerId: seller!.id,
                        orderNumber: 'TEST-' + Date.now(),
                        totalAmount: 999.99,
                        itemCount: 2,
                        customerName: 'Test Customer',
                        dashboardUrl: '/dashboard'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    🎉 New Order Received
                  </Button>

                  <Button
                    onClick={() => testNotificationType('Order Cancelled', () =>
                      sendOrderCancelledNotification({
                        sellerId: seller!.id,
                        orderNumber: 'TEST-' + Date.now(),
                        productName: 'Test Product',
                        reason: 'Customer changed mind',
                        cancelledAt: new Date().toLocaleString()
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    ❌ Order Canceled by Buyer
                  </Button>

                  <Button
                    onClick={() => testNotificationType('Return Request', () =>
                      sendReturnRequestNotification({
                        sellerId: seller!.id,
                        orderId: 'test-order-id',
                        orderNumber: 'TEST-' + Date.now(),
                        productName: 'Test Product',
                        reason: 'Product defective',
                        videoUrl: 'https://example.com/video.mp4',
                        requestedAt: new Date().toLocaleString(),
                        returnLink: '/returns'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    🔄 Return Request
                  </Button>

                  <Button
                    onClick={() => testNotificationType('Refund Completed', () =>
                      sendRefundCompletedNotification({
                        sellerId: seller!.id,
                        orderNumber: 'TEST-' + Date.now(),
                        refundAmount: 500.00,
                        refundMethod: 'Original payment method',
                        processingTime: '3-5 business days',
                        processedAt: new Date().toLocaleString()
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    💰 Refund Completed
                  </Button>
                </div>

                {(emailResults['New Order'] || emailResults['Order Cancelled'] || emailResults['Return Request'] || emailResults['Refund Completed']) && (
                  <div className="space-y-2">
                    {['New Order', 'Order Cancelled', 'Return Request', 'Refund Completed'].map(type => 
                      emailResults[type] && (
                        <Alert key={type} className={emailResults[type].success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                          {emailResults[type].success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                          <AlertDescription>
                            <strong>{type}:</strong> {emailResults[type].message}
                            {emailResults[type].messageId && (
                              <div className="text-xs mt-1 text-muted-foreground">ID: {emailResults[type].messageId}</div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4">
              <div className="grid gap-3">
                <h4 className="font-medium">Product & Inventory Notifications</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => testNotificationType('Low Stock Alert', () => 
                      sendLowStockAlert({
                        sellerId: seller!.id,
                        productName: 'Test Product',
                        currentStock: 5,
                        productId: 'test-product-id'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    ⚠️ Low Stock Alert
                  </Button>

                  <Button
                    onClick={() => testNotificationType('Out of Stock Alert', () =>
                      sendOutOfStockAlert({
                        sellerId: seller!.id,
                        productName: 'Test Product',
                        productId: 'test-product-id'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    🚫 Product Out of Stock
                  </Button>
                </div>

                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Stock Thresholds:</strong> Low stock alerts trigger when inventory &lt; 10 units. Works for both regular products and bundles.
                  </AlertDescription>
                </Alert>

                {(emailResults['Low Stock Alert'] || emailResults['Out of Stock Alert']) && (
                  <div className="space-y-2">
                    {['Low Stock Alert', 'Out of Stock Alert'].map(type => 
                      emailResults[type] && (
                        <Alert key={type} className={emailResults[type].success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                          {emailResults[type].success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                          <AlertDescription>
                            <strong>{type}:</strong> {emailResults[type].message}
                            {emailResults[type].messageId && (
                              <div className="text-xs mt-1 text-muted-foreground">ID: {emailResults[type].messageId}</div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Account & Performance Tab */}
            <TabsContent value="account" className="space-y-4">
              <div className="grid gap-3">
                <h4 className="font-medium">Account & Performance Notifications</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => testNotificationType('Account Approved', () =>
                      sendAccountApprovedNotification({
                        sellerId: seller!.id,
                        sellerName: seller!.businessname || 'Test Seller',
                        email: seller!.email,
                        approvedAt: new Date().toLocaleString(),
                        dashboardLink: '/dashboard'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    🎉 Account Approved
                  </Button>

                  <Button
                    onClick={() => testNotificationType('New Review', () =>
                      sendNewReviewNotification({
                        sellerId: seller!.id,
                        productName: 'Test Product',
                        rating: 5,
                        comment: 'Excellent product! Highly recommended.',
                        customerName: 'Happy Customer',
                        reviewedAt: new Date().toLocaleString(),
                        reviewLink: '/reviews'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    ⭐ New Review/Rating
                  </Button>

                  <Button
                    onClick={() => testNotificationType('Payout Processed', () =>
                      sendPayoutNotification({
                        sellerId: seller!.id,
                        amount: 1250.75,
                        bankAccount: '**** **** 1234',
                        period: 'November 2025',
                        transactionId: 'TXN-' + Date.now(),
                        processedAt: new Date().toLocaleString(),
                        payoutLink: '/payouts'
                      })
                    )}
                    disabled={emailDebugLoading || !seller?.id}
                    size="sm"
                    variant="outline"
                  >
                    💸 Payout Processed
                  </Button>
                </div>

                {(emailResults['Account Approved'] || emailResults['New Review'] || emailResults['Payout Processed']) && (
                  <div className="space-y-2">
                    {['Account Approved', 'New Review', 'Payout Processed'].map(type => 
                      emailResults[type] && (
                        <Alert key={type} className={emailResults[type].success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                          {emailResults[type].success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                          <AlertDescription>
                            <strong>{type}:</strong> {emailResults[type].message}
                            {emailResults[type].messageId && (
                              <div className="text-xs mt-1 text-muted-foreground">ID: {emailResults[type].messageId}</div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Debug Logs Section */}
          {debugLogs.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-medium">Debug Logs</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                <pre className="text-xs">
                  {debugLogs.join('\n')}
                </pre>
              </div>
            </div>
          )}

          {/* Email Configuration Info */}
          <Alert className="mt-4">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Email Configuration:</strong> Testing with {seller?.email || 'No email set'}. 
              All notifications will be sent to this address. Proxy server must be running on port 3001.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Real-Time Notification Control Panel */}
      {seller && (
        <div className="max-w-3xl mx-auto mt-6">
          <NotificationControlPanel
            sellerId={seller.id}
            sellerEmail={seller.email}
          />
        </div>
      )}
    </div>
  );
}
