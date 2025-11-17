import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle, XCircle, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Seller = Database["public"]["Tables"]["sellers"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type EditFeedback = Record<string, unknown>;
type SellerDocument = Database["public"]["Tables"]["seller_documents"]["Row"];
type SellerDocPartial = Pick<SellerDocument, "doc_type" | "storage_path">;

export default function SellerVerification() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [status, setStatus] = useState<string>("unknown");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [allowedFields, setAllowedFields] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [editFeedback, setEditFeedback] = useState<EditFeedback[]>([]);
  const [docs, setDocs] = useState<SellerDocPartial[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: sellerData, error: sellerErr } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sellerErr) throw sellerErr;
      if (!sellerData) {
        navigate("/KYC");
        return;
      }

      setSeller(sellerData);
      setStatus(sellerData.verification_status || "pending");

      // load seller docs (aadhaar, pan, selfie)
      const { data: sellerDocs } = await supabase
        .from("seller_documents")
        .select("doc_type, storage_path")
        .eq("seller_id", sellerData.id)
        .order("uploaded_at", { ascending: false });

      // Group by doc_type and take only the most recent of each type
      // storage_path is already a Supabase signed URL, use it directly
      const latestDocsMap = new Map<string, SellerDocPartial>();
      
      if (sellerDocs && Array.isArray(sellerDocs)) {
        for (const d of sellerDocs) {
          const docType = (d as SellerDocPartial).doc_type;
          if (!docType) continue;
          
          // Only keep the first occurrence of each doc_type (most recent due to ORDER BY)
          if (!latestDocsMap.has(docType)) {
            latestDocsMap.set(docType, d as SellerDocPartial);
          }
        }
      }

      // Convert map to array ensuring we have all 3 doc types
      const docsWithUrls = Array.from(latestDocsMap.values());
      console.log("Admin viewing documents:", docsWithUrls.length, "docs -", Array.from(latestDocsMap.keys()));
      console.log("Document URLs:", docsWithUrls.map(d => ({ type: d.doc_type, url: d.storage_path })));
      setDocs(docsWithUrls || []);

      // load edit request feedback
      const { data: feedback } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("seller_id", sellerData.id)
        .eq("step", "edit_request_feedback")
        .order("verified_at", { ascending: false });
      setEditFeedback(feedback || []);

      // load notifications for seller
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(notifData || []);

      // set allowed fields + message if available
      if (feedback && feedback[0]?.details) {
        const det = feedback[0].details as Record<string, unknown>;
        setAllowedFields((det.allowed_fields as string[]) || []);
        setAdminMessage((det.admin_message as string | null) || (det.admin_note as string | null) || null);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(error);
      toast({ title: "Error loading", description: error.message || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <Card>
        <CardHeader>
          <CardTitle>Seller Verification Center</CardTitle>
          <CardDescription>Monitor your verification status, edit permissions, and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="edits">Edit Feedback</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* STATUS TAB */}
            <TabsContent value="status" className="mt-6">
              <div className="border rounded p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Verification Status</h3>
                    <p className="text-sm text-muted-foreground">Current: {status}</p>
                  </div>
                  <Button variant="outline" onClick={() => setRefreshToken(t => t + 1)}>
                    <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </div>

                {adminMessage && (
                  <div className="p-3 bg-yellow-50 border rounded">
                    <strong>Admin Message:</strong>
                    <p className="text-sm mt-1">{adminMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allowed fields: {allowedFields.length ? allowedFields.join(", ") : "None"}
                    </p>
                  </div>
                )}

                {!["approved", "verified", "rejected"].includes(status) && !adminMessage && (
                  <div className="p-3 bg-blue-50 border rounded">
                    <p className="text-sm text-blue-900">
                      Admin will check KYC information and verify your seller account. Please check back later.
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-md font-medium mt-3 mb-2">Uploaded Documents</h4>
                  {docs.length ? (
                    <div className="grid grid-cols-3 gap-4">
                      {docs.map((d) => {
                        const docType = (d as Record<string, unknown>).doc_type as string | undefined;
                        const storagePath = (d as Record<string, unknown>).storage_path as string | undefined;
                        return (
                          <div key={docType || Math.random()} className="text-center">
                            <p className="text-sm font-medium mb-1">{docType?.toUpperCase()}</p>
                            {storagePath && (
                              <img
                                src={storagePath}
                                alt={docType || "document"}
                                className="rounded border shadow-sm w-full h-40 object-cover"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents found</p>
                  )}
                </div>

                <div className="text-right">
                  {status === "approved" || status === "verified" ? (
                    <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Verified - Go to Dashboard
                    </Button>
                  ) : status === "rejected" ? (
                    <Button variant="secondary" onClick={() => navigate("/KYC")}>
                      <XCircle className="h-4 w-4 mr-1" /> Resubmit KYC
                    </Button>
                  ) : (
                    <Button disabled>
                      <Loader2 className="animate-spin h-4 w-4 mr-1" /> Under Review by Admin
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* EDIT FEEDBACK TAB */}
            <TabsContent value="edits" className="mt-6">
              {editFeedback.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No feedback or edit permissions yet.
                </div>
              ) : (
                editFeedback.map((ef, index) => {
                  const efRec = ef as Record<string, unknown>;
                  const efId = efRec.id as string | undefined || index;
                  const verifiedAt = efRec.verified_at as string | undefined;
                  return (
                    <div key={efId} className="mb-3 border rounded p-4">
                      <h4 className="text-md font-semibold mb-2">Admin Feedback</h4>
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(efRec.details, null, 2)}
                      </pre>
                      {verifiedAt && (
                        <p className="text-xs mt-2 text-muted-foreground">
                          Updated at {new Date(verifiedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* NOTIFICATIONS TAB */}
            <TabsContent value="notifications" className="mt-6">
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No notifications</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="border rounded p-3 mb-2 flex justify-between">
                    <div>
                      <p className="font-semibold">{n.title || n.type}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
