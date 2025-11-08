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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "lucide-react";

interface SimpleRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  currentStock: number;
  isBundle?: boolean;
  sellerId?: string | null;
  onSuccess?: () => void;
}

export function SimpleRestockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
  isBundle = false,
  sellerId,
  onSuccess,
}: SimpleRestockDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!sellerId) {
      toast({
        title: "Error",
        description: "Seller ID not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newStock = currentStock + qty;

      if (isBundle) {
        // Update bundle stock
        const { error } = await supabase
          .from("bundles")
          .update({
            total_stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("bundle_id", productId)
          .eq("seller_id", sellerId);

        if (error) throw error;
      } else {
        // Update product stock
        const { error } = await supabase
          .from("seller_product_listings")
          .update({
            total_stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("listing_id", productId)
          .eq("seller_id", sellerId);

        if (error) throw error;
      }

      toast({
        title: "Stock Updated",
        description: `Added ${qty} units to ${productName}. New stock: ${newStock}`,
      });

      onOpenChange(false);
      setQuantity("");
      onSuccess?.();
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
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
            <Package className="h-5 w-5 text-blue-600" />
            Restock {isBundle ? "Bundle" : "Product"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Add stock quantity to {productName}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Stock */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Stock</p>
            <p className="font-semibold">{currentStock} units</p>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-semibold">
              Quantity to Add <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              New stock will be: {currentStock + (parseInt(quantity) || 0)} units
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> This will immediately update the stock quantity and make the product available for sale.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !quantity || parseInt(quantity) <= 0}>
            {loading ? "Updating..." : "Update Stock"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
