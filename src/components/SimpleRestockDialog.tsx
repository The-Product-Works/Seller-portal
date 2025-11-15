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
  isVariant?: boolean;  // New flag to indicate if productId is a variant_id
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
  isVariant = false,
  sellerId,
  onSuccess,
}: SimpleRestockDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty === 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity (can be positive to add or negative to remove)",
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
      
      // Validate that new stock is not negative
      if (newStock < 0) {
        toast({
          title: "Invalid Stock",
          description: "Stock cannot go below 0. Current stock is " + currentStock,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

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

        // Create low stock notification if stock is 10 or less
        if (newStock <= 10) {
          try {
            await supabase.from("notifications").insert({
              related_seller_id: sellerId,
              type: "low_stock",
              title: "Low Stock Alert - Bundle",
              message: `Bundle "${productName}" is running low on stock (${newStock} remaining). Stock threshold is 10 units.`,
            });
          } catch (notifError) {
            console.error("Error creating bundle notification:", notifError);
          }
        }

      } else if (isVariant) {
        // Update variant stock
        const { error } = await supabase
          .from("listing_variants")
          .update({
            stock_quantity: newStock,
          })
          .eq("variant_id", productId);

        if (error) throw error;

        // Also update the total stock quantity for the parent listing
        // First get the variant to find its listing_id
        const { data: variantData, error: variantError } = await supabase
          .from("listing_variants")
          .select("listing_id")
          .eq("variant_id", productId)
          .single();

        if (variantError) throw variantError;

        // Get all variants for this listing to calculate new total
        const { data: allVariants, error: allVariantsError } = await supabase
          .from("listing_variants")
          .select("stock_quantity")
          .eq("listing_id", variantData.listing_id);

        if (allVariantsError) throw allVariantsError;

        const totalStock = allVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

        // Update the parent listing's total stock
        const { error: listingError } = await supabase
          .from("seller_product_listings")
          .update({
            total_stock_quantity: totalStock,
            updated_at: new Date().toISOString(),
          })
          .eq("listing_id", variantData.listing_id);

        if (listingError) throw listingError;
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

        // Create low stock notification if stock is 10 or less
        if (newStock <= 10) {
          try {
            await supabase.from("notifications").insert({
              related_seller_id: sellerId,
              type: "low_stock",
              title: "Low Stock Alert - Product",
              message: `Product "${productName}" is running low on stock (${newStock} remaining). Stock threshold is 10 units.`,
            });
          } catch (notifError) {
            console.error("Error creating product notification:", notifError);
          }
        }
      }

      toast({
        title: "Stock Updated",
        description: `${qty > 0 ? 'Added' : 'Removed'} ${Math.abs(qty)} units to ${productName}. New stock: ${newStock}`,
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
            Update {isBundle ? "Bundle" : "Product"} Stock
          </AlertDialogTitle>
          <AlertDialogDescription>
            Increase or decrease stock quantity for {productName}
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
              Quantity Change <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter positive to add, negative to remove"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Current stock: {currentStock} → New stock: {currentStock + (parseInt(quantity) || 0)} units
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Enter positive numbers to add stock, negative numbers to remove stock. Example: +50 or -10
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !quantity || isNaN(parseInt(quantity)) || parseInt(quantity) === 0}>
            {loading ? "Updating..." : "Update Stock"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
