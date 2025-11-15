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
import { Package, AlertCircle, TrendingDown, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnhancedRestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  currentStock: number;
  isBundle?: boolean;
  isVariant?: boolean;
  sellerId?: string | null;
  onSuccess?: () => void;
}

export function EnhancedRestockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
  isBundle = false,
  isVariant = false,
  sellerId,
  onSuccess,
}: EnhancedRestockDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculatedStock, setCalculatedStock] = useState(currentStock);
  const { toast } = useToast();

  // Calculate new stock in real-time
  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const num = parseInt(value) || 0;
    setCalculatedStock(currentStock + num);
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: "Out of Stock", color: "text-red-600", bgColor: "bg-red-50" };
    if (stock <= 10) return { label: "Low Stock", color: "text-orange-600", bgColor: "bg-orange-50" };
    return { label: "In Stock", color: "text-green-600", bgColor: "bg-green-50" };
  };

  const currentStatus = getStockStatus(currentStock);
  const newStatus = getStockStatus(calculatedStock);

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    
    // Allow negative numbers (which means reduction in stock)
    if (isNaN(qty)) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid number",
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

    // Warn if reducing stock significantly
    if (qty < 0 && Math.abs(qty) > currentStock * 0.5) {
      toast({
        title: "Large Reduction",
        description: `You're reducing stock by ${Math.abs(qty)} units (${Math.round((Math.abs(qty) / currentStock) * 100)}% decrease)`,
      });
    }

    setLoading(true);
    try {
      const newStock = currentStock + qty;

      if (isBundle) {
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
          if (sellerId) {
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
        }
      } else if (isVariant) {
        const { error } = await supabase
          .from("listing_variants")
          .update({
            stock_quantity: newStock,
          })
          .eq("variant_id", productId);

        if (error) throw error;

        const { data: variantData, error: variantError } = await supabase
          .from("listing_variants")
          .select("listing_id")
          .eq("variant_id", productId)
          .single();

        if (variantError) throw variantError;

        // Update parent listing total stock
        const { data: allVariants } = await supabase
          .from("listing_variants")
          .select("stock_quantity")
          .eq("listing_id", variantData.listing_id);

        const totalStock = (allVariants || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

        await supabase
          .from("seller_product_listings")
          .update({
            total_stock_quantity: totalStock,
            updated_at: new Date().toISOString(),
          })
          .eq("listing_id", variantData.listing_id);

        // Create low stock notification if stock is 10 or less
        if (newStock <= 10) {
          if (sellerId) {
            try {
              await supabase.from("notifications").insert({
                related_seller_id: sellerId,
                type: "low_stock",
                title: "Low Stock Alert - Product Variant",
                message: `Variant "${productName}" is running low on stock (${newStock} remaining). Stock threshold is 10 units.`,
              });
            } catch (notifError) {
              console.error("Error creating variant notification:", notifError);
            }
          }
        }
      } else {
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
          if (sellerId) {
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
      }

      const action = qty > 0 ? "added" : "removed";
      const absQty = Math.abs(qty);

      toast({
        title: "Stock Updated Successfully",
        description: `${absQty} units ${action}. New stock: ${newStock}`,
      });

      if (onSuccess) {
        onSuccess();
      }

      setQuantity("");
      setCalculatedStock(currentStock);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adjust Stock
          </AlertDialogTitle>
          <AlertDialogDescription>
            Update inventory for: <strong>{productName}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Current Stock Status */}
          <div className={`p-3 rounded-lg ${currentStatus.bgColor}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Stock</span>
              <span className={`font-bold ${currentStatus.color}`}>{currentStock} units</span>
            </div>
            <p className={`text-xs ${currentStatus.color} mt-1`}>{currentStatus.label}</p>
          </div>

          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-base font-semibold">
              Adjust By
              <span className="text-xs font-normal text-gray-500 ml-2">(positive or negative)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity (can be negative)"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center justify-center px-3 bg-gray-100 rounded font-mono font-semibold">
                = {calculatedStock}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              You can enter negative numbers to reduce stock
            </p>
          </div>

          {/* New Stock Status */}
          {quantity && (
            <div className={`p-3 rounded-lg ${newStatus.bgColor}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">New Stock</span>
                <span className={`font-bold ${newStatus.color}`}>{calculatedStock} units</span>
              </div>
              <p className={`text-xs ${newStatus.color} mt-1`}>{newStatus.label}</p>
            </div>
          )}

          {/* Warnings */}
          {calculatedStock <= 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Product will be marked as <strong>Out of Stock</strong> with this adjustment.
              </AlertDescription>
            </Alert>
          )}

          {calculatedStock > 0 && calculatedStock <= 10 && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                Product will be in <strong>Low Stock</strong> status ({calculatedStock} units remaining).
              </AlertDescription>
            </Alert>
          )}

          {quantity && parseInt(quantity) < 0 && Math.abs(parseInt(quantity)) > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                You're reducing stock by <strong>{Math.abs(parseInt(quantity))}</strong> units ({Math.round((Math.abs(parseInt(quantity)) / currentStock) * 100)}% decrease).
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading || !quantity}>
            {loading ? "Updating..." : "Confirm Update"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
