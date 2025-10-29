import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Edit, Trash2, AlertTriangle, Package, LayoutGrid, GiftIcon } from "lucide-react";
import { FilterDialog, FilterValues } from "@/components/FilterDialog";
import { applyProductFilters } from "@/lib/filters";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BundleCreation } from "@/components/BundleCreation";
import { ProductVariantSection, AllergenSection } from "@/components/ProductOptions";
import { createBundle, deleteBundle, listBundles } from "@/lib/bundles";
type BundleWithProducts = {
  id?: string;
  products: any[];
  title?: string;
  thumbnail_url?: string;
  original_price?: number;
  final_price?: number;
  total_price?: number;
  discounted_price?: number;
};
import { Tables } from "@/integrations/supabase/database.types";

type Product = Tables<"products"> & {
  images?: Tables<"product_images">[];
  inventory?: Tables<"inventory">;
  variants?: (Tables<"product_variants"> & {
    inventory?: Tables<"inventory">;
    name?: string;
    sku?: string;
  })[];
  allergens?: string[];
  name?: string;
  title?: string;
  price?: number;
  base_price?: number;
  stock_quantity?: number;
  stock?: number;
  id?: string;
  product_id?: string;
  thumbnail_url?: string | null;
  is_draft?: boolean;
  image_urls?: string[];
  seller?: {
    full_name?: string;
    phone_number?: string;
  };
};

interface ProductFormData {
  title: string;
  description: string;
  base_price: number;
  category_id?: string;
  status: "active" | "inactive" | "archived";
  variants: {
    sku: string;
    price: number;
    inventory_quantity: number;
  }[];
  allergens: string[];
}

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("products");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<BundleWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [productAllergens, setProductAllergens] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [isAdmin] = useState<boolean>(false); // TODO: Replace with actual admin check
  const { toast } = useToast();
  const { options } = useFilterOptions();

  useEffect(() => {
    loadProducts();
  }, [filters]); // Reload products when filters change

  useEffect(() => {
    // load bundles for the seller as well
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const bs = await listBundles(user.id);
        setBundles(bs || []);
      } catch (err) {
        console.error("Error loading bundles:", err);
      }
    })();
  }, []);

  const loadProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("products")
        .select(`
          *,
          seller:user_profiles!seller_id(
            full_name,
            user_id
          )
        `);

      // Apply base filters
      if (!isAdmin) {
        query = query.eq('seller_id', user.id);
      }

      // Apply search and filter conditions
      if (filters.productName) {
        query = query.ilike('title', `%${filters.productName}%`);
      }

      if (filters.minPrice) {
        query = query.gte('base_price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('base_price', filters.maxPrice);
      }

      if (filters.minStock) {
        query = query.gte('stock_quantity', filters.minStock);
      }

      if (filters.maxStock) {
        query = query.lte('stock_quantity', filters.maxStock);
      }

      if (filters.selectedAllergen) {
        query = query.contains('allergens', [filters.selectedAllergen]);
      }

      if (filters.selectedVariant) {
        query = query.contains('variants', [{ name: filters.selectedVariant }]);
      }

      if (filters.sku) {
        query = query.contains('variants', [{ sku: filters.sku }]);
      }

      if (isAdmin && filters.sellerInfo) {
        query = query.textSearch('seller.full_name', filters.sellerInfo, {
          config: 'english'
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
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
  };

  const handleAddOrUpdate = async (formData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editProduct) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({
            title: formData.name,
            description: formData.description,
            base_price: formData.price,
            variants: formData.variants ?? productVariants,
            allergens: formData.allergens ?? productAllergens,
            updated_at: new Date().toISOString(),
          })
          .eq("product_id", editProduct.product_id ?? editProduct.id)
          .eq("seller_id", user.id);

        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        // Insert new product
        const { error } = await supabase
          .from("products")
          .insert({
            seller_id: user.id,
            title: formData.name,
            description: formData.description,
            base_price: formData.price,
            status: "active",
            variants: formData.variants ?? productVariants,
            allergens: formData.allergens ?? productAllergens,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Product added successfully" });
      }

      setIsOpen(false);
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("product_id", productId)
        .eq("seller_id", user.id);

      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully" });
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    // populate local variant/allergen state if available
    setProductVariants(product.variants ?? []);
    setProductAllergens(product.allergens ?? []);
    setIsOpen(true);
  };

  const handleRestock = async (productId?: string) => {
    if (!productId) return;
    const qtyStr = window.prompt("Enter restock quantity:", "10");
    if (!qtyStr) return;
    const add = parseInt(qtyStr, 10);
    if (isNaN(add) || add <= 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // fetch current product to compute new quantity
      const { data: current } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("product_id", productId)
        .eq("seller_id", user.id)
        .single();

  const currentQty = (current as any)?.stock_quantity ?? 0;
      const newQty = currentQty + add;

      // Attempt to update product.stock_quantity (some schemas use this field)
      let { error } = await supabase
        .from("products")
        .update(({ stock_quantity: newQty } as any))
        .eq("product_id", productId)
        .eq("seller_id", user.id);

      // If that fails or rows not updated, try updating inventory table for variants (best-effort)
      if (error) {
        console.warn("products.stock_quantity update failed, trying inventory update", error);
        const { error: invErr } = await supabase
          .from("inventory")
          .update({ quantity: newQty } as any)
          .eq("variant_id", productId);

        if (invErr) throw invErr;
      }

      if (error) throw error;
      toast({ title: "Success", description: `Restocked ${add} units` });
      loadProducts();
    } catch (err) {
      console.error("Error restocking:", err);
      toast({ title: "Error", description: "Failed to restock", variant: "destructive" });
    }
  };

  const handleDeleteBundle = async (bundleId?: string) => {
    if (!bundleId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bundles")
        .delete()
        .eq("id", bundleId)
        .eq("seller_id", user.id);

      if (error) throw error;
      toast({ title: "Success", description: "Bundle deleted" });
      const bs = await listBundles(user.id);
      setBundles(bs || []);
    } catch (err) {
      console.error("Error deleting bundle:", err);
      toast({ title: "Error", description: "Failed to delete bundle", variant: "destructive" });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseFloat(formData.get("price") as string),
      stock_quantity: parseInt(formData.get("stock_quantity") as string),
      image_urls: formData.get("image_url") as string,
      variants: productVariants,
      allergens: productAllergens,
    };
    handleAddOrUpdate(data);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your product inventory</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex gap-2">
            <DialogTrigger asChild>
              <Button onClick={() => { setEditProduct(null); setProductVariants([]); setProductAllergens([]); }} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>

            <Button variant="secondary" onClick={() => setBundleDialogOpen(true)} className="w-full sm:w-auto">
              <GiftIcon className="mr-2 h-4 w-4" />
              Create Bundle
            </Button>
          </div>
          <DialogContent className="w-11/12 max-w-2xl rounded-lg">
            <DialogHeader>
              <DialogTitle>{editProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editProduct ? "Update product details" : "Add a new product to your inventory"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editProduct?.name}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={editProduct?.price}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    min="0"
                    required
                    defaultValue={editProduct?.stock_quantity}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    defaultValue={editProduct?.description || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image_url">Product Image URL</Label>
                  <Input
                    id="image_url"
                    name="image_url"
                    defaultValue={editProduct?.image_urls?.[0]}
                  />
                </div>
                <div className="grid gap-4 pt-2">
                  <ProductVariantSection onVariantsChange={(v) => setProductVariants(v)} initialVariants={[]}/>
                  <AllergenSection onAllergensChange={(a) => setProductAllergens(a)} initialAllergens={[]} />
                </div>
              </div>
              <DialogFooter className="flex gap-2 flex-col-reverse sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editProduct ? "Save Changes" : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <BundleCreation open={bundleDialogOpen} onClose={() => setBundleDialogOpen(false)} />
      </div>

      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-10 text-sm"
                value={filters.productName || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, productName: e.target.value };
                  setFilters(newFilters);
                  loadProducts();
                }}
              />
            </div>
            <FilterDialog 
              isAdmin={isAdmin}
              options={options}
              initialFilters={filters}
              onFilterChange={setFilters}
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {loading ? (
            <div className="text-center p-4">Loading products...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {products.map((product) => (
                <Card key={product.product_id || product.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    <img
                      src={product.image_urls?.[0] || product.thumbnail_url || "/placeholder.svg"}
                      alt={product.title || product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm sm:text-lg">{product.title || product.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(product.product_id ?? product.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-primary mb-2">
                      ₹{((product.price ?? product.base_price) || 0).toFixed(2)}
                    </p>
                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      <p className="truncate">Stock: {product.stock_quantity ?? product.stock}</p>
                      {product.description && (
                        <p className="line-clamp-2">{product.description}</p>
                      )}
                    </div>
                    <div className="mt-3">
                      <Badge
                        variant={product.is_draft ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {product.is_draft ? "Draft" : "Published"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Bundles Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Bundles</h2>
        {bundles.length === 0 ? (
          <div className="text-sm text-muted-foreground">No bundles yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {bundles.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <img src={(b.thumbnail_url as string) || "/placeholder.svg"} alt={b.title} className="w-full h-full object-cover" />
                </div>
                <CardContent>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm sm:text-lg">{b.title}</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => window.alert(JSON.stringify(b.products.map((p:any)=>p.title || p.name)))}>
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteBundle(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <p>Original: ₹{(b.original_price ?? b.total_price ?? 0).toFixed(2)}</p>
                    <p className="font-semibold">Final: ₹{(b.final_price ?? b.discounted_price ?? 0).toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}