import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Product {
  listing_id: string;
  product_name: string;
  sku: string;
  stock_quantity: number;
}

interface Variant {
  id: string;
  variant_name: string;
  stock_quantity: number;
}

interface SellerProductListing {
  listing_id: string;
  seller_title: string;
  sku: string;
  total_stock_quantity: number;
  global_products?: {
    product_name: string;
  };
}

interface ListingVariant {
  variant_id: string;
  variant_name: string;
  stock_quantity: number;
}

interface RestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string | null;
  onSuccess?: () => void;
  preSelectedListingId?: string;
}

export default function RestockDialog({
  open,
  onOpenChange,
  sellerId,
  onSuccess,
  preSelectedListingId,
}: RestockDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(preSelectedListingId || "");
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSimpleMode, setIsSimpleMode] = useState(!!preSelectedListingId);
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("seller_product_listings")
        .select(`
          listing_id,
          seller_title,
          sku,
          total_stock_quantity,
          global_products(product_name)
        `)
        .eq("seller_id", sellerId)
        .eq("status", "active")
        .order("seller_title");

      if (error) throw error;

      setProducts(
        (data as SellerProductListing[] | null || []).map((p) => ({
          listing_id: p.listing_id,
          product_name: p.seller_title || p.global_products?.product_name || "Untitled",
          sku: p.sku,
          stock_quantity: p.total_stock_quantity || 0,
        }))
      );
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sellerId, toast]);

  useEffect(() => {
    if (open && sellerId) {
      loadProducts();
      if (preSelectedListingId) {
        setSelectedProduct(preSelectedListingId);
        setIsSimpleMode(true);
      } else {
        setSelectedProduct("");
        setIsSimpleMode(false);
      }
    }
  }, [open, sellerId, loadProducts, preSelectedListingId]);

  useEffect(() => {
    if (selectedProduct) {
      loadVariants(selectedProduct);
      setSelectedVariant("");
    }
  }, [selectedProduct]);

  const loadVariants = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from("listing_variants")
        .select("variant_id, variant_name, stock_quantity")
        .eq("listing_id", listingId)
        .order("variant_name");

      if (error) throw error;

      setVariants(
        (data as ListingVariant[] | null || []).map((v) => ({
          id: v.variant_id,
          variant_name: v.variant_name || "Default",
          stock_quantity: v.stock_quantity || 0,
        }))
      );
    } catch (error) {
      console.error("Error loading variants:", error);
      setVariants([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select a product and enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (variants.length > 0 && !selectedVariant) {
      toast({
        title: "Validation Error",
        description: "Please select a variant",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const quantityNum = parseInt(quantity);

      if (variants.length > 0 && selectedVariant) {
        // Update variant stock
        const currentVariant = variants.find((v) => v.id === selectedVariant);
        const newStock = (currentVariant?.stock_quantity || 0) + quantityNum;

        const { error: updateError } = await supabase
          .from("listing_variants")
          .update({ stock_quantity: newStock })
          .eq("variant_id", selectedVariant);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: `Added ${quantityNum} units to ${currentVariant?.variant_name}`,
        });
      } else {
        // Update main product stock
        const currentProduct = products.find((p) => p.listing_id === selectedProduct);
        const newStock = (currentProduct?.stock_quantity || 0) + quantityNum;

        const { error: updateError } = await supabase
          .from("seller_product_listings")
          .update({ total_stock_quantity: newStock })
          .eq("listing_id", selectedProduct);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: `Restocked ${currentProduct?.product_name} with ${quantityNum} units`,
        });
      }

      // Reset form
      setSelectedProduct("");
      setSelectedVariant("");
      setQuantity("");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error restocking:", error);
      toast({
        title: "Error",
        description: "Failed to restock product",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restock Product</DialogTitle>
          <DialogDescription>
            Add inventory to your products directly from the dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Selection - Only if not pre-selected */}
          {!isSimpleMode && (
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product" disabled={loading}>
                  <SelectValue
                    placeholder={loading ? "Loading products..." : "Select a product"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.listing_id} value={product.listing_id}>
                      {product.product_name} (Stock: {product.stock_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show current product name in simple mode */}
          {isSimpleMode && selectedProduct && (
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{products.find(p => p.listing_id === selectedProduct)?.product_name}</p>
              <p className="text-xs text-muted-foreground">Current Stock: {products.find(p => p.listing_id === selectedProduct)?.stock_quantity}</p>
            </div>
          )}

          {/* Variant Selection */}
          {!isSimpleMode && variants.length > 0 && selectedProduct && (
            <div className="space-y-2">
              <Label htmlFor="variant">Variant</Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger id="variant">
                  <SelectValue placeholder="Select a variant" />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.variant_name} (Current: {variant.stock_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Add</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!selectedProduct}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedProduct || !quantity}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restocking...
              </>
            ) : (
              "Restock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
