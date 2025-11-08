import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Truck } from "lucide-react";

interface OrderTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  sellerId?: string | null;
  onSuccess?: () => void;
}

interface OrderTrackingRecord {
  tracking_id: string;
  order_id: string;
  status: string;
  url: string;
  location: string;
  notes: string;
  updated_at: string;
}

export function OrderTrackingDialog({
  open,
  onOpenChange,
  orderId,
  sellerId,
  onSuccess,
}: OrderTrackingDialogProps) {
  const [status, setStatus] = useState("shipped");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!sellerId) {
      toast({
        title: "Error",
        description: "Seller ID not found",
        variant: "destructive",
      });
      return;
    }

    if (!trackingUrl.trim()) {
      toast({
        title: "Required",
        description: "Please enter the tracking URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Insert tracking record
      const { error: trackingError } = await supabase
        .from("order_tracking")
        .insert({
          order_id: orderId,
          status: status,
          url: trackingUrl.trim(),
          location: location.trim() || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        } as OrderTrackingRecord);

      if (trackingError) throw trackingError;

      // Update order status to shipped if it was processing
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: status === "delivered" ? "delivered" : "shipped",
        })
        .eq("id", orderId)
        .eq("status", "processing");

      if (updateError && updateError.code !== "PGRST116") {
        // PGRST116 means no rows matched, which is fine
        throw updateError;
      }

      toast({
        title: "Tracking Added",
        description: "Order tracking information has been updated. Buyer has been notified.",
      });

      onOpenChange(false);
      setStatus("shipped");
      setTrackingUrl("");
      setLocation("");
      setNotes("");
      onSuccess?.();
    } catch (error) {
      console.error("Error adding tracking:", error);
      toast({
        title: "Error",
        description: "Failed to add tracking information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Add Order Tracking
          </AlertDialogTitle>
          <AlertDialogDescription>
            Provide tracking information for the order. The buyer will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-semibold">
              Shipment Status
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              title="Select shipment status"
            >
              <option value="shipped">Shipped</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          {/* Tracking URL */}
          <div className="space-y-2">
            <Label htmlFor="trackingUrl" className="text-sm font-semibold">
              Tracking URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="trackingUrl"
              placeholder="e.g., https://track.courier.com/ABC123XYZ"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Provide the direct link to track the shipment
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold">
              Current Location (Optional)
            </Label>
            <Input
              id="location"
              placeholder="e.g., Delhi, India or Distribution Hub Name"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant information about the shipment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The buyer will receive the tracking URL and can monitor their delivery status.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !trackingUrl.trim()}>
            {loading ? "Adding..." : "Add Tracking"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
