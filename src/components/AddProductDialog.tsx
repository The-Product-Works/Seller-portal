// Product Management Dialog Component
import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListingWithDetails } from "@/types/inventory.types";
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
import { X, Plus, Upload, Search, Image as ImageIcon } from "lucide-react";
import { 
  ingredientJsonToString, 
  ingredientStringToJson,
  allergenJsonToString,
  allergenStringToJson,
  isIngredientListValid,
  isAllergenInfoValid
} from "@/utils/jsonFieldHelpers";
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
  generateUniqueSlug,
  getAllGlobalProducts,
  getAllBrands,
  createCategory,
} from "@/lib/inventory-helpers";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { ProductForm, VariantForm, TransparencyForm } from "@/types/inventory.types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageGalleryManager, type ImageFile } from "@/components/ImageGalleryManager";
import { ProductPreviewModal } from "@/components/ProductPreviewModal";
import { ImageManager } from "@/components/ImageManager";
import { CommissionWarning } from "@/components/CommissionWarning";

// Type alias for Json type
type Json = Database["public"]["Tables"]["seller_product_listings"]["Row"]["seller_certifications"];

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
  editingProduct?: ListingWithDetails;
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
  const isEditing = Boolean(editingProduct);
  
  // Form state
  const [globalProductSearch, setGlobalProductSearch] = useState("");
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [selectedGlobalProduct, setSelectedGlobalProduct] = useState<GlobalProduct | null>(null);
  
  const [brandSearch, setBrandSearch] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  
  const [categorySearch, setCategorySearch] = useState("");
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
  const [returnDays, setReturnDays] = useState<number>(7);
  const [shippingInfo, setShippingInfo] = useState("");
  const [shelfLifeMonths, setShelfLifeMonths] = useState<number>(12);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [sellerCommission, setSellerCommission] = useState<number>(0); // Additional commission seller adds on top of 2%
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [showBrandInput, setShowBrandInput] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showProductInput, setShowProductInput] = useState(false);
  
  const [productImages, setProductImages] = useState<File[]>([]);
  const [galleryImages, setGalleryImages] = useState<ImageFile[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<File[]>([]);
  const [trustCertificateFiles, setTrustCertificateFiles] = useState<File[]>([]);
  
  const [showPreview, setShowPreview] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  
  interface CertificateData {
    name: string;
    certificate_type: "organic" | "fssai" | "iso" | "other";
    issued_date?: string;
    expiry_date?: string;
    issuing_body?: string;
    url?: string;
  }
  
  const [sellerCertifications, setSellerCertifications] = useState<CertificateData[]>([]);
  const [newCertificate, setNewCertificate] = useState<CertificateData>({
    name: "",
    certificate_type: "organic",
  });
  
  const [transparency, setTransparency] = useState<TransparencyForm>({
    third_party_tested: false,
  });

  useEffect(() => {
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingProduct && open) {
      loadEditingProduct(editingProduct as ListingWithDetails);
    } else {
      // Reset form when not editing
      setSellerTitle("");
      setSellerDescription("");
      // sellerIngredients removed - now per-variant
      setSelectedAllergens([]);
      setVariants([]);
      setReturnPolicy("");
      setReturnDays(7);
      setShippingInfo("");
      setShelfLifeMonths(12);
      setDiscountPercentage(0);
      setSellerCommission(0);
      setStatus("draft");
      setProductImages([]);
      setGalleryImages([]);
      setCertificateFiles([]);
      setTrustCertificateFiles([]);
      setSellerCertifications([]);
      setTransparency({ third_party_tested: false });
    }
  }, [editingProduct, open]);

  const loadInitialData = useCallback(async () => {
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
  }, [toast]);

  async function loadEditingProduct(product: ListingWithDetails) {
    if (!product?.global_products) return;
    
    // Set global product and brand with proper type handling
    setSelectedGlobalProduct({
      global_product_id: product.global_product_id,
      product_name: product.global_products.product_name,
      brand_id: product.global_products.brand_id
    });
    
    if (product.global_products.brands) {
      setSelectedBrand({
        brand_id: product.global_products.brand_id,
        name: product.global_products.brands.name,
        logo_url: product.global_products.brands.logo_url
      });
    }
    
    // Set basic details
    setSellerTitle(product.seller_title || "");
    setSellerDescription(product.seller_description || "");
    // seller_ingredients removed - now stored per-variant
    setShelfLifeMonths(product.shelf_life_months || 12);
    setReturnDays(product.return_days || 7);
    setDiscountPercentage(product.discount_percentage || 0);
    setStatus(product.status as "draft" | "active" || "draft");
    setReturnPolicy(product.return_policy || "");
    setShippingInfo(product.shipping_info || "");
    
    // Load existing images
    if (product.listing_images && product.listing_images.length > 0) {
      setGalleryImages(
        product.listing_images.map((img) => ({
          id: img.image_id,
          url: img.image_url,
          isPrimary: img.is_primary,
          altText: '',
          isExisting: true,
        }))
      );
    }
    
    // Set variants if they exist
    if (product.listing_variants) {
      setVariants(product.listing_variants.map(v => ({
        variant_id: v.variant_id,
        variant_name: v.variant_name,
        sku: v.sku,
        size: v.size,
        flavor: v.flavor,
        serving_count: v.serving_count,
        price: v.price,
        original_price: v.original_price,
        stock_quantity: v.stock_quantity,
        manufacture_date: v.manufacture_date,
        batch_number: v.batch_number,
        expiry_date: v.expiry_date,
        nutritional_info: v.nutritional_info || {},
        is_available: v.is_available,
        // P0 Fields
        product_image_url: v.product_image_url || null,
        ingredient_image_url: v.ingredient_image_url || null,
        nutrient_table_image_url: v.nutrient_table_image_url || null,
        fssai_label_image_url: v.fssai_label_image_url || null,
        ingredient_list: ingredientJsonToString(v.ingredient_list) || "",
        fssai_number: v.fssai_number || "",
        fssai_expiry_date: v.fssai_expiry_date || null,
        nutrient_breakdown: v.nutrient_breakdown || {
          servingSize: "100g",
          energyKcal: 0,
          macronutrients: {
            protein: { value: 0, unit: "g" },
            carbohydrate: { value: 0, unit: "g", ofWhichSugars: 0 },
            fat: { value: 0, unit: "g", saturated: 0, trans: 0 },
          },
        },
        accuracy_attested: v.accuracy_attested || false,
        attested_by: v.attested_by || null,
        attested_at: v.attested_at || null,
        // File upload states (null for existing data)
        productImageFile: null,
        ingredientImageFile: null,
        nutrientImageFile: null,
        fssaiImageFile: null,
      })));
    }
  }

  async function handleGlobalProductSearch(value: string) {
    setGlobalProductSearch(value);
    if (!sellerId) {
      toast({
        title: "Not authenticated",
        description: "Please ensure you are logged in as a seller",
        variant: "destructive"
      });
      return;
    }

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
    const productName = globalProductSearch.trim();
    
    if (!productName) {
      toast({
        title: "Product name required",
        description: "Please enter a product name",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Creating global product with:", {
        productName: productName,
        brandId: selectedBrand?.brand_id || "",
        categoryId: selectedCategory
      });
      
      const newProduct = await createGlobalProduct(
        productName,
        selectedBrand?.brand_id || "",
        selectedCategory
      );
      
      console.log("Global product created successfully:", newProduct);
      
      // Format the response to match GlobalProduct interface with brand data
      const formattedProduct: GlobalProduct = {
        global_product_id: newProduct.global_product_id,
        product_name: newProduct.product_name,
        brand_id: newProduct.brand_id,
        brands: selectedBrand ? { name: selectedBrand.name } : { name: "Generic" },
      };
      
      // Set as selected and add to the list for display (only if it's not already there)
      setSelectedGlobalProduct(formattedProduct);
      const existsInList = globalProducts.some(p => p.global_product_id === formattedProduct.global_product_id);
      if (!existsInList) {
        setGlobalProducts([formattedProduct, ...globalProducts]);
      }
      setGlobalProductSearch(""); // Clear search field
      setShowProductInput(false); // Hide input
      
      // Check if this was an existing product or newly created
      const isExisting = globalProducts.some(p => 
        p.product_name === newProduct.product_name && p.brand_id === newProduct.brand_id
      );
      
      if (isExisting) {
        toast({ 
          title: "Product found", 
          description: "Selected existing global product instead of creating duplicate" 
        });
      } else {
        toast({ title: "Global product created successfully" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Global product creation failed:", error);
      toast({
        title: "Error creating product",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function handleCreateBrand() {
    const brandName = brandSearch.trim();
    
    if (!brandName) {
      toast({
        title: "Brand name required",
        description: "Please enter a brand name",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Creating brand with name:", brandName);
      const newBrand = await createBrand(brandName);
      console.log("Brand created successfully:", newBrand);
      
      setSelectedBrand(newBrand);
      // Add to brands list so it appears in dropdown
      setBrands([newBrand, ...brands]);
      setBrandSearch(""); // Clear search field
      setShowBrandInput(false); // Hide input
      toast({ title: "Brand created successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Brand creation failed:", error);
      toast({
        title: "Error creating brand",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function handleCreateCategory() {
    const categoryName = categorySearch.trim();
    
    if (!categoryName) {
      toast({
        title: "Category name required",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Creating category with name:", categoryName);
      const newCategory = await createCategory(categoryName);
      console.log("Category created successfully:", newCategory);
      
      setSelectedCategory(newCategory.category_id);
      // Add to categories list so it appears in dropdown
      setCategories([newCategory, ...categories]);
      setCategorySearch(""); // Clear search field
      setShowCategoryInput(false); // Hide input
      toast({ title: "Category created successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Category creation failed:", error);
      toast({
        title: "Error creating category",
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
        
        // P0 Fields
        ingredient_list: "",
        fssai_number: "",
        accuracy_attested: false,
        nutrient_breakdown: {
          servingSize: "100g",
          energyKcal: 0,
          macronutrients: {
            protein: { value: 0, unit: "g" },
            carbohydrate: { value: 0, unit: "g", ofWhichSugars: 0 },
            fat: { value: 0, unit: "g", saturated: 0, trans: 0 },
          },
        },
        productImageFile: null,
        ingredientImageFile: null,
        nutrientImageFile: null,
        fssaiImageFile: null,
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof VariantForm, value: string | number | boolean | Record<string, unknown> | null | undefined) {
    console.log(`Updating variant ${index}, field: ${String(field)}, value:`, value);
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    console.log(`Updated variant ${index}:`, updated[index]);
    setVariants(updated);
  }

  async function handleSave(overrideStatus?: "draft" | "active") {
    const finalStatus = overrideStatus || status;
    console.log("handleSave called with status:", finalStatus, "override:", overrideStatus, "state:", status);
    if (!sellerId) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    if (!sellerDescription.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }

    // Validate brand-product match only if both are selected
    if (selectedGlobalProduct && selectedBrand && selectedGlobalProduct.brand_id !== selectedBrand.brand_id) {
      toast({ 
        title: "Brand mismatch", 
        description: "Please create a new product or select matching brand",
        variant: "destructive" 
      });
      return;
    }

    try {
      setLoading(true);

      // For new products, upload all files. For editing, only upload new files.
      const filesToUpload = isEditing 
        ? galleryImages.filter(img => !img.isExisting && img.file).map(img => img.file!)
        : productImages;

      // Upload files
      const uploadedImages = await Promise.all(
        filesToUpload.map((file) => uploadFile(file, sellerId, "product-images"))
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
        ingredientCount: variants.length > 0 ? 1 : 0, // Changed: ingredients now per-variant
      });

      // Calculate price range from variants or use a default base price
      let basePrice = 0;
      let highestPrice = 0;
      let totalStock = 0;
      
      if (variants.length > 0) {
        const prices = variants.map(v => v.price);
        basePrice = Math.min(...prices);
        highestPrice = Math.max(...prices);
        totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
      } else {
        // Default values when no variants are provided
        basePrice = 0;
        totalStock = 0;
      }

      // Handle slug for new products only
      // Use seller_title as fallback if no global product selected
      const productTitle = sellerTitle || selectedGlobalProduct?.product_name || "Untitled Product";
      const listingSlug = !isEditing ? await generateUniqueSlug(productTitle, sellerId) : undefined;
      
      console.log(`=== ${isEditing ? "Updating" : "Creating"} Product Listing ===`);
      console.log("Operation:", isEditing ? "Update" : "Create");
      
      // Note: Duplicate product names are allowed since different sellers can sell the same product
      // and even one seller can have multiple listings of the same product with different variants/prices

      console.log("Seller ID:", sellerId);
      console.log("Product Title:", productTitle);
      console.log("Global Product ID:", selectedGlobalProduct?.global_product_id);
      
      // Auto-create global product if not selected
      let globalProductId = selectedGlobalProduct?.global_product_id;
      if (!globalProductId && !isEditing) {
        try {
          // Auto-create a global product with the seller's title
          const autoProduct = await createGlobalProduct(
            productTitle,
            selectedBrand?.brand_id || "",
            selectedCategory
          );
          globalProductId = autoProduct.global_product_id;
          console.log("Auto-created global product:", globalProductId);
        } catch (err) {
          console.error("Failed to auto-create global product:", err);
          // If auto-creation fails, throw error - we need a global product ID
          throw new Error("Failed to create product entry. Please try again.");
        }
      }
      
      // For editing, keep existing global product ID
      if (isEditing && editingProduct) {
        globalProductId = editingProduct.global_product_id;
      }
      
      let listing;
      let listingError;

      if (isEditing && editingProduct) {
        console.log("Updating existing product:", editingProduct.listing_id);
        
        // First verify the product belongs to the seller
        const { data: verifyProduct } = await supabase
          .from("seller_product_listings")
          .select("listing_id")
          .eq("listing_id", editingProduct.listing_id)
          .eq("seller_id", sellerId)
          .single();
          
        if (!verifyProduct) {
          throw new Error("You don't have permission to edit this product");
        }
        
        console.log("About to update database with status:", finalStatus);
        const { data, error } = await supabase
          .from("seller_product_listings")
          .update({
            seller_title: sellerTitle || productTitle,
            seller_description: sellerDescription,
            health_score: healthScore,
            base_price: basePrice,
            total_stock_quantity: totalStock,
            shelf_life_months: shelfLifeMonths,
            return_days: returnDays,
            return_policy: returnPolicy,
            discount_percentage: discountPercentage,
            shipping_info: shippingInfo,
            seller_certifications: (sellerCertifications.length > 0 ? sellerCertifications : null) as unknown as Json,
            status: finalStatus,
            published_at: finalStatus === "active" ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq("listing_id", editingProduct.listing_id)
          .eq("seller_id", sellerId) // Extra safety check
          .select()
          .single();
          
        listing = data;
        listingError = error;
      } else {
        console.log("About to create new product with status:", finalStatus);
        const { data, error } = await supabase
          .from("seller_product_listings")
          .insert({
            global_product_id: globalProductId,
            seller_id: sellerId,
            seller_title: sellerTitle || productTitle,
            seller_description: sellerDescription,
            health_score: healthScore,
            base_price: basePrice,
            total_stock_quantity: totalStock,
            shelf_life_months: shelfLifeMonths,
            return_days: returnDays,
            return_policy: returnPolicy,
            discount_percentage: discountPercentage,
            shipping_info: shippingInfo,
            seller_certifications: (sellerCertifications.length > 0 ? sellerCertifications : null) as unknown as Json,
            status: finalStatus,
            slug: listingSlug,
            review_count: 0,
            is_verified: false,
            published_at: finalStatus === "active" ? new Date().toISOString() : null,
          })
          .select()
          .single();
          
        listing = data;
        listingError = error;
      }

      if (listingError) {
        console.error("❌ Error with product listing:", listingError);
        console.error("Error Code:", listingError.code);
        console.error("Error Details:", listingError.details);
        console.error("Error Hint:", listingError.hint);
        
        // Provide user-friendly error messages
        if (listingError.code === '23503') {
          if (listingError.message.includes('seller_payout_items')) {
            throw new Error("Cannot edit this product because it has associated payouts. Please contact support or apply the database fix in URGENT_FIX_RUN_IN_SUPABASE.sql");
          } else {
            throw new Error("Invalid reference constraint. Please refresh and try again.");
          }
        } else {
          throw new Error(`Failed to ${isEditing ? 'update' : 'create'} listing: ${listingError.message}`);
        }
      }

      // Handle variants
      if (variants.length > 0) {
        if (isEditing) {
          // Get existing variants to preserve data before deleting
          const { data: existingVariants } = await supabase
            .from("listing_variants")
            .select("variant_id, nutritional_info, ingredient_list, allergen_info")
            .eq("listing_id", listing.listing_id);

          // Delete existing variants first
          const { error: deleteError } = await supabase
            .from("listing_variants")
            .delete()
            .eq("listing_id", listing.listing_id);

          if (deleteError) {
            console.error("❌ Error deleting existing variants:", deleteError);
            throw new Error(`Failed to update variants: ${deleteError.message}`);
          }
        }

        // Insert all variants (both for new products and updates)
        for (const variant of variants) {
          // Upload P0 images first if they exist
          let productImageUrl = variant.product_image_url;
          let ingredientImageUrl = variant.ingredient_image_url;
          let nutrientImageUrl = variant.nutrient_table_image_url;
          let fssaiImageUrl = variant.fssai_label_image_url;

          // Create a temporary variant ID for image paths
          const tempVariantId = variant.variant_id || `temp-${Date.now()}-${Math.random()}`;

          if (variant.productImageFile) {
            const filePath = `${sellerId}/${listing.listing_id}/${tempVariantId}/product.jpg`;
            const { data, error } = await supabase.storage
              .from('products')
              .upload(filePath, variant.productImageFile, { upsert: true });
            
            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);
              productImageUrl = publicUrl;
            }
          }

          if (variant.ingredientImageFile) {
            const filePath = `${sellerId}/${listing.listing_id}/${tempVariantId}/ingredient.jpg`;
            const { data, error } = await supabase.storage
              .from('products')
              .upload(filePath, variant.ingredientImageFile, { upsert: true });
            
            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);
              ingredientImageUrl = publicUrl;
            }
          }

          if (variant.nutrientImageFile) {
            const filePath = `${sellerId}/${listing.listing_id}/${tempVariantId}/nutrient.jpg`;
            const { data, error } = await supabase.storage
              .from('products')
              .upload(filePath, variant.nutrientImageFile, { upsert: true });
            
            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);
              nutrientImageUrl = publicUrl;
            }
          }

          if (variant.fssaiImageFile) {
            const filePath = `${sellerId}/${listing.listing_id}/${tempVariantId}/fssai.jpg`;
            const { data, error } = await supabase.storage
              .from('products')
              .upload(filePath, variant.fssaiImageFile, { upsert: true });
            
            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);
              fssaiImageUrl = publicUrl;
            }
          }

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
              nutritional_info: variant.nutritional_info && Object.keys(variant.nutritional_info).length > 0 
                ? { servingSize: "100g", ...variant.nutritional_info } 
                : null,
              is_available: variant.is_available,
              
              // P0 Fields
              product_image_url: productImageUrl,
              ingredient_image_url: ingredientImageUrl,
              nutrient_table_image_url: nutrientImageUrl,
              fssai_label_image_url: fssaiImageUrl,
              ingredient_list: ingredientStringToJson(variant.ingredient_list as string),
              allergen_info: allergenStringToJson(variant.allergen_info as string),
              fssai_number: variant.fssai_number,
              fssai_expiry_date: variant.fssai_expiry_date,
              nutrient_breakdown: {
                servingSize: "100g",
                energyKcal: variant.nutritional_info?.calories || 0,
                energyKj: Math.round((variant.nutritional_info?.calories || 0) * 4.184),
                macronutrients: {
                  protein: { value: variant.nutritional_info?.protein || 0, unit: "g" },
                  carbohydrate: { value: variant.nutritional_info?.carbohydrates || 0, unit: "g", ofWhichSugars: 0 },
                  fat: { 
                    value: variant.nutritional_info?.fat || 0, 
                    unit: "g", 
                    saturated: variant.nutritional_info?.saturated_fat || 0, 
                    trans: 0 
                  }
                },
                micronutrients: {
                  sodium: { value: variant.nutritional_info?.sodium || 0, unit: "mg" },
                  calcium: { value: variant.nutritional_info?.calcium || 0, unit: "mg" },
                  iron: { value: variant.nutritional_info?.iron || 0, unit: "mg" },
                  zinc: { value: variant.nutritional_info?.zinc || 0, unit: "mg" },
                  potassium: { value: variant.nutritional_info?.potassium || 0, unit: "mg" },
                  magnesium: { value: variant.nutritional_info?.magnesium || 0, unit: "mg" },
                  vitaminA: { value: variant.nutritional_info?.vitamin_a || 0, unit: "mcg" },
                  vitaminC: { value: variant.nutritional_info?.vitamin_c || 0, unit: "mg" },
                  vitaminD: { value: variant.nutritional_info?.vitamin_d || 0, unit: "mcg" }
                },
                fiber: { value: variant.nutritional_info?.fiber || 0, unit: "g" },
                cholesterol: { value: 0, unit: "mg" }
              },
              accuracy_attested: variant.accuracy_attested || false,
              attested_by: variant.attested_by || sellerId,
              attested_at: variant.attested_at || (variant.accuracy_attested ? new Date().toISOString() : null),
            });

          if (variantError) {
            console.error("❌ RLS ERROR on listing_variants:", variantError);
            throw new Error(`Failed to ${isEditing ? 'update' : 'create'} variant: ${variantError.message}`);
          }
        }
      }

      // Handle images
      if (isEditing) {
        // Get the current gallery images to understand what needs to be updated
        const existingImages = galleryImages.filter(img => img.isExisting && img.url);
        const newImages = galleryImages.filter(img => !img.isExisting && img.file);
        
        // Only delete images that are no longer in the gallery (user removed them)
        const { data: currentImages } = await supabase
          .from("listing_images")
          .select("image_id, image_url")
          .eq("listing_id", listing.listing_id);

        if (currentImages) {
          const existingImageUrls = existingImages.map(img => img.url);
          const imagesToDelete = currentImages.filter(img => !existingImageUrls.includes(img.image_url));
          
          if (imagesToDelete.length > 0) {
            const imageIdsToDelete = imagesToDelete.map(img => img.image_id);
            const { error: deleteImageError } = await supabase
              .from("listing_images")
              .delete()
              .in("image_id", imageIdsToDelete);

            if (deleteImageError) {
              console.error("❌ Error deleting removed images:", deleteImageError);
              throw new Error(`Failed to update images: ${deleteImageError.message}`);
            }
          }
        }

        // Insert new images (uploadedImages contains only newly uploaded files)
        for (let i = 0; i < uploadedImages.length; i++) {
          const { error: imageError } = await supabase.from("listing_images").insert({
            listing_id: listing.listing_id,
            image_url: uploadedImages[i],
            is_primary: false, // We'll update primary status separately
            sort_order: existingImages.length + i,
          });
          
          if (imageError) {
            console.error("❌ RLS ERROR on listing_images:", imageError);
            throw new Error(`Failed to upload new image: ${imageError.message}`);
          }
        }

        // Update primary image status for all images
        const allImages = [...existingImages, ...newImages];
        const primaryImage = allImages.find(img => img.isPrimary);
        
        if (primaryImage) {
          // Reset all images to non-primary first
          await supabase
            .from("listing_images")
            .update({ is_primary: false })
            .eq("listing_id", listing.listing_id);
          
          // Set the primary image
          let primaryImageUrl = primaryImage.url;
          if (!primaryImageUrl && primaryImage.file) {
            // This is a new image, find its uploaded URL
            const newImageIndex = newImages.findIndex(img => img.id === primaryImage.id);
            if (newImageIndex !== -1 && newImageIndex < uploadedImages.length) {
              primaryImageUrl = uploadedImages[newImageIndex];
            }
          }
          
          if (primaryImageUrl) {
            await supabase
              .from("listing_images")
              .update({ is_primary: true })
              .eq("listing_id", listing.listing_id)
              .eq("image_url", primaryImageUrl);
          }
        }
      } else {
        // For new products, handle all images normally
        // Insert new images
        for (let i = 0; i < uploadedImages.length; i++) {
          const { error: imageError } = await supabase.from("listing_images").insert({
            listing_id: listing.listing_id,
            image_url: uploadedImages[i],
            is_primary: i === 0,
            sort_order: i,
          });
          
          if (imageError) {
            console.error("❌ RLS ERROR on listing_images:", imageError);
            throw new Error(`Failed to upload image: ${imageError.message}`);
          }
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

      // Update the component state to reflect the new status
      setStatus(finalStatus);
      
      const action = isEditing 
        ? (finalStatus === "active" ? "updated and published" : "updated and saved as draft")
        : (finalStatus === "draft" ? "saved as draft" : "published");
      toast({ 
        title: `Product ${action} successfully`,
        description: finalStatus === "active" ? "Your product is now live in the marketplace" : "You can publish this product later"
      });
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
    // sellerIngredients removed - now per-variant
    setSelectedAllergens([]);
    setVariants([]);
    setReturnPolicy("");
    setReturnDays(7);
    setShippingInfo("");
    setShelfLifeMonths(12);
    setDiscountPercentage(0);
    setSellerCommission(0);
    setProductImages([]);
    setGalleryImages([]);
    setCertificateFiles([]);
    setTrustCertificateFiles([]);
    setStatus("draft");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? 'Edit Product' : 'Add Product'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="allergens">Allergens</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="transparency">Transparency</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            {/* Brand Selection */}
            <div className="space-y-2">
              <Label>Brand Name *</Label>
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
                  onClick={() => setShowBrandInput(!showBrandInput)}
                  title="Add new brand"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showBrandInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Enter brand name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateBrand();
                      }
                    }}
                  />
                  <Button onClick={handleCreateBrand} size="sm">
                    Add
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowBrandInput(false);
                      setBrandSearch("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {selectedBrand && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedBrand.name}
                </p>
              )}
            </div>

            {/* Global Product Selection */}
            <div className="space-y-2">
              <Label>Global Product Name <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedGlobalProduct?.global_product_id || ""} 
                  onValueChange={(value) => {
                    const product = globalProducts.find(p => p.global_product_id === value);
                    setSelectedGlobalProduct(product || null);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {globalProducts
                      .filter(p => !selectedBrand || p.brand_id === selectedBrand.brand_id || p.brand_id === "")
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
                  onClick={() => setShowProductInput(!showProductInput)}
                  title="Add new product"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showProductInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={globalProductSearch}
                    onChange={(e) => setGlobalProductSearch(e.target.value)}
                    placeholder="Enter product name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateGlobalProduct();
                      }
                    }}
                  />
                  <Button onClick={handleCreateGlobalProduct} size="sm">
                    Add
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowProductInput(false);
                      setGlobalProductSearch("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {selectedGlobalProduct && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedGlobalProduct.product_name}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1">
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
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowCategoryInput(!showCategoryInput)}
                  title="Add new category"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showCategoryInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Enter category name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCategory();
                      }
                    }}
                  />
                  <Button onClick={handleCreateCategory} size="sm">
                    Add
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowCategoryInput(false);
                      setCategorySearch("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
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

            {/* Ingredients removed - now per-variant in P0 section */}

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Return Days *</Label>
                <Input
                  type="number"
                  value={returnDays}
                  onChange={(e) => setReturnDays(Number(e.target.value))}
                  min="0"
                  placeholder="e.g., 7"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Percentage (%)</Label>
                <Input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                  min="0"
                  max="100"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Additional Commission (%) - ON TOP of 2%</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={sellerCommission}
                    onChange={(e) => setSellerCommission(Math.max(0, Number(e.target.value)))}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    className="flex-1"
                  />
                  <div className="flex items-center px-3 bg-blue-50 border border-blue-200 rounded text-sm font-medium text-blue-700 whitespace-nowrap">
                    Total: {(2 + sellerCommission).toFixed(1)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform takes 2% + your additional {sellerCommission.toFixed(1)}% = {(2 + sellerCommission).toFixed(1)}% total
                </p>
              </div>
            </div>

            {/* Commission Info in Basic Tab */}
            <CommissionWarning 
              mrp={100}
              showInlineCalculator={false}
              variant="info"
              sellerCommission={sellerCommission}
            />
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-4">
            {/* Commission Warning at Top */}
            <CommissionWarning 
              mrp={variants[0]?.price || 0}
              onMrpChange={(price) => {
                if (variants[0]) {
                  updateVariant(0, "price", price);
                }
              }}
              sellerCommission={sellerCommission}
              showInlineCalculator={true}
              showTransactionCalculator={true}
              variant="warning"
            />

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

                {/* Nutritional Info */}
                <div className="border-t pt-3">
                  <Label className="font-semibold mb-2 block">Nutritional Information <span className="text-red-500">*</span></Label>
                  
                  {/* Macronutrients */}
                  <div className="mb-3">
                    <Label className="text-sm font-medium mb-2 block">Macronutrients</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Calories (kcal)</Label>
                        <Input
                          type="number"
                          placeholder="250"
                          value={typeof variant.nutritional_info?.calories === 'number' ? variant.nutritional_info.calories : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, calories: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Protein (g)</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={typeof variant.nutritional_info?.protein === 'number' ? variant.nutritional_info.protein : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, protein: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Carbs (g)</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={typeof variant.nutritional_info?.carbohydrates === 'number' ? variant.nutritional_info.carbohydrates : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, carbohydrates: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total Fat (g)</Label>
                        <Input
                          type="number"
                          placeholder="5"
                          value={typeof variant.nutritional_info?.fat === 'number' ? variant.nutritional_info.fat : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, fat: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Saturated Fat (g)</Label>
                        <Input
                          type="number"
                          placeholder="2"
                          value={typeof variant.nutritional_info?.saturated_fat === 'number' ? variant.nutritional_info.saturated_fat : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, saturated_fat: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Fiber (g)</Label>
                        <Input
                          type="number"
                          placeholder="5"
                          value={typeof variant.nutritional_info?.fiber === 'number' ? variant.nutritional_info.fiber : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, fiber: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Micronutrients */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Micronutrients (Minerals & Vitamins)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Sodium (mg)</Label>
                        <Input
                          type="number"
                          placeholder="150"
                          value={typeof variant.nutritional_info?.sodium === 'number' ? variant.nutritional_info.sodium : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, sodium: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Calcium (mg)</Label>
                        <Input
                          type="number"
                          placeholder="120"
                          value={typeof variant.nutritional_info?.calcium === 'number' ? variant.nutritional_info.calcium : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, calcium: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Iron (mg)</Label>
                        <Input
                          type="number"
                          placeholder="2.5"
                          step="0.1"
                          value={typeof variant.nutritional_info?.iron === 'number' ? variant.nutritional_info.iron : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, iron: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Zinc (mg)</Label>
                        <Input
                          type="number"
                          placeholder="1.2"
                          step="0.1"
                          value={typeof variant.nutritional_info?.zinc === 'number' ? variant.nutritional_info.zinc : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, zinc: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Potassium (mg)</Label>
                        <Input
                          type="number"
                          placeholder="200"
                          value={typeof variant.nutritional_info?.potassium === 'number' ? variant.nutritional_info.potassium : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, potassium: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Magnesium (mg)</Label>
                        <Input
                          type="number"
                          placeholder="50"
                          value={typeof variant.nutritional_info?.magnesium === 'number' ? variant.nutritional_info.magnesium : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, magnesium: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Vitamin A (mcg)</Label>
                        <Input
                          type="number"
                          placeholder="800"
                          value={typeof variant.nutritional_info?.vitamin_a === 'number' ? variant.nutritional_info.vitamin_a : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, vitamin_a: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Vitamin C (mg)</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={typeof variant.nutritional_info?.vitamin_c === 'number' ? variant.nutritional_info.vitamin_c : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, vitamin_c: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Vitamin D (mcg)</Label>
                        <Input
                          type="number"
                          placeholder="5"
                          step="0.1"
                          value={typeof variant.nutritional_info?.vitamin_d === 'number' ? variant.nutritional_info.vitamin_d : ""}
                          onChange={(e) => {
                            const newNutrInfo = { ...variant.nutritional_info, vitamin_d: Number(e.target.value) || 0 };
                            updateVariant(index, "nutritional_info", newNutrInfo);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* P0 Compliance Section */}
                <div className="border-t pt-3 bg-blue-50 p-3 rounded">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">P0 Required</Badge>
                    <Label className="font-semibold">Mandatory Compliance Fields</Label>
                  </div>
                  
                  {/* 4 P0 Images */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Product Image */}
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        Product Photo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateVariant(index, "productImageFile", file);
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateVariant(index, "product_image_url", url);
                          }
                        }}
                        className="text-sm"
                      />
                      {variant.product_image_url && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-green-600 font-medium">✓ Image uploaded</div>
                          <img 
                            src={variant.product_image_url as string} 
                            alt="Product preview" 
                            className="w-20 h-20 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>

                    {/* Ingredient Label Image */}
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        Ingredient Label <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateVariant(index, "ingredientImageFile", file);
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateVariant(index, "ingredient_image_url", url);
                          }
                        }}
                        className="text-sm"
                      />
                      {variant.ingredient_image_url && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-green-600 font-medium">✓ Image uploaded</div>
                          <img 
                            src={variant.ingredient_image_url as string} 
                            alt="Ingredient label preview" 
                            className="w-20 h-20 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>

                    {/* Nutrition Facts Image */}
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        Nutrition Facts <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateVariant(index, "nutrientImageFile", file);
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateVariant(index, "nutrient_table_image_url", url);
                          }
                        }}
                        className="text-sm"
                      />
                      {variant.nutrient_table_image_url && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-green-600 font-medium">✓ Image uploaded</div>
                          <img 
                            src={variant.nutrient_table_image_url as string} 
                            alt="Nutrition facts preview" 
                            className="w-20 h-20 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>

                    {/* FSSAI Certificate Image */}
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        FSSAI Certificate <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateVariant(index, "fssaiImageFile", file);
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateVariant(index, "fssai_label_image_url", url);
                          }
                        }}
                        className="text-sm"
                      />
                      {variant.fssai_label_image_url && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-green-600 font-medium">✓ Image uploaded</div>
                          <img 
                            src={variant.fssai_label_image_url as string} 
                            alt="FSSAI certificate preview" 
                            className="w-20 h-20 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FSSAI Number & Dates */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        FSSAI Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="14 digit number"
                        maxLength={14}
                        value={variant.fssai_number || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          updateVariant(index, "fssai_number", value);
                        }}
                        className="text-sm"
                      />
                      {variant.fssai_number && variant.fssai_number.length !== 14 && (
                        <div className="mt-1 text-xs text-red-500">Must be 14 digits</div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm">FSSAI Expiry Date</Label>
                      <Input
                        type="date"
                        value={variant.fssai_expiry_date || ""}
                        onChange={(e) => updateVariant(index, "fssai_expiry_date", e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        Allergen Info <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="NA if none"
                        value={variant.allergen_info || "NA"}
                        onChange={(e) => updateVariant(index, "allergen_info", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Ingredient List */}
                  <div className="mb-3">
                    <Label className="text-sm flex items-center gap-1">
                      Complete Ingredient List <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="List all ingredients in descending order by weight..."
                      value={typeof variant.ingredient_list === 'string' ? variant.ingredient_list : ingredientJsonToString(variant.ingredient_list)}
                      onChange={(e) => updateVariant(index, "ingredient_list", e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    {!isIngredientListValid(variant.ingredient_list) && (
                      <div className="mt-1 text-xs text-red-500">Minimum 10 characters required</div>
                    )}
                  </div>

                  {/* Accuracy Attestation */}
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <Checkbox
                      checked={Boolean(variant.accuracy_attested)}
                      onCheckedChange={(checked) => {
                        console.log("Attestation checkbox clicked:", checked, "for variant", index);
                        const isChecked = Boolean(checked);
                        console.log("Setting accuracy_attested to:", isChecked);
                        
                        const updated = [...variants];
                        updated[index] = { 
                          ...updated[index], 
                          accuracy_attested: isChecked,
                          attested_by: isChecked ? (sellerId || "seller") : null,
                          attested_at: isChecked ? new Date().toISOString() : null
                        };
                        setVariants(updated);
                        console.log("Updated variant:", updated[index]);
                      }}
                      id={`attestation-${index}`}
                    />
                    <Label 
                      htmlFor={`attestation-${index}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      ✓ I confirm that all ingredient and nutrition information is accurate
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                  </div>

                  {/* P0 Status Indicator */}
                  <div className="mt-3">
                    {variant.product_image_url && 
                     variant.ingredient_image_url && 
                     variant.nutrient_table_image_url && 
                     variant.fssai_label_image_url && 
                     variant.fssai_number?.length === 14 &&
                     isIngredientListValid(variant.ingredient_list) &&
                     variant.nutritional_info?.calories &&
                     variant.nutritional_info?.calories > 0 &&
                     Boolean(variant.accuracy_attested) ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-300 rounded">
                        <Badge variant="default" className="bg-green-600">✓ P0 Compliant</Badge>
                        <span className="text-xs text-green-700 font-medium">
                          All mandatory compliance fields completed
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 bg-orange-50 border border-orange-300 rounded">
                        <p className="text-xs text-orange-700 font-medium">⚠ Complete all P0 fields to enable compliance:</p>
                        <ul className="text-xs text-orange-600 mt-1 ml-4 list-disc">
                          {!variant.product_image_url && <li>Product Photo</li>}
                          {!variant.ingredient_image_url && <li>Ingredient Label</li>}
                          {!variant.nutrient_table_image_url && <li>Nutrition Facts</li>}
                          {!variant.fssai_label_image_url && <li>FSSAI Certificate</li>}
                          {variant.fssai_number?.length !== 14 && <li>FSSAI Number (14 digits)</li>}
                          {!isIngredientListValid(variant.ingredient_list) && <li>Ingredient List (min 10 chars)</li>}
                          {(!variant.nutritional_info?.calories || variant.nutritional_info?.calories === 0) && <li>Nutritional Information (at least Calories)</li>}
                          {!variant.accuracy_attested && <li>Accuracy Attestation (checkbox above)</li>}
                        </ul>
                      </div>
                    )}
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
            <div className="flex justify-between items-center">
              <Label>Product Images</Label>
              <Button 
                variant="outline" 
                onClick={() => setShowImageManager(true)}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Select from Manage Images
              </Button>
            </div>
            
            <ImageGalleryManager
              images={galleryImages}
              onImagesChange={(images) => {
                setGalleryImages(images);
                // Update productImages with only new files for upload
                const newFiles = images.map(img => img.file).filter((f): f is File => f !== undefined);
                setProductImages(newFiles);
              }}
              maxImages={10}
            />

            <div className="space-y-2 mt-6 pt-6 border-t">
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

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Seller Certificates & Certifications</h3>
              
              {/* Existing Certificates List */}
              {sellerCertifications.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Certificates ({sellerCertifications.length})</Label>
                  <div className="space-y-2">
                    {sellerCertifications.map((cert, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/30 flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{cert.certificate_type}</p>
                          {cert.issuing_body && <p className="text-sm text-muted-foreground">Issued by: {cert.issuing_body}</p>}
                          {cert.issued_date && <p className="text-sm text-muted-foreground">Date: {cert.issued_date}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSellerCertifications(sellerCertifications.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Certificate Form */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Add New Certificate</h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Certificate Name *</Label>
                    <Input
                      placeholder="e.g., FSSAI License, Organic Certification"
                      value={newCertificate.name}
                      onChange={(e) => setNewCertificate({ ...newCertificate, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Certificate Type *</Label>
                    <Select
                      value={newCertificate.certificate_type}
                      onValueChange={(value: "organic" | "fssai" | "iso" | "other") => {
                        setNewCertificate({ ...newCertificate, certificate_type: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organic">Organic Certification</SelectItem>
                        <SelectItem value="fssai">FSSAI License</SelectItem>
                        <SelectItem value="iso">ISO Certification</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Issuing Body</Label>
                    <Input
                      placeholder="e.g., APEDA, SGS, Indian Organic"
                      value={newCertificate.issuing_body || ""}
                      onChange={(e) => setNewCertificate({ ...newCertificate, issuing_body: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Issued Date</Label>
                      <Input
                        type="date"
                        value={newCertificate.issued_date || ""}
                        onChange={(e) => setNewCertificate({ ...newCertificate, issued_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={newCertificate.expiry_date || ""}
                        onChange={(e) => setNewCertificate({ ...newCertificate, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Certificate URL (Optional)</Label>
                    <Input
                      placeholder="Link to certificate or verification page"
                      type="url"
                      value={newCertificate.url || ""}
                      onChange={(e) => setNewCertificate({ ...newCertificate, url: e.target.value })}
                    />
                  </div>

                  <Button
                    onClick={() => {
                      if (!newCertificate.name || !newCertificate.certificate_type) {
                        toast({
                          title: "Please fill in required fields",
                          description: "Certificate name and type are required",
                          variant: "destructive",
                        });
                        return;
                      }
                      setSellerCertifications([...sellerCertifications, newCertificate]);
                      setNewCertificate({ name: "", certificate_type: "organic" });
                      toast({ title: "Certificate added" });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certificate
                  </Button>
                </div>
              </div>
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
              onClick={() => setShowPreview(true)}
              disabled={loading || !sellerDescription.trim()}
            >
              👁️ Preview
            </Button>
            {!editingProduct ? (
              // New Product Buttons
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Add Product - Save as Draft clicked");
                    handleSave("draft");
                  }}
                  disabled={loading}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => {
                    console.log("Add Product - Publish Now clicked");
                    handleSave("active");
                  }}
                  disabled={loading}
                >
                  Publish Now
                </Button>
              </>
            ) : (
              // Edit Product Buttons - Same functionality, clear labels
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Edit Product - Save as Draft clicked");
                    handleSave("draft");
                  }}
                  disabled={loading}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => {
                    console.log("Edit Product - Publish Now clicked");
                    handleSave("active");
                  }}
                  disabled={loading}
                >
                  Publish Now
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Product Preview Modal */}
      <ProductPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        product={
          sellerDescription.trim()
            ? {
                seller_title: sellerTitle || selectedGlobalProduct?.product_name || "Product",
                seller_description: sellerDescription,
                base_price: variants.length > 0
                  ? Math.min(...variants.map(v => v.price))
                  : undefined,
                discounted_price: variants.length > 0
                  ? Math.min(...variants.map(v => v.price)) * (1 - (discountPercentage / 100))
                  : undefined,
                discount_percentage: discountPercentage,
                return_policy: returnPolicy,
                shipping_info: shippingInfo,
                shelf_life_months: shelfLifeMonths,
                status: status,
                published_at: new Date().toISOString(),
                manufacturing_info: transparency.manufacturing_info,
                certificates: {
                  regular: certificateFiles.length,
                  trust: trustCertificateFiles.length,
                  total: certificateFiles.length + trustCertificateFiles.length
                },
                images: galleryImages
                  .map(img => {
                    let imageUrl = img.url || '';
                    // For new files, create a data URL for preview
                    if (img.file && !imageUrl) {
                      imageUrl = URL.createObjectURL(img.file);
                    }
                    return {
                      image_url: imageUrl,
                      is_primary: img.isPrimary,
                    };
                  })
                  .filter(img => img.image_url),
                variants: variants.map(v => ({
                  variant_name: v.variant_name,
                  flavor: v.flavor,
                  size: v.size,
                  price: v.price,
                  stock_quantity: v.stock_quantity,
                  nutritional_info: v.nutritional_info,
                  manufacture_date: v.manufacture_date,
                })),
              }
            : null
        }
      />

      {/* Image Manager Modal */}
      <ImageManager
        open={showImageManager}
        onOpenChange={setShowImageManager}
      />
    </Dialog>
  );
}
