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

      // IMPORTANT: Bundle stock is now calculated dynamically from product stocks
      // We need to fetch bundle items and update each product's stock proportionally
      
      const { data: bundleItems, error: itemsError } = await supabase
        .from("bundle_items")
        .select(`
          listing_id,
          quantity,
          seller_product_listings(
            listing_id,
            total_stock_quantity
          )
        `)
        .eq("bundle_id", bundle.bundle_id);

      if (itemsError) throw itemsError;

      if (!bundleItems || bundleItems.length === 0) {
        toast({
          title: "Error",
          description: "Bundle has no items to restock",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Calculate how many units of each product we need to add
      // If we're increasing bundle stock by 5, and bundle needs 2 units of product A,
      // we need to add 5 * 2 = 10 units to product A's stock
      
      const updates: Promise<any>[] = [];
      
      for (const item of bundleItems) {
        const product = item.seller_product_listings;
        if (!product) continue;
        
        const currentProductStock = product.total_stock_quantity || 0;
        const requiredPerBundle = item.quantity || 1;
        const stockToAdd = restockAmount * requiredPerBundle;
        const newProductStock = currentProductStock + stockToAdd;
        
        if (newProductStock < 0) {
          toast({
            title: "Invalid operation",
            description: `Cannot reduce stock below 0 for products in this bundle`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Update product listing stock
        updates.push(
          Promise.resolve(
            supabase
              .from("seller_product_listings")
              .update({
                total_stock_quantity: newProductStock,
                updated_at: new Date().toISOString(),
              })
              .eq("listing_id", item.listing_id)
          )
        );
      }

      // Execute all updates
      const results = await Promise.all(updates);
      
      // Check for errors
      const failed = results.find(r => r.error);
      if (failed?.error) {
        throw failed.error;
      }

      // Also update the bundle's total_stock_quantity in DB (for reference, though it's calculated dynamically)
      await supabase
        .from("bundles")
        .update({ 
          total_stock_quantity: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("bundle_id", bundle.bundle_id);

      // Handle low stock notifications
      if (newStock > 10) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("related_bundle_id", bundle.bundle_id)
          .eq("type", "low_stock")
          .eq("is_read", false);
      } else if (newStock <= 10 && newStock > 0) {
        try {
          await supabase.from("notifications").insert({
            related_seller_id: await getAuthenticatedSellerId(),
            type: "low_stock",
            title: "Low Stock Alert - Bundle",
            message: `Bundle "${bundle.bundle_name}" is running low on stock (${newStock} remaining). Stock threshold is 10 units.`,
            related_bundle_id: bundle.bundle_id,
          });
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      toast({
        title: "Stock updated successfully",
        description: `${bundle.bundle_name} stock updated to ${newStock} units (all products restocked)`,
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
