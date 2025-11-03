/**************************************************************************
 * Inventory.tsx - Complete Inventory Management System
 * Works with your current database.types.ts and ShadCN UI stack.
 * - Products, Variants, Allergens, Certificates, Inventory
 * - Admin sees all sellers
 * - Simple searchable dropdowns for brand + product name
 * - Uses bucket: product-images
 **************************************************************************/

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/database.types";
import { FilterDialog, FilterValues } from "@/components/FilterDialog";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { ProductVariantSection, AllergenSection } from "@/components/ProductOptions";

type ProductRow = Tables<"products">;
type ProductVariantRow = Tables<"product_variants">;
type InventoryRow = Tables<"inventory">;
type ProductImageRow = Tables<"product_images">;
type ProductAllergenRow = Tables<"product_allergens">;
type ProductCertificateRow = Tables<"product_certificates">;
type VariantAttributeValueRow = Tables<"variant_attribute_values">;
type AllergenRow = Tables<"allergens">;
type BrandRow = Tables<"brands">;
type GlobalProductRow = Tables<"global_products">;

const STORAGE_BUCKET = "product-images";

type UIVariant = ProductVariantRow & {
  inventory?: InventoryRow | null;
  attributes?: VariantAttributeValueRow[];
};

type UIProduct = {
  product: ProductRow;
  images: ProductImageRow[];
  variants: UIVariant[];
  allergens: AllergenRow[];
  certificates: ProductCertificateRow[];
  brand?: BrandRow | null;
  global?: GlobalProductRow | null;
  isLocalDraft?: boolean;
};

export default function Inventory(): JSX.Element {
  const [filters, setFilters] = useState<FilterValues>({});
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [globals, setGlobals] = useState<GlobalProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<UIProduct | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const { options } = useFilterOptions();

  // form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBasePrice, setFormBasePrice] = useState<number | "">("");
  const [formBrand, setFormBrand] = useState("");
  const [formGlobalProductName, setFormGlobalProductName] = useState("");
  const [formIsDraft, setFormIsDraft] = useState(false);
  const [formVariantRows, setFormVariantRows] = useState<any[]>([]);
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formCertificates, setFormCertificates] = useState<string[]>([]);

  useEffect(() => {
    loadBrandsAndGlobals();
    loadProducts();
    checkAdmin();
  }, [filters]);

  async function checkAdmin() {
    try {
      const { data, error } = await supabase.rpc("is_admin");
      if (!error && data === true) setIsAdmin(true);
    } catch {}
  }

  async function loadBrandsAndGlobals() {
    const { data: b } = await supabase.from("brands").select("*");
    const { data: g } = await supabase.from("global_products").select("*");
    setBrands(b || []);
    setGlobals(g || []);
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProducts([]);
        return;
      }

      let query = supabase.from("products").select("*");
      if (!isAdmin) query = query.eq("seller_id", user.id);
      if (filters.productName) query = query.ilike("title", `%${filters.productName}%`);
      const { data: productsData, error } = await query;
      if (error) throw error;

      const assembled: UIProduct[] = [];
      for (const p of productsData || []) {
        const { data: images } = await supabase.from("product_images").select("*").eq("product_id", p.product_id);
        const { data: variants } = await supabase.from("product_variants").select("*").eq("product_id", p.product_id);
        const vList: UIVariant[] = [];
        for (const v of variants || []) {
          const { data: inv } = await supabase.from("inventory").select("*").eq("variant_id", v.variant_id).single();
          const { data: attrs } = await supabase.from("variant_attribute_values").select("*").eq("variant_id", v.variant_id);
          vList.push({ ...(v as any), inventory: inv ?? null, attributes: attrs ?? [] });
        }
        const { data: pa } = await supabase.from("product_allergens").select("allergens(*)").eq("product_id", p.product_id);
        const allergens = (pa || []).map((r: any) => r.allergens) as AllergenRow[];
        const { data: cert } = await supabase.from("product_certificates").select("*").eq("product_id", p.product_id);
        assembled.push({
          product: p,
          images: images || [],
          variants: vList,
          allergens,
          certificates: cert || [],
        });
      }
      setProducts(assembled);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const filteredBrands = useMemo(() => {
    if (!formBrand) return brands;
    return brands.filter(b => b.name.toLowerCase().includes(formBrand.toLowerCase()));
  }, [formBrand, brands]);
  const filteredGlobals = useMemo(() => {
    if (!formGlobalProductName) return globals;
    return globals.filter(g => g.product_name.toLowerCase().includes(formGlobalProductName.toLowerCase()));
  }, [formGlobalProductName, globals]);

  async function addBrand(name: string) {
    try {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const { data, error } = await supabase.from("brands").insert([{ name, slug }]).select().single();
      if (error) throw error;
      setBrands([...brands, data]);
      return data;
    } catch {
      toast({ title: "Error", description: "Failed to create brand", variant: "destructive" });
    }
  }

  async function addGlobalProduct(name: string) {
    try {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const { data, error } = await supabase.from("global_products").insert([{ product_name: name, slug, is_active: true }]).select().single();
      if (error) throw error;
      setGlobals([...globals, data]);
      return data;
    } catch {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    }
  }

  async function uploadFiles(files: File[], prefix = "") {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "anon";
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${userId}/products/${prefix || Date.now()}_${i}_${file.name}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
      if (!error) {
        const { data: url } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        uploaded.push(url.publicUrl);
      }
    }
    return uploaded;
  }

  async function createOrUpdateProduct() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const base_price = typeof formBasePrice === "number" ? formBasePrice : parseFloat(String(formBasePrice || 0));
    let brand = brands.find(b => b.name.toLowerCase() === formBrand.toLowerCase());
    if (!brand && formBrand) brand = await addBrand(formBrand);
    let global = globals.find(g => g.product_name.toLowerCase() === formGlobalProductName.toLowerCase());
    if (!global && formGlobalProductName) global = await addGlobalProduct(formGlobalProductName);

    if (!editProduct) {
      const { data: prod, error } = await supabase.from("products").insert([{
        title: formTitle,
        description: formDescription,
        base_price,
        seller_id: user.id,
        status: formIsDraft ? "inactive" : "active",
        category_id: null,
      } as any]).select().single();
      if (error) return toast({ title: "Error", description: "Create failed" });
      await afterProductSave(prod.product_id);
      toast({ title: "Success", description: formIsDraft ? "Draft saved" : "Product published" });
    } else {
      await supabase.from("products").update({
        title: formTitle,
        description: formDescription,
        base_price,
        updated_at: new Date().toISOString(),
      }).eq("product_id", editProduct.product.product_id);
      await afterProductSave(editProduct.product.product_id);
      toast({ title: "Updated", description: "Product updated" });
    }
    setIsOpen(false);
    setEditProduct(null);
    loadProducts();
  }

  async function afterProductSave(productId: string) {
    const urls = await uploadFiles(imageFiles, productId);
    if (urls.length) await supabase.from("product_images").insert(urls.map((u, i) => ({ product_id: productId, url: u, sort_order: i })));
    if (formCertificates.length) {
      await supabase.from("product_certificates").delete().eq("product_id", productId);
      await supabase.from("product_certificates").insert(formCertificates.map(c => ({ product_id: productId, certificate: c })));
    }
    if (formAllergens.length) {
      await supabase.from("product_allergens").delete().eq("product_id", productId);
      await supabase.from("product_allergens").insert(formAllergens.map(a => ({ product_id: productId, allergen_id: a })));
    }
  }

  function productHasLowStock(p: UIProduct) {
    return p.variants.some(v => (v.inventory?.quantity ?? 0) <= 5);
  }

  function displayPrice(p: UIProduct) {
    return p.variants.length ? Math.min(...p.variants.map(v => v.price ?? 0)) : p.product.base_price ?? 0;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Manage your products</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) setEditProduct(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createOrUpdateProduct(); }}>
              <div className="space-y-3 max-h-[65vh] overflow-y-auto p-1">
                <div><Label>Product Name</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                </div>
                <div>
                  <Label>Global Product</Label>
                  <Input
                    list="globals"
                    value={formGlobalProductName}
                    onChange={(e) => setFormGlobalProductName(e.target.value)}
                    placeholder="Search or enter new"
                  />
                  <datalist id="globals">
                    {filteredGlobals.map(g => <option key={g.global_product_id}>{g.product_name}</option>)}
                  </datalist>
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input
                    list="brands"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Search or enter new"
                  />
                  <datalist id="brands">
                    {filteredBrands.map(b => <option key={b.brand_id}>{b.name}</option>)}
                  </datalist>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                </div>
                <div>
                  <Label>Base Price (₹)</Label>
                  <Input type="number" value={formBasePrice as any} onChange={(e) => setFormBasePrice(parseFloat(e.target.value) || "")} />
                </div>
                <div>
                  <Label>Images</Label>
                  <input type="file" multiple accept="image/*" onChange={(e) => setImageFiles(e.target.files ? Array.from(e.target.files) : [])} />
                </div>
                <div>
                  <Label>Variants</Label>
                  <ProductVariantSection initialVariants={formVariantRows} onVariantsChange={(v: any[]) => setFormVariantRows(v)} />
                </div>
                <div>
                  <Label>Allergens</Label>
                  <AllergenSection initialAllergens={formAllergens} onAllergensChange={(a) => setFormAllergens(a)} />
                </div>
                <div>
                  <Label>Certificates</Label>
                  <Input placeholder="comma separated" value={formCertificates.join(",")} onChange={(e) => setFormCertificates(e.target.value.split(",").map(x => x.trim()).filter(Boolean))} />
                </div>
                <div className="flex gap-2 items-center">
                  <input type="checkbox" checked={formIsDraft} onChange={(e) => setFormIsDraft(e.target.checked)} />
                  <Label>Save as Draft</Label>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit">{editProduct ? "Save" : formIsDraft ? "Save Draft" : "Publish"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex gap-3 items-center">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={filters.productName || ""} onChange={(e) => setFilters({ ...filters, productName: e.target.value })} />
            <FilterDialog isAdmin={isAdmin} options={options} initialFilters={filters} onFilterChange={setFilters} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-6">Loading...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(ui => {
                const p = ui.product;
                const lowStock = productHasLowStock(ui);
                return (
                  <Card key={p.product_id}>
                    <div className="aspect-square bg-muted">
                      <img src={ui.images[0]?.url || "/placeholder.svg"} className="object-cover w-full h-full" />
                    </div>
                    <CardContent className="p-3">
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{p.title}</h3>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditProduct(ui); setIsOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("products").delete().eq("product_id", p.product_id); loadProducts(); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <p className="text-lg font-bold mt-1">₹{displayPrice(ui).toFixed(2)}</p>
                      {lowStock && <p className="flex items-center text-amber-600 text-sm"><AlertTriangle className="h-4 w-4 mr-1" />Low stock (≤5)</p>}
                      {ui.certificates.length > 0 && <p className="text-xs mt-1">Certificates: {ui.certificates.map(c => c.certificate).join(", ")}</p>}
                      {ui.allergens.length > 0 && <p className="text-xs">Allergens: {ui.allergens.map(a => a.name).join(", ")}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">{ui.variants.map(v => <Badge key={v.variant_id}>{v.sku}</Badge>)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
