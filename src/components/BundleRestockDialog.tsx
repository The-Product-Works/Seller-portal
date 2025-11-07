import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedSellerId, getAuthenticatedUserId } from "@/lib/seller-helpers";
import { Plus, Minus } from "lucide-react";

interface BundleRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bundle: {
    bundle_id: string;
    bundle_name: string;
    total_stock_quantity: number;
  };
}

export default function BundleRestockDialog({
  open,
  onOpenChange,
  onSuccess,
  bundle,
}: BundleRestockDialogProps) {
  const { toast } = useToast();
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const newStock = bundle.total_stock_quantity + restockAmount;

  async function handleRestock() {
    if (restockAmount === 0) {
      toast({ title: "Enter a restock amount", variant: "destructive" });
      return;
    }

    if (newStock < 0) {
      toast({
        title: "Invalid stock amount",
        description: "Stock cannot be negative",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update bundle total stock
      const { error: bundleError } = await supabase
        .from("bundles")
        .update({ total_stock_quantity: newStock })
        .eq("bundle_id", bundle.bundle_id);

      if (bundleError) throw bundleError;

      // Create low stock notification if stock is 10 or less
      if (newStock <= 10) {
        const authUserId = await getAuthenticatedUserId();
        if (authUserId) {
          try {
            const { error: notifError } = await supabase.from("notifications").insert({
              related_seller_id: authUserId,
              type: "low_stock",
              title: "Low Stock Alert - Bundle",
              message: `Bundle "${bundle.bundle_name}" is running low on stock (${newStock} remaining). Stock threshold is 10 units.`,
            });
            if (notifError) throw notifError;
          } catch (notifError) {
            // Silently fail if notification creation fails
            console.error("Error creating notification:", notifError);
          }
        }
      }

      toast({
        title: "Stock updated successfully",
        description: `${bundle.bundle_name} stock updated to ${newStock} units`,
      });

      onSuccess();
      onOpenChange(false);
      setRestockAmount(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error updating stock",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restock Bundle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Bundle</Label>
            <div className="p-3 bg-muted rounded">
              <p className="font-medium">{bundle.bundle_name}</p>
              <p className="text-sm text-muted-foreground">
                Current Stock: {bundle.total_stock_quantity} units
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Restock Amount</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setRestockAmount(Math.max(restockAmount - 10, -bundle.total_stock_quantity))
                }
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={restockAmount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setRestockAmount(Math.max(value, -bundle.total_stock_quantity));
                }}
                className="text-center"
                placeholder="0"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRestockAmount(restockAmount + 10)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use negative numbers to reduce stock
            </p>
          </div>

          <div className="p-3 bg-primary/10 rounded">
            <div className="flex justify-between items-center">
              <span className="font-medium">New Stock:</span>
              <span
                className={`text-lg font-bold ${
                  newStock < 10 ? "text-destructive" : "text-primary"
                }`}
              >
                {newStock} units
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRestock} disabled={loading || restockAmount === 0}>
            {loading ? "Updating..." : "Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
