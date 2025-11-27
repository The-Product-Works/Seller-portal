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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Truck, MapPin } from "lucide-react";

interface ReturnTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnId: string;
  sellerId?: string | null;
  onSuccess?: () => void;
}

interface ReturnTrackingRecord {
  return_tracking_id: string;
  return_id: string;
  status: string;
  location: string;
  notes: string;
  updated_at: string;
}

type TrackingStatus = "pending" | "shipped" | "in_transit" | "delivered" | "completed";

const TRACKING_STATUS_OPTIONS: { value: TrackingStatus; label: string; description: string }[] = [
  {
    value: "pending",
    label: "Pending",
    description: "Return initiated, awaiting pickup",
  },
  {
    value: "shipped",
    label: "Shipped",
    description: "Return package shipped",
  },
  {
    value: "in_transit",
    label: "In Transit",
    description: "Package is on the way",
  },
  {
    value: "delivered",
    label: "Delivered",
    description: "Package has been delivered",
  },
  {
    value: "completed",
    label: "Completed",
    description: "Return process completed",
  },
];

export function ReturnTrackingDialog({
  open,
  onOpenChange,
  returnId,
  sellerId,
  onSuccess,
}: ReturnTrackingDialogProps) {
  const [status, setStatus] = useState<TrackingStatus>("pending");
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

    if (!location.trim()) {
      toast({
        title: "Required",
        description: "Please enter the current location",
        variant: "destructive",
      });
      return;
    }

    // Check if the return is in an allowed state for seller updates
    try {
      const { data: returnData, error: returnError } = await supabase
        .from("order_returns")
        .select("status")
        .eq("return_id", returnId)
        .single();

      if (returnError) throw returnError;

      const allowedStates = ["initiated", "seller_review", "pickup_scheduled", "picked_up", "quality_check", "approved", "rejected", "completed"];
      if (!allowedStates.includes(returnData.status)) {
        toast({
          title: "Access Denied",
          description: `Cannot update tracking for return with status '${returnData.status}'. Only returns in specific workflow states can be updated by sellers.`,
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Error checking return status:", error);
      toast({
        title: "Error",
        description: "Failed to verify return status. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Insert tracking record
      const { error: trackingError } = await supabase
        .from("return_tracking")
        .insert({
          return_id: returnId,
          status: status,
          location: location.trim(),
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        } as ReturnTrackingRecord);

      if (trackingError) throw trackingError;

      // Update return status to match latest tracking
      const { error: updateError } = await supabase
        .from("order_returns")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("return_id", returnId);

      if (updateError) throw updateError;

      toast({
        title: "Tracking Updated",
        description: `Return status updated to ${TRACKING_STATUS_OPTIONS.find(o => o.value === status)?.label}`,
      });

      onOpenChange(false);
      setStatus("pending");
      setLocation("");
      setNotes("");
      onSuccess?.();
    } catch (error) {
      console.error("Error updating tracking:", error);
      toast({
        title: "Error",
        description: "Failed to update tracking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedStatusOption = TRACKING_STATUS_OPTIONS.find(o => o.value === status);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Update Return Tracking
          </AlertDialogTitle>
          <AlertDialogDescription>
            Update the current status and location of the return shipment.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Selection */}
          <div className="space-y-3">
            <Label htmlFor="status" className="text-sm font-semibold">
              Shipment Status
            </Label>
            <Select value={status} onValueChange={(val) => setStatus(val as TrackingStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACKING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStatusOption && (
              <p className="text-xs text-muted-foreground">
                {selectedStatusOption.description}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., Delhi, India or Distribution Center Name"
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
              <strong>Note:</strong> Buyer will be notified of this tracking update. Keep updates regular for better buyer experience.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !location.trim()}>
            {loading ? "Updating..." : "Update Tracking"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
