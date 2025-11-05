// Add Product Dialog Component
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload, Search } from "lucide-react";
import {
  searchGlobalProducts,
  searchBrands,
  createGlobalProduct,
  createBrand,
  getAllergens,
  createAllergen,
  uploadFile,
  getCategories,
  calculateHealthScore,
  generateSlug,
  getAllGlobalProducts,
  getAllBrands,
} from "@/lib/inventory-helpers";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { ProductForm, VariantForm, TransparencyForm } from "@/types/inventory.types";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface Brand {
  brand_id: string;
  name: string;
  logo_url?: string;
}

interface GlobalProduct {
  global_product_id: string;
  product_name: string;
  brand_id: string;
  brands?: { name: string };
}

interface Category {
  category_id: string;
  name: string;
}

interface Allergen {
  allergen_id: string;
  name: string;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingProduct?: unknown;
}

export default function AddProductDialog({
  open,
  onOpenChange,
  onSuccess,
  editingProduct,
}: AddProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  
  // Form state
  const [globalProductSearch, setGlobalProductSearch] = useState("");
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [selectedGlobalProduct, setSelectedGlobalProduct] = useState<GlobalProduct | null>(null);
  
  const [brandSearch, setBrandSearch] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [sellerTitle, setSellerTitle] = useState("");
  const [sellerDescription, setSellerDescription] = useState("");
  const [sellerIngredients, setSellerIngredients] = useState("");
  
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [newAllergenName, setNewAllergenName] = useState("");
  
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [returnPolicy, setReturnPolicy] = useState("");
  const [shippingInfo, setShippingInfo] = useState("");
  const [shelfLifeMonths, setShelfLifeMonths] = useState<number>(12);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  
  const [productImages, setProductImages] = useState<File[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<File[]>([]);
  const [trustCertificateFiles, setTrustCertificateFiles] = useState<File[]>([]);
  
  const [transparency, setTransparency] = useState<TransparencyForm>({
    third_party_tested: false,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const sellerId = await getAuthenticatedSellerId();
    
    if (!sellerId) {
      toast({ 
        title: "Seller profile not found", 
        description: "Please complete your seller onboarding first.",
        variant: "destructive" 
      });
      return;
    }
    
    setSellerId(sellerId);
    
    const [allergensData, categoriesData, allBrands, allProducts] = await Promise.all([
      getAllergens(),
      getCategories(),
      getAllBrands(),
      getAllGlobalProducts(),
    ]);
    
    setAllergens(allergensData || []);
    setCategories(categoriesData || []);
    setBrands(allBrands || []);
    setGlobalProducts(allProducts || []);
  }

  async function handleGlobalProductSearch(value: string) {
    setGlobalProductSearch(value);
    if (value.length < 2) {
      setGlobalProducts([]);
      return;
    }
    
    try {
      const results = await searchGlobalProducts(value);
      setGlobalProducts(results || []);
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  async function handleBrandSearch(value: string) {
    setBrandSearch(value);
    if (value.length < 2) {
      setBrands([]);
      return;
    }
    
    try {
      const results = await searchBrands(value);
      setBrands(results || []);
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  async function handleCreateGlobalProduct() {
    if (!globalProductSearch.trim()) {
      toast({ title: "Enter a product name", variant: "destructive" });
      return;
    }
    
    if (!selectedBrand) {
      toast({ title: "Select a brand first", variant: "destructive" });
      return;
    }
    
    try {
      const newProduct = await createGlobalProduct(
        globalProductSearch,
        selectedBrand.brand_id,
        selectedCategory
      );
      setSelectedGlobalProduct(newProduct);
      toast({ title: "Global product created successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error creating product",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function handleCreateBrand() {
    if (!brandSearch.trim()) {
      toast({ title: "Enter a brand name", variant: "destructive" });
      return;
    }
    
    try {
      const newBrand = await createBrand(brandSearch);
      setSelectedBrand(newBrand);
      toast({ title: "Brand created successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error creating brand",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function handleCreateAllergen() {
    if (!newAllergenName.trim()) return;
    
    try {
      const newAllergen = await createAllergen(newAllergenName);
      setAllergens([...allergens, newAllergen]);
      setSelectedAllergens([...selectedAllergens, newAllergen.allergen_id]);
      setNewAllergenName("");
      toast({ title: "Allergen added" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({ title: "Error adding allergen", description: errorMessage, variant: "destructive" });
    }
  }

  function addVariant() {
    setVariants([
      ...variants,
      {
        sku: `SKU-${Date.now()}`,
        variant_name: "",
        size: "",
        price: 0,
        original_price: 0,
        stock_quantity: 0,
        is_available: true,
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof VariantForm, value: string | number | boolean | Record<string, unknown> | null | undefined) {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  }

  async function handleSave() {
    if (!sellerId) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    if (!selectedGlobalProduct) {
      toast({ title: "Please select or create a global product", variant: "destructive" });
      return;
    }
    
    if (!selectedBrand) {
      toast({ title: "Please select or create a brand", variant: "destructive" });
      return;
    }

    if (variants.length === 0) {
      toast({ title: "Please add at least one variant", variant: "destructive" });
      return;
    }

    if (!sellerDescription.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }

    // Ensure global product exists with correct brand
    if (selectedGlobalProduct.brand_id !== selectedBrand.brand_id) {
      toast({ 
        title: "Brand mismatch", 
        description: "Please create a new product or select matching brand",
        variant: "destructive" 
      });
      return;
    }

    try {
      setLoading(true);

      // Upload files
      const uploadedImages = await Promise.all(
        productImages.map((file) => uploadFile(file, sellerId, "product-images"))
      );
      
      const uploadedCerts = await Promise.all(
        certificateFiles.map((file) => uploadFile(file, sellerId, "certificates"))
      );
      
      const uploadedTrustCerts = await Promise.all(
        trustCertificateFiles.map((file) => uploadFile(file, sellerId, "trust-certificates"))
      );

      // Calculate health score
      const healthScore = calculateHealthScore({
        certificateCount: uploadedCerts.length + uploadedTrustCerts.length,
        allergenCount: selectedAllergens.length,
        hasNutritionInfo: variants.some(v => v.nutritional_info && Object.keys(v.nutritional_info).length > 0),
        hasTransparencyData: !!transparency.manufacturing_info || !!transparency.testing_info,
        ingredientCount: sellerIngredients.split(",").length,
      });

      // Calculate price range from variants
      const prices = variants.map(v => v.price);
      const basePrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);

      // Create seller listing
      const listingSlug = generateSlug(`${selectedGlobalProduct.product_name}-${sellerId}`);
      
      console.log("Attempting to insert listing with seller_id:", sellerId);
      
      const { data: listing, error: listingError } = await supabase
        .from("seller_product_listings")
        .insert({
          global_product_id: selectedGlobalProduct.global_product_id,
          seller_id: sellerId,
          seller_title: sellerTitle || selectedGlobalProduct.product_name,
          seller_description: sellerDescription,
          seller_ingredients: sellerIngredients,
          health_score: healthScore,
          base_price: basePrice,
          total_stock_quantity: totalStock,
          shelf_life_months: shelfLifeMonths,
          return_policy: returnPolicy,
          shipping_info: shippingInfo,
          status: status,
          slug: listingSlug,
          review_count: 0,
          is_verified: false,
          published_at: status === "active" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (listingError) {
        console.error("❌ RLS ERROR on seller_product_listings:", listingError);
        throw new Error(`Failed to create listing: ${listingError.message} (Code: ${listingError.code})`);
      }

      // Insert variants
      for (const variant of variants) {
        const { error: variantError } = await supabase
          .from("listing_variants")
          .insert({
            listing_id: listing.listing_id,
            sku: variant.sku,
            variant_name: variant.variant_name,
            size: variant.size,
            flavor: variant.flavor,
            serving_count: variant.serving_count,
            price: variant.price,
            original_price: variant.original_price,
            stock_quantity: variant.stock_quantity,
            manufacture_date: variant.manufacture_date,
            batch_number: variant.batch_number,
            expiry_date: variant.expiry_date,
            nutritional_info: variant.nutritional_info || {},
            is_available: variant.is_available,
          });

        if (variantError) {
          console.error("❌ RLS ERROR on listing_variants:", variantError);
          throw new Error(`Failed to create variant: ${variantError.message} (Code: ${variantError.code})`);
        }
      }

      // Insert images
      for (let i = 0; i < uploadedImages.length; i++) {
        const { error: imageError } = await supabase.from("listing_images").insert({
          listing_id: listing.listing_id,
          image_url: uploadedImages[i],
          is_primary: i === 0,
          sort_order: i,
        });
        
        if (imageError) {
          console.error("❌ RLS ERROR on listing_images:", imageError);
          throw new Error(`Failed to upload image: ${imageError.message} (Code: ${imageError.code})`);
        }
      }

      // Insert transparency data
      if (transparency.manufacturing_info || transparency.testing_info) {
        const { error: transparencyError } = await supabase.from("product_transparency").insert({
          listing_id: listing.listing_id,
          ...transparency,
        });
        
        if (transparencyError) {
          console.error("❌ RLS ERROR on product_transparency:", transparencyError);
          throw new Error(`Failed to save transparency data: ${transparencyError.message} (Code: ${transparencyError.code})`);
        }
      }

      // Link allergens
      // Note: listing_allergens table needs to be added to database schema
      /*
      for (const allergenId of selectedAllergens) {
        await supabase.from("listing_allergens").insert({
          listing_id: listing.listing_id,
          allergen_id: allergenId,
        });
      }
      */

      toast({ title: `Product ${status === "draft" ? "saved as draft" : "published"} successfully` });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error saving product",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedGlobalProduct(null);
    setSelectedBrand(null);
    setSellerTitle("");
    setSellerDescription("");
    setSellerIngredients("");
    setSelectedAllergens([]);
    setVariants([]);
    setProductImages([]);
    setCertificateFiles([]);
    setTrustCertificateFiles([]);
    setStatus("draft");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="allergens">Allergens</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="transparency">Transparency</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            {/* Brand Selection */}
            <div className="space-y-2">
              <Label>Brand *</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedBrand?.brand_id || ""} 
                  onValueChange={(value) => {
                    const brand = brands.find(b => b.brand_id === value);
                    setSelectedBrand(brand || null);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.brand_id} value={brand.brand_id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    const newBrandName = prompt("Enter new brand name:");
                    if (newBrandName) {
                      setBrandSearch(newBrandName);
                      handleCreateBrand();
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedBrand && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedBrand.name}
                </p>
              )}
            </div>

            {/* Global Product Selection */}
            <div className="space-y-2">
              <Label>Global Product Name *</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedGlobalProduct?.global_product_id || ""} 
                  onValueChange={(value) => {
                    const product = globalProducts.find(p => p.global_product_id === value);
                    setSelectedGlobalProduct(product || null);
                  }}
                  disabled={!selectedBrand}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={selectedBrand ? "Select a product" : "Select brand first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {globalProducts
                      .filter(p => !selectedBrand || p.brand_id === selectedBrand.brand_id)
                      .map((product) => (
                        <SelectItem key={product.global_product_id} value={product.global_product_id}>
                          {product.product_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={!selectedBrand}
                  onClick={() => {
                    if (!selectedBrand) return;
                    const newProductName = prompt("Enter new product name:");
                    if (newProductName) {
                      setGlobalProductSearch(newProductName);
                      handleCreateGlobalProduct();
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedGlobalProduct && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedGlobalProduct.product_name}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seller Title */}
            <div className="space-y-2">
              <Label>Your Product Title</Label>
              <Input
                value={sellerTitle}
                onChange={(e) => setSellerTitle(e.target.value)}
                placeholder="Customize product title (optional)"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={sellerDescription}
                onChange={(e) => setSellerDescription(e.target.value)}
                rows={4}
                placeholder="Describe your product..."
              />
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <Label>Ingredients</Label>
              <Textarea
                value={sellerIngredients}
                onChange={(e) => setSellerIngredients(e.target.value)}
                rows={3}
                placeholder="List ingredients (comma separated)"
              />
            </div>

            {/* Policies */}
            <div className="space-y-2">
              <Label>Return Policy</Label>
              <Textarea
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Shipping Info</Label>
              <Textarea
                value={shippingInfo}
                onChange={(e) => setShippingInfo(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Shelf Life (months)</Label>
              <Input
                type="number"
                value={shelfLifeMonths}
                onChange={(e) => setShelfLifeMonths(Number(e.target.value))}
              />
            </div>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Product Variants *</Label>
              <Button size="sm" onClick={addVariant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Variant {index + 1}</h4>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeVariant(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, "sku", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Variant Name</Label>
                    <Input
                      value={variant.variant_name}
                      onChange={(e) => updateVariant(index, "variant_name", e.target.value)}
                      placeholder="e.g., 1kg Chocolate"
                    />
                  </div>
                  <div>
                    <Label>Size</Label>
                    <Input
                      value={variant.size}
                      onChange={(e) => updateVariant(index, "size", e.target.value)}
                      placeholder="e.g., 1kg"
                    />
                  </div>
                  <div>
                    <Label>Flavor</Label>
                    <Input
                      value={variant.flavor || ""}
                      onChange={(e) => updateVariant(index, "flavor", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Original Price (₹)</Label>
                    <Input
                      type="number"
                      value={variant.original_price}
                      onChange={(e) => updateVariant(index, "original_price", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Selling Price (₹)</Label>
                    <Input
                      type="number"
                      value={variant.price}
                      onChange={(e) => updateVariant(index, "price", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Stock Quantity</Label>
                    <Input
                      type="number"
                      value={variant.stock_quantity}
                      onChange={(e) => updateVariant(index, "stock_quantity", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Serving Count</Label>
                    <Input
                      type="number"
                      value={variant.serving_count || ""}
                      onChange={(e) => updateVariant(index, "serving_count", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Manufacture Date</Label>
                    <Input
                      type="date"
                      value={variant.manufacture_date || ""}
                      onChange={(e) => updateVariant(index, "manufacture_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={variant.expiry_date || ""}
                      onChange={(e) => updateVariant(index, "expiry_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Batch Number</Label>
                    <Input
                      value={variant.batch_number || ""}
                      onChange={(e) => updateVariant(index, "batch_number", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={variant.is_available}
                      onCheckedChange={(checked) => updateVariant(index, "is_available", checked)}
                    />
                    <Label>Available for Sale</Label>
                  </div>
                </div>

                {variant.original_price > 0 && variant.price > 0 && (
                  <div className="text-sm text-green-600">
                    Discount: {Math.round(((variant.original_price - variant.price) / variant.original_price) * 100)}%
                  </div>
                )}
              </div>
            ))}

            {variants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No variants added yet. Click "Add Variant" to create one.
              </p>
            )}
          </TabsContent>

          {/* Allergens Tab */}
          <TabsContent value="allergens" className="space-y-4">
            <Label>Select Allergens</Label>
            <div className="flex flex-wrap gap-2">
              {allergens.map((allergen) => (
                <Badge
                  key={allergen.allergen_id}
                  variant={selectedAllergens.includes(allergen.allergen_id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedAllergens(
                      selectedAllergens.includes(allergen.allergen_id)
                        ? selectedAllergens.filter((id) => id !== allergen.allergen_id)
                        : [...selectedAllergens, allergen.allergen_id]
                    );
                  }}
                >
                  {allergen.name}
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Add New Allergen</Label>
              <div className="flex gap-2">
                <Input
                  value={newAllergenName}
                  onChange={(e) => setNewAllergenName(e.target.value)}
                  placeholder="Enter allergen name"
                />
                <Button onClick={handleCreateAllergen}>Add</Button>
              </div>
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            <div className="space-y-2">
              <Label>Product Images</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setProductImages(Array.from(e.target.files || []))}
              />
              <p className="text-xs text-muted-foreground">
                {productImages.length} image(s) selected
              </p>
            </div>

            <div className="space-y-2">
              <Label>Certificates</Label>
              <Input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setCertificateFiles(Array.from(e.target.files || []))}
              />
              <p className="text-xs text-muted-foreground">
                {certificateFiles.length} certificate(s) selected
              </p>
            </div>

            <div className="space-y-2">
              <Label>Trust Certificates</Label>
              <Input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setTrustCertificateFiles(Array.from(e.target.files || []))}
              />
              <p className="text-xs text-muted-foreground">
                {trustCertificateFiles.length} trust certificate(s) selected
              </p>
            </div>
          </TabsContent>

          {/* Transparency Tab */}
          <TabsContent value="transparency" className="space-y-4">
            <div className="space-y-2">
              <Label>Manufacturing Info</Label>
              <Textarea
                value={transparency.manufacturing_info || ""}
                onChange={(e) =>
                  setTransparency({ ...transparency, manufacturing_info: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Testing Info</Label>
              <Textarea
                value={transparency.testing_info || ""}
                onChange={(e) =>
                  setTransparency({ ...transparency, testing_info: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Quality Assurance</Label>
              <Textarea
                value={transparency.quality_assurance || ""}
                onChange={(e) =>
                  setTransparency({ ...transparency, quality_assurance: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={transparency.third_party_tested}
                onCheckedChange={(checked) =>
                  setTransparency({ ...transparency, third_party_tested: !!checked })
                }
              />
              <Label>Third Party Tested</Label>
            </div>

            {transparency.third_party_tested && (
              <>
                <div className="space-y-2">
                  <Label>Testing Lab</Label>
                  <Input
                    value={transparency.testing_lab || ""}
                    onChange={(e) =>
                      setTransparency({ ...transparency, testing_lab: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Date</Label>
                  <Input
                    type="date"
                    value={transparency.test_date || ""}
                    onChange={(e) =>
                      setTransparency({ ...transparency, test_date: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatus("draft");
                handleSave();
              }}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => {
                setStatus("active");
                handleSave();
              }}
              disabled={loading}
            >
              Publish Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
