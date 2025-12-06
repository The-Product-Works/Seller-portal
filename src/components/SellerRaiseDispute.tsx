import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendAdminDisputeRaisedEmail } from "@/lib/email/helpers/admin-dispute-raised";

interface SellerRaiseDisputeProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  context?: {
    orderId?: string;
    orderItemId?: string;
    listingId?: string;
    productName?: string;
    orderNumber?: string;
    type: "order" | "product" | "earnings" | "platform";
  };
}

export const SellerRaiseDispute = ({
  isOpen,
  onClose,
  sellerId,
  context,
}: SellerRaiseDisputeProps) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [evidence, setEvidence] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      const newFiles = Array.from(files).filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Images must be less than 5MB",
            variant: "destructive",
          });
          return false;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: "Only JPG, PNG, and WebP images are allowed",
            variant: "destructive",
          });
          return false;
        }
        return true;
      });
      setEvidence([...evidence, ...newFiles]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Videos must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      if (!["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only MP4, MOV, AVI, and WebM videos are allowed",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in subject and description",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const evidenceUrls: string[] = [];
      let videoUrl: string | null = null;

      // Upload images
      for (const file of evidence) {
        const fileName = `${sellerId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("dispute_evidence")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from("dispute_evidence")
          .getPublicUrl(fileName);

        evidenceUrls.push(urlData.publicUrl);
      }

      // Upload video
      if (videoFile) {
        const fileName = `${sellerId}/${Date.now()}_${videoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("dispute_evidence")
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from("dispute_evidence")
          .getPublicUrl(fileName);

        videoUrl = urlData.publicUrl;
      }

      // Create dispute record
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          reporter_id: sellerId,
          reporter_role: "seller",
          subject,
          description,
          severity,
          evidence_urls: evidenceUrls,
          video_url: videoUrl,
          related_order_id: context?.orderId || null,
          related_order_item_id: context?.orderItemId || null,
          listing_id: context?.listingId || null,
          status: "open",
        })
        .select()
        .single();

      if (disputeError) throw disputeError;

      toast({
        title: "Dispute raised successfully",
        description: `Your dispute has been submitted with ID: ${dispute.dispute_id.slice(0, 8)}`,
      });

      // Send admin notification email about new dispute
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      if (adminEmail) {
        try {
          // Fetch seller details for the email
          const { data: sellerData } = await supabase
            .from('sellers')
            .select('email, business_name, name')
            .eq('id', sellerId)
            .single();

          const sellerName = sellerData?.business_name || sellerData?.name || sellerData?.email || 'Seller';
          const sellerEmail = sellerData?.email || '';

          await sendAdminDisputeRaisedEmail({
            adminEmail,
            sellerName,
            sellerEmail,
            sellerId,
            disputeId: dispute.dispute_id,
            subject,
            description,
            severity,
            disputeType: context?.type || 'platform',
            orderNumber: context?.orderNumber,
            productName: context?.productName,
            raisedAt: new Date().toISOString(),
            dashboardUrl: `${window.location.origin}/admin/disputes/${dispute.dispute_id}`,
            hasEvidence: evidence.length > 0,
            hasVideo: videoFile !== null,
          });
          console.log('[Dispute] Admin notification email sent successfully');
        } catch (emailError) {
          console.error('[Dispute] Failed to send admin notification:', emailError);
          // Non-fatal - don't block user flow
        }
      }

      // Reset form
      setSubject("");
      setDescription("");
      setSeverity("medium");
      setEvidence([]);
      setVideoFile(null);
      onClose();
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit dispute",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Raise a Dispute</DialogTitle>
          <DialogDescription>
            Submit a dispute regarding {context?.type === "order" ? "an order" : "a product or service issue"}
            {context?.orderNumber && ` (Order #${context.orderNumber})`}
            {context?.productName && ` - ${context.productName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please provide clear details and evidence to help us resolve your dispute quickly.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief summary of the dispute"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the issue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity Level</Label>
            <Select value={severity} onValueChange={(val: "low" | "medium" | "high" | "critical") => setSeverity(val)}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                <SelectItem value="high">High - Significant issue</SelectItem>
                <SelectItem value="critical">Critical - Urgent resolution needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Evidence (Images)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <label className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload images (up to 5MB each)
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            {evidence.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {evidence.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-secondary p-2 rounded text-sm"
                  >
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeEvidence(idx)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Video Evidence</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <label className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload video (up to 10MB)
                  </span>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {videoFile && (
              <div className="flex items-center gap-2 bg-secondary p-2 rounded text-sm">
                <span>{videoFile.name}</span>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
