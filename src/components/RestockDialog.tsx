// Restock Dialog Component
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
import { Plus, Minus } from "lucide-react";

interface RestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  variant: {
    variant_id: string;
    variant_name: string;
    sku: string;
    stock_quantity: number;
  };
  listingId: string;
}

export default function RestockDialog({
  open,
  onOpenChange,
  onSuccess,
  variant,
  listingId,
}: RestockDialogProps) {
  const { toast } = useToast();
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const newStock = variant.stock_quantity + restockAmount;

  async function handleRestock() {
    if (restockAmount === 0) {
      toast({ title: "Enter a restock amount", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      // Update variant stock
      const { error: variantError } = await supabase
        .from("listing_variants")
        .update({ stock_quantity: newStock })
        .eq("variant_id", variant.variant_id);

      if (variantError) throw variantError;

      // Recalculate total stock for listing
      const { data: allVariants, error: fetchError } = await supabase
        .from("listing_variants")
        .select("stock_quantity")
        .eq("listing_id", listingId);

      if (fetchError) throw fetchError;

      const totalStock = allVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

      // Update listing total stock
      const { error: listingError } = await supabase
        .from("seller_product_listings")
        .update({ total_stock_quantity: totalStock })
        .eq("listing_id", listingId);

      if (listingError) throw listingError;

      toast({
        title: "Stock updated successfully",
        description: `${variant.variant_name} stock updated to ${newStock} units`,
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
          <DialogTitle>Restock Variant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Variant</Label>
            <div className="p-3 bg-muted rounded">
              <p className="font-medium">{variant.variant_name}</p>
              <p className="text-sm text-muted-foreground">SKU: {variant.sku}</p>
              <p className="text-sm text-muted-foreground">
                Current Stock: {variant.stock_quantity} units
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
                onClick={() => setRestockAmount(Math.max(restockAmount - 10, -variant.stock_quantity))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={restockAmount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setRestockAmount(Math.max(value, -variant.stock_quantity));
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
              <span className={`text-lg font-bold ${newStock < 10 ? 'text-destructive' : 'text-primary'}`}>
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
