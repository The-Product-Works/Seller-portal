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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

interface ReturnQCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnId: string;
  sellerId?: string | null;
  onSuccess?: () => void;
}

interface ReturnQCRecord {
  qc_id: string;
  return_id: string;
  performed_by: string;
  result: "passed" | "failed";
  remarks: string;
  checked_at: string;
}

export function ReturnQCDialog({
  open,
  onOpenChange,
  returnId,
  sellerId,
  onSuccess,
}: ReturnQCDialogProps) {
  const [result, setResult] = useState<"passed" | "failed">("passed");
  const [remarks, setRemarks] = useState("");
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

    if (!remarks.trim()) {
      toast({
        title: "Required",
        description: "Please add remarks about the QC check",
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
          description: `Cannot perform QC for return with status '${returnData.status}'. Only returns in specific workflow states can be updated by sellers.`,
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
      // Insert QC record
      const { error: qcError } = await supabase
        .from("return_quality_checks")
        .insert({
          return_id: returnId,
          performed_by: sellerId,
          result: result,
          remarks: remarks.trim(),
          checked_at: new Date().toISOString(),
        } as ReturnQCRecord);

      if (qcError) throw qcError;

      // Update return status based on QC result
      const newStatus = result === "passed" ? "approved" : "rejected";
      const { error: updateError } = await supabase
        .from("order_returns")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("return_id", returnId);

      if (updateError) throw updateError;

      toast({
        title: "QC Check Completed",
        description: `Return marked as ${result}. Buyer has been notified.`,
      });

      onOpenChange(false);
      setResult("passed");
      setRemarks("");
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting QC:", error);
      toast({
        title: "Error",
        description: "Failed to submit QC check. Please try again.",
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
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Quality Check Assessment
          </AlertDialogTitle>
          <AlertDialogDescription>
            Perform quality check on the returned item and provide your assessment.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* QC Result Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">QC Result</Label>
            <RadioGroup value={result} onValueChange={(val) => setResult(val as "passed" | "failed")}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer" onClick={() => setResult("passed")}>
                <RadioGroupItem value="passed" id="passed" />
                <Label htmlFor="passed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Passed - Item is in acceptable condition</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer" onClick={() => setResult("failed")}>
                <RadioGroupItem value="failed" id="failed" />
                <Label htmlFor="failed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Failed - Item does not meet standards</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-semibold">
              Remarks / Notes
            </Label>
            <Textarea
              id="remarks"
              placeholder="Describe the condition of the returned item, any damage, defects, or other observations..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">
              {remarks.length}/500 characters
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The buyer will be notified of your QC decision. If passed, the return will be approved. If failed, it will be rejected.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !remarks.trim()}>
            {loading ? "Submitting..." : "Submit QC Check"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
