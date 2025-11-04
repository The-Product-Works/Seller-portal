// src/pages/Inventory.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, PlusCircle, Edit3, Filter } from "lucide-react";
// <-- IMPORTANT: correct path to your generated DB types:
import { Tables, Database } from "@/integrations/supabase/database.type";

// --- Types (matching your database.types.ts) ---
type ProductRow = Tables<"products">;
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductImageRow = Tables<"product_images">;
type ProductCertificateRow = Tables<"product_certificates">;
type ProductAllergenRow = Tables<"product_allergens">;
type AllergenRow = Tables<"allergens">;
type BrandRow = Tables<"brands">;
type GlobalProductRow = Tables<"global_products">;
type ListingVariantRow = Tables<"listing_variants">;
type TransparencyRow = Tables<"product_transparency">;
type ProductImagesInsert = Database["public"]["Tables"]["product_images"]["Insert"];
type ProductCertificatesInsert = Database["public"]["Tables"]["product_certificates"]["Insert"];

// --- Constants ---
const STORAGE_BUCKET = "product-images";
const IMAGE_FOLDER = "product-images";
const CERT_FOLDER = "product-certificates";

export default function Inventory(): JSX.Element {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productImagesMap, setProductImagesMap] = useState<Record<string, ProductImageRow[]>>({});
  const [certificatesMap, setCertificatesMap] = useState<Record<string, ProductCertificateRow[]>>({});
  const [listingVariantsMap, setListingVariantsMap] = useState<Record<string, ListingVariantRow[]>>({});
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [globalProducts, setGlobalProducts] = useState<GlobalProductRow[]>([]);
  const [allergensList, setAllergensList] = useState<AllergenRow[]>([]);
  const [transparencyMap, setTransparencyMap] = useState<Record<string, TransparencyRow | null>>({});
  const [variantTransparencyMap, setVariantTransparencyMap] = useState<Record<string, TransparencyRow | null>>({});

  // dialogs & editing state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ListingVariantRow | null>(null);
  const [editingVariant_productId, setEditingVariant_productId] = useState<string | null>(null);

  // form states
  const [formGlobalName, setFormGlobalName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formBrandId, setFormBrandId] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formBasePrice, setFormBasePrice] = useState<number | "">("");
  const [formIsDraft, setFormIsDraft] = useState(false);
  const [formIngredients, setFormIngredients] = useState("");
  const [formAllergensInput, setFormAllergensInput] = useState<string>(""); // csv of allergen names

  const [productImageFiles, setProductImageFiles] = useState<File[]>([]);
  const [productCertificateFiles, setProductCertificateFiles] = useState<File[]>([]);
  const [selectedCertTypes, setSelectedCertTypes] = useState<string>("");

  const [variantRows, setVariantRows] = useState<any[]>([]);

  // filters
  const [query, setQuery] = useState("");
  const [filterBrand, setFilterBrand] = useState<string | "">("");
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [minStock, setMinStock] = useState<number | "">("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [tab, setTab] = useState<"published" | "drafts">("published");
  const [showFilters, setShowFilters] = useState(false);

  // seller file manager
  const [sellerFiles, setSellerFiles] = useState<{ path: string; publicUrl: string; updated_at?: string | null }[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  /* -------------------------
     Init: load user & data
     ------------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) {
          toast({ title: "Not signed in", description: "Please log in", variant: "destructive" });
          setLoading(false);
          return;
        }
        setSellerId(user.id);
        await reloadAllForSeller(user.id);
        await loadSellerFiles(user.id);
      } catch (err: any) {
        console.error(err);
        toast({ title: "Error", description: "Failed to load inventory", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------
     reloadAllForSeller
     ------------------------- */
  async function reloadAllForSeller(seller_id: string) {
    setLoading(true);
    try {
      // static lists
      const { data: b } = await supabase.from("brands").select("*");
      setBrands(b || []);
      const { data: g } = await supabase.from("global_products").select("*");
      setGlobalProducts(g || []);
      const { data: a } = await supabase.from("allergens").select("*");
      setAllergensList(a || []);

      // products for seller
      const { data: ps } = await supabase.from("products").select("*").eq("seller_id", seller_id).order("created_at", { ascending: false });
      const prodList = ps || [];
      setProducts(prodList);

      // images & certs for each product
      const imgsMap: Record<string, ProductImageRow[]> = {};
      const certMap: Record<string, ProductCertificateRow[]> = {};
      for (const p of prodList) {
        const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", p.product_id).order("sort_order", { ascending: true });
        imgsMap[p.product_id] = imgs || [];
        const { data: certs } = await supabase.from("product_certificates").select("*").eq("product_id", p.product_id);
        certMap[p.product_id] = certs || [];
      }
      setProductImagesMap(imgsMap);
      setCertificatesMap(certMap);

      // listing_variants
      const productIds = prodList.map((p) => p.product_id);
      let lvQuery = supabase.from("listing_variants").select("*");
      if (productIds.length) lvQuery = lvQuery.in("listing_id", productIds);
      const { data: lvars } = await lvQuery;
      const lvMap: Record<string, ListingVariantRow[]> = {};
      (lvars || []).forEach((lv: any) => {
        if (!lvMap[lv.listing_id]) lvMap[lv.listing_id] = [];
        lvMap[lv.listing_id].push(lv);
      });
      setListingVariantsMap(lvMap);

      // transparency
      let transQuery = supabase.from("product_transparency").select("*");
      if (productIds.length) {
        const orExpr = productIds.map(id => `listing_id.eq.${id}`).join(",");
        transQuery = transQuery.or(orExpr);
      }
      const { data: trans } = await transQuery;
      const tMap: Record<string, TransparencyRow | null> = {};
      const vtMap: Record<string, TransparencyRow | null> = {};
      (trans || []).forEach((t: any) => {
        if (t.listing_id && !t.variant_id) tMap[t.listing_id] = t;
        if (t.variant_id) vtMap[t.variant_id] = t;
      });
      setTransparencyMap(tMap);
      setVariantTransparencyMap(vtMap);
    } catch (err) {
      console.error("reload error", err);
      toast({ title: "Error", description: "Reload failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------
     Ensure helpers
     ------------------------- */
  async function ensureBrandByName(name: string | undefined | null) {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const found = brands.find((b) => b.name?.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;
    const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase.from("brands").insert([{ name: trimmed, slug }]).select().single();
    if (error) {
      console.warn("brand create error", error);
      return null;
    }
    setBrands((p) => [...p, data]);
    return data;
  }

  async function ensureGlobalProduct(name: string, brand_id?: string | null) {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    const found = globalProducts.find((g) => g.product_name.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;
    const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase.from("global_products").insert([{ product_name: trimmed, slug, is_active: true, brand_id }]).select().single();
    if (error) {
      console.warn("global product create error", error);
      return null;
    }
    setGlobalProducts((p) => [...p, data]);
    return data;
  }

  async function ensureAllergens(csv: string) {
    const names = csv.split(",").map(s => s.trim()).filter(Boolean);
    const ids: string[] = [];
    for (const n of names) {
      const existing = allergensList.find((a) => a.name.toLowerCase() === n.toLowerCase());
      if (existing) {
        ids.push(existing.allergen_id);
        continue;
      }
      const { data, error } = await supabase.from("allergens").insert([{ name: n }]).select().single();
      if (!error && data) {
        ids.push(data.allergen_id);
        setAllergensList((p) => [...p, data]);
      }
    }
    return ids;
  }

  /* -------------------------
     Upload helper
     ------------------------- */
  async function uploadFile(file: File, productId: string, variantId?: string, folder = IMAGE_FOLDER) {
    if (!sellerId) throw new Error("Not authenticated");
    const base = `${sellerId}/${productId}`;
    const dir = variantId ? `${base}/variant/${variantId}` : `${base}/product`;
    const path = `${folder}/${dir}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  function computeHealthScore(ingredientsCsv: string, allergenCount: number) {
    const ingredientsCount = ingredientsCsv ? ingredientsCsv.split(",").map(s => s.trim()).filter(Boolean).length : 0;
    const penalty = Math.min(ingredientsCount * 4, 60) + Math.min(allergenCount * 10, 60);
    return Math.max(0, Math.round(100 - penalty));
  }

  /* -------------------------
     product dialog open
     ------------------------- */
  async function openProductDialog(product?: ProductRow) {
    if (product) {
      setEditingProduct(product);
      setFormGlobalName(product.title || "");
      setFormDescription(product.description || "");
      setFormBasePrice(product.base_price ?? "");
      setFormIsDraft(product.status === "inactive");

      // images & certs
      const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", product.product_id).order("sort_order", { ascending: true });
      const { data: certs } = await supabase.from("product_certificates").select("*").eq("product_id", product.product_id);
      setProductImageFiles([]);
      setCertificatesMap(prev => ({ ...prev, [product.product_id]: certs || [] }));
      setProductImagesMap(prev => ({ ...prev, [product.product_id]: imgs || [] }));

      const brandObj = (brands || []).find(b => (b as any).brand_id === (product as any).brand_id);
      setFormBrand(brandObj ? brandObj.name || "" : "");
      setFormBrandId((product as any).brand_id ?? null);

      // product allergens
      const { data: pa } = await supabase.from("product_allergens").select("allergens(*)").eq("product_id", product.product_id);
      setFormAllergensInput((pa || []).map((r: any) => r.allergens.name).join(","));

      // variants
      const { data: lvars } = await supabase.from("listing_variants").select("*").eq("listing_id", product.product_id);
      setVariantRows((lvars || []).map((lv: any) => ({
        listing_variant_id: lv.variant_id,
        variant_name: lv.variant_name,
        sku: lv.sku,
        price: lv.price,
        original_price: lv.original_price,
        stock: lv.stock_quantity,
        size: lv.size,
        flavor: lv.flavor,
        manufacture_date: lv.manufacture_date,
        expiry_date: lv.expiry_date,
        is_available: lv.is_available,
        image_url: lv.image_url,
      })));
    } else {
      setEditingProduct(null);
      setFormGlobalName("");
      setFormDescription("");
      setFormBasePrice("");
      setFormIsDraft(false);
      setFormIngredients("");
      setFormAllergensInput("");
      setProductImageFiles([]);
      setProductCertificateFiles([]);
      setSelectedCertTypes("");
      setVariantRows([]);
      setFormBrand("");
      setFormBrandId(null);
    }
    setProductDialogOpen(true);
  }

  /* -------------------------
     save product
     ------------------------- */
  async function handleSaveProduct(publish = false) {
    try {
      setLoading(true);
      if (!sellerId) throw new Error("Not signed in");

      // ensure brand/global
      let brandObj: BrandRow | null = null;
      if (formBrand) brandObj = await ensureBrandByName(formBrand);
      const global = formGlobalName ? await ensureGlobalProduct(formGlobalName, brandObj?.brand_id) : null;

      let productId: string;
      if (!editingProduct) {
        const insertPayload: ProductInsert = {
          seller_id: sellerId,
          title: global?.product_name ?? formGlobalName,
          description: formDescription || null,
          base_price: (formBasePrice === "" ? 0 : (formBasePrice as number)) || 0,
          status: formIsDraft && !publish ? "inactive" : "active",
        } as any;
        if (brandObj?.brand_id) (insertPayload as any).brand_id = brandObj.brand_id;
        if (global?.global_product_id) (insertPayload as any).global_product_id = global.global_product_id;
        const { data: created, error } = await supabase.from("products").insert([insertPayload]).select().single();
        if (error) throw error;
        productId = created.product_id;
      } else {
        productId = editingProduct.product_id;
        const updatePayload: any = {
          description: formDescription || null,
          base_price: (formBasePrice === "" ? 0 : (formBasePrice as number)) || 0,
          status: formIsDraft && !publish ? "inactive" : "active",
          updated_at: new Date().toISOString(),
        };
        if (brandObj?.brand_id) updatePayload.brand_id = brandObj.brand_id;
        if (global?.global_product_id) updatePayload.global_product_id = global.global_product_id;
        const { error } = await supabase.from("products").update(updatePayload).eq("product_id", productId);
        if (error) throw error;
      }

      // Allergens: ensure and link
      const allergenIds = await ensureAllergens(formAllergensInput || "");
      await supabase.from("product_allergens").delete().eq("product_id", productId);
      if (allergenIds.length) {
        await supabase.from("product_allergens").insert(allergenIds.map(id => ({ product_id: productId, allergen_id: id })));
      }

      // Certificates upload/insert
      if (productCertificateFiles.length) {
        for (let i = 0; i < productCertificateFiles.length; i++) {
          const f = productCertificateFiles[i];
          const publicUrl = await uploadFile(f, productId, undefined, CERT_FOLDER);
          const types = selectedCertTypes.split(",").map(s => s.trim()).filter(Boolean);
          const certType = types[i] ?? f.name;
          await supabase.from("product_certificates").insert([{ product_id: productId, certificate: certType + "||" + publicUrl }]);
        }
      }

      // product images: delete DB rows then re-insert new ones
      if (productImageFiles.length) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        const urls: string[] = [];
        for (const f of productImageFiles) {
          const url = await uploadFile(f, productId, undefined, IMAGE_FOLDER);
          urls.push(url);
        }
        if (urls.length) {
          await supabase.from("product_images").insert(urls.map((u, idx) => ({ product_id: productId, url: u, sort_order: idx })));
        }
      }

      // handle variants
      for (const v of variantRows) {
        if (v.listing_variant_id) {
          const updatePayload: any = {
            variant_name: v.variant_name || null,
            sku: v.sku || null,
            flavor: v.flavor || null,
            size: v.size || null,
            price: typeof v.price !== "undefined" ? v.price : null,
            original_price: typeof v.original_price !== "undefined" ? v.original_price : null,
            stock_quantity: typeof v.stock !== "undefined" ? v.stock : 0,
            manufacture_date: v.manufacture_date || null,
            expiry_date: v.expiry_date || null,
            is_available: typeof v.is_available !== "undefined" ? v.is_available : true,
            updated_at: new Date().toISOString(),
          };
          const allergCount = (formAllergensInput || "").split(",").filter(Boolean).length;
          updatePayload.health_score = computeHealthScore(formIngredients || "", allergCount);
          if (v.imageFile) {
            try {
              const url = await uploadFile(v.imageFile as File, productId, v.listing_variant_id, IMAGE_FOLDER);
              updatePayload.image_url = url;
            } catch (e) {
              console.warn("variant image upload failed", e);
            }
          }
          await supabase.from("listing_variants").update(updatePayload).eq("variant_id", v.listing_variant_id);
        } else {
          // create product_variants then listing_variants
          let pv: any = null;
          try {
            const { data: pvd } = await supabase.from("product_variants").insert({
              product_id: productId,
              price: v.price ?? formBasePrice ?? 0,
              sku: v.sku || undefined,
              created_at: new Date().toISOString(),
            }).select().single();
            pv = pvd;
          } catch (err) {
            console.warn("product_variants insert warning", err);
          }

          const allergCount = (formAllergensInput || "").split(",").filter(Boolean).length;

          const priceVal = v.price ?? pv?.price ?? formBasePrice ?? 0;
          const originalPriceVal = (typeof v.original_price !== "undefined" && v.original_price !== null)
            ? v.original_price
            : priceVal;

          const { data: lv, error: lvErr } = await supabase.from("listing_variants").insert({
            listing_id: productId,
            sku: v.sku || (pv?.sku ?? ""),
            variant_name: v.variant_name || null,
            size: v.size || null,
            flavor: v.flavor || null,
            price: priceVal,
            original_price: originalPriceVal,
            stock_quantity: v.stock ?? 0,
            reserved_quantity: 0,
            manufacture_date: v.manufacture_date || null,
            batch_number: v.batch_number || null,
            expiry_date: v.expiry_date || null,
            health_score: computeHealthScore(formIngredients || "", allergCount),
            nutritional_info: v.nutritional_info || null,
            is_available: v.is_available ?? true,
          }).select().single();

          if (lvErr) throw lvErr;
          const lvId = (lv as any).variant_id;
          if (v.imageFile) {
            try {
              const url = await uploadFile(v.imageFile as File, productId, lvId, IMAGE_FOLDER);
              await supabase.from("listing_variants").update({ image_url: url }).eq("variant_id", lvId);
            } catch (e) {
              console.warn("variant image upload failed after insert", e);
            }
          }
        }
      }

      toast({ title: publish ? "Published" : "Saved", description: editingProduct ? "Product updated" : "Product created" });
      setProductDialogOpen(false);
      setEditingProduct(null);
      setVariantRows([]);
      await reloadAllForSeller(sellerId);
      await loadSellerFiles(sellerId);
    } catch (err: any) {
      console.error("save product error", err);
      toast({ title: "Error", description: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------
     variant actions
     ------------------------- */
  function openVariantEditor(variant: ListingVariantRow, productId: string) {
    setEditingVariant(variant);
    setEditingVariant_productId(productId);
    setVariantDialogOpen(true);
  }

  async function saveVariantEdits(payload: Partial<ListingVariantRow> & { imageFile?: File | null }) {
    if (!editingVariant) return;
    try {
      setLoading(true);
      const update: any = { ...payload };
      delete update.imageFile;
      update.updated_at = new Date().toISOString();

      if ((payload as any).imageFile) {
        const listingId = editingVariant.listing_id ?? editingVariant.listing_id;
        const url = await uploadFile((payload as any).imageFile as File, String(listingId), editingVariant.variant_id, IMAGE_FOLDER);
        update.image_url = url;
      }
      update.health_score = computeHealthScore(formIngredients || "", (formAllergensInput || "").split(",").filter(Boolean).length);

      await supabase.from("listing_variants").update(update).eq("variant_id", editingVariant.variant_id);
      toast({ title: "Saved", description: "Variant updated" });
      setVariantDialogOpen(false);
      setEditingVariant(null);
      await reloadAllForSeller(sellerId!);
      await loadSellerFiles(sellerId!);
    } catch (err: any) {
      console.error("save variant error", err);
      toast({ title: "Error", description: err?.message || "Variant save failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function deleteVariant(variantId: string) {
    if (!window.confirm("Delete this variant? This action cannot be undone.")) return;
    try {
      setLoading(true);
      await supabase.from("listing_variants").delete().eq("variant_id", variantId);
      toast({ title: "Deleted", description: "Variant removed" });
      await reloadAllForSeller(sellerId!);
      await loadSellerFiles(sellerId!);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!window.confirm("Delete this product and all its variants? This cannot be undone.")) return;
    try {
      setLoading(true);
      await supabase.from("products").delete().eq("product_id", productId);
      // cleanup DB rows
      await supabase.from("product_images").delete().eq("product_id", productId);
      await supabase.from("product_certificates").delete().eq("product_id", productId);
      await supabase.from("product_allergens").delete().eq("product_id", productId);
      toast({ title: "Deleted", description: "Product removed" });
      await reloadAllForSeller(sellerId!);
      await loadSellerFiles(sellerId!);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function restockVariant(variantId: string) {
    const input = window.prompt("Enter quantity to add:", "10");
    if (!input) return;
    const amt = parseInt(input);
    if (isNaN(amt) || amt <= 0) {
      alert("Enter a positive integer");
      return;
    }
    try {
      setLoading(true);
      try {
        await supabase.rpc("increment_listing_variant_stock", { vid: variantId, amount: amt });
      } catch (rpcErr) {
        const { data: lv } = await supabase.from("listing_variants").select("stock_quantity").eq("variant_id", variantId).single();
        const newQty = (lv?.stock_quantity || 0) + amt;
        await supabase.from("listing_variants").update({ stock_quantity: newQty }).eq("variant_id", variantId);
      }
      toast({ title: "Restocked", description: `Added ${amt} units` });
      await reloadAllForSeller(sellerId!);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Restock failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------
     filtering
     ------------------------- */
  const filteredProducts = useMemo(() => {
    const qLower = query.trim().toLowerCase();
    const minP = priceMin === "" ? undefined : Number(priceMin);
    const maxP = priceMax === "" ? undefined : Number(priceMax);
    const minS = minStock === "" ? undefined : Number(minStock);
    const fb = filterBrand === "" ? undefined : filterBrand;

    const out: { product: ProductRow; images: ProductImageRow[]; variants: ListingVariantRow[] }[] = [];

    for (const p of products) {
      if (tab === "drafts" && p.status !== "inactive") continue;
      if (tab === "published" && p.status === "inactive") continue;

      if (fb) {
        if ((p as any).brand_id) {
          if ((p as any).brand_id !== fb) continue;
        } else if ((p as any).brand_name) {
          if (((p as any).brand_name as string).toLowerCase() !== fb.toLowerCase()) continue;
        } else {
          continue;
        }
      }

      const variants = listingVariantsMap[p.product_id] || [];
      const matched = variants.filter((v) => {
        if (onlyInStock && (v.stock_quantity ?? 0) <= 0) return false;
        if (typeof minP !== "undefined" && (v.price ?? 0) < minP) return false;
        if (typeof maxP !== "undefined" && (v.price ?? 0) > maxP) return false;
        if (typeof minS !== "undefined" && (v.stock_quantity ?? 0) < minS) return false;
        if (qLower) {
          const checks = [
            (p.title || "").toLowerCase().includes(qLower),
            (v.sku || "").toLowerCase().includes(qLower),
            (v.variant_name || "").toLowerCase().includes(qLower),
            (v.flavor || "").toLowerCase().includes(qLower),
          ];
          if (!checks.some(Boolean)) return false;
        }
        return true;
      });
      if (matched.length) out.push({ product: p, images: productImagesMap[p.product_id] || [], variants: matched });
    }
    return out;
  }, [products, listingVariantsMap, productImagesMap, query, priceMin, priceMax, minStock, onlyInStock, filterBrand, tab]);

  /* -------------------------
     allergens helpers
     ------------------------- */
  function addAllergenToForm(name: string) {
    const list = (formAllergensInput || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!list.includes(name)) setFormAllergensInput([...list, name].join(","));
  }

  async function createAllergenInline(name: string) {
    if (!name.trim()) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from("allergens").insert([{ name: name.trim() }]).select().single();
      if (error) throw error;
      setAllergensList(prev => [...prev, data]);
      addAllergenToForm(name.trim());
    } catch (err: any) {
      console.error("create allergen error", err);
      toast({ title: "Error", description: "Failed to create allergen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------
     seller file manager
     ------------------------- */
  async function loadSellerFiles(seller_id: string) {
    setFilesLoading(true);
    try {
      const prefixes = [
        `${IMAGE_FOLDER}/${seller_id}`,
        `${CERT_FOLDER}/${seller_id}`,
      ];
      const files: { path: string; publicUrl: string; updated_at?: string | null }[] = [];

      // helper that lists a prefix and tries to descend a couple of levels
      async function listRecursive(prefix: string) {
        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1000 });
        if (error) return;
        if (!data) return;
        for (const item of data) {
          const candidate = `${prefix}/${item.name}`;
          // if item is file-like (has a dot) attempt to treat as file
          if (item.name.includes(".")) {
            const { data: pu } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(candidate);
            files.push({ path: candidate, publicUrl: pu.publicUrl, updated_at: (item as any).updated_at ?? null });
            continue;
          }
          // else try to list deeper
          const { data: deeper } = await supabase.storage.from(STORAGE_BUCKET).list(candidate, { limit: 1000 }).catch(() => ({ data: null }));
          if (deeper && deeper.length) {
            for (const dd of deeper) {
              const finalPath = `${candidate}/${dd.name}`;
              const { data: pu2 } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(finalPath);
              files.push({ path: finalPath, publicUrl: pu2.publicUrl, updated_at: (dd as any).updated_at ?? null });
            }
          }
        }
      }

      for (const pfx of prefixes) {
        await listRecursive(pfx);
      }

      const dedup = Array.from(new Map(files.map(f => [f.path, f])).values());
      setSellerFiles(dedup);
    } catch (err) {
      console.error("loadSellerFiles error", err);
      toast({ title: "Error", description: "Failed to load seller files", variant: "destructive" });
    } finally {
      setFilesLoading(false);
    }
  }

  async function deleteStorageFile(path: string) {
    if (!window.confirm("Delete this file? This will remove it from storage. DB image rows referencing it will also be removed if matched.")) return;
    try {
      setFilesLoading(true);
      const { error: rmErr } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (rmErr) throw rmErr;

      const { data: pu } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pu.publicUrl;

      await supabase.from("product_images").delete().eq("url", publicUrl);
      await supabase.from("product_certificates").delete().like("certificate", `%${publicUrl}%`);

      toast({ title: "Deleted", description: "File removed" });
      if (sellerId) {
        await loadSellerFiles(sellerId);
        await reloadAllForSeller(sellerId);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err?.message || "Delete failed", variant: "destructive" });
    } finally {
      setFilesLoading(false);
    }
  }

  /* -------------------------
     UI rendering
     ------------------------- */
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Manage products, variants, certificates & images</p>
        </div>

        <div className="flex gap-2 items-center">
          <Dialog open={productDialogOpen} onOpenChange={(o) => { setProductDialogOpen(o); if (!o) { setEditingProduct(null); setVariantRows([]); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
              </DialogHeader>

              <form className="space-y-4 max-h-[75vh] overflow-y-auto p-1" onSubmit={(e) => { e.preventDefault(); handleSaveProduct(false); }}>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Global Product</Label>
                    <Input list="global-list" required value={formGlobalName} onChange={(e) => setFormGlobalName(e.target.value)} placeholder="Search or type new global product" />
                    <datalist id="global-list">
                      {globalProducts.map((g) => <option key={g.global_product_id} value={g.product_name} />)}
                    </datalist>
                  </div>

                  <div>
                    <Label>Brand</Label>
                    <Input list="brand-list" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} placeholder="Select or type to create brand" />
                    <datalist id="brand-list">
                      {brands.map((b) => <option key={b.brand_id} value={b.name} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Base Price (₹)</Label>
                    <Input type="number" value={formBasePrice as any} onChange={(e) => setFormBasePrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Ingredients</Label>
                    <Input value={formIngredients} onChange={(e) => setFormIngredients(e.target.value)} placeholder="comma-separated" />
                  </div>
                  <div>
                    <Label>Allergens</Label>
                    <Input value={formAllergensInput} onChange={(e) => setFormAllergensInput(e.target.value)} placeholder="select existing or type new (comma-separated)" />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(allergensList || []).slice(0, 20).map(a => (
                        <button
                          key={a.allergen_id}
                          type="button"
                          className="inline-flex items-center gap-2 px-2 py-1 rounded bg-muted"
                          onClick={() => addAllergenToForm(a.name)}
                        >
                          <span className="text-xs">{a.name}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border"
                        onClick={() => {
                          const name = window.prompt("Enter new allergen name (will be created):");
                          if (name) createAllergenInline(name);
                        }}
                      >
                        <Plus className="h-3 w-3" /> <span className="text-xs">Add</span>
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Existing: {allergensList.map(a => a.name).slice(0, 6).join(", ")}{allergensList.length > 6 ? "..." : ""}</div>
                  </div>
                </div>

                <div>
                  <Label>Product Images (optional)</Label>
                  <input type="file" multiple accept="image/*" onChange={(e) => setProductImageFiles(e.target.files ? Array.from(e.target.files) : [])} />
                </div>

                <div>
                  <Label>Certificates / Trust Documents (optional)</Label>
                  <div className="flex gap-2 items-center">
                    <input type="file" multiple accept="image/*,.pdf" onChange={(e) => setProductCertificateFiles(e.target.files ? Array.from(e.target.files) : [])} />
                    <Input placeholder="Certificate labels (comma-separated)" value={selectedCertTypes} onChange={(e) => setSelectedCertTypes(e.target.value)} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Upload reports/certificates (PDF/JPG) and optionally enter labels for them.</div>
                </div>

                <div>
                  <Label>Variants</Label>
                  <div className="space-y-3 mt-2">
                    {variantRows.map((v, idx) => (
                      <div key={idx} className="p-3 border rounded grid grid-cols-1 gap-2">
                        <div className="grid md:grid-cols-4 gap-2">
                          <Input placeholder="Variant name" value={v.variant_name} onChange={(e) => { const a = [...variantRows]; a[idx].variant_name = e.target.value; setVariantRows(a); }} />
                          <Input placeholder="SKU" value={v.sku} onChange={(e) => { const a = [...variantRows]; a[idx].sku = e.target.value; setVariantRows(a); }} />
                          <Input type="number" placeholder="Price" value={v.price} onChange={(e) => { const a = [...variantRows]; a[idx].price = Number(e.target.value); setVariantRows(a); }} />
                          <Input type="number" placeholder="Stock" value={v.stock} onChange={(e) => { const a = [...variantRows]; a[idx].stock = Number(e.target.value); setVariantRows(a); }} />
                        </div>
                        <div className="grid md:grid-cols-3 gap-2">
                          <Input placeholder="Size" value={v.size} onChange={(e) => { const a = [...variantRows]; a[idx].size = e.target.value; setVariantRows(a); }} />
                          <Input placeholder="Flavor" value={v.flavor} onChange={(e) => { const a = [...variantRows]; a[idx].flavor = e.target.value; setVariantRows(a); }} />
                          <input type="file" accept="image/*" onChange={(e) => { const a = [...variantRows]; a[idx].imageFile = e.target.files?.[0] ?? null; setVariantRows(a); }} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="destructive" onClick={() => setVariantRows(variantRows.filter((_, i) => i !== idx))}><Trash2 /></Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" onClick={() => setVariantRows([...variantRows, { variant_name: "", sku: "", price: 0, stock: 0, size: "", flavor: "" }])}><PlusCircle className="mr-2 h-4 w-4" /> Add Variant</Button>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2">
                    <input id="draft" type="checkbox" checked={formIsDraft} onChange={(e) => setFormIsDraft(e.target.checked)} />
                    <Label htmlFor="draft">Save as Draft (not visible to buyers/admin)</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" onClick={() => handleSaveProduct(false)}>Save Draft</Button>
                    <Button type="button" onClick={() => handleSaveProduct(true)}>Publish</Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button onClick={() => openProductDialog()} variant="secondary">Quick Add</Button>
          <Button variant="ghost" onClick={() => setShowFilters(s => !s)}><Filter className="mr-2 h-4 w-4" /> Filters</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`px-4 py-2 rounded ${tab === "published" ? "bg-primary text-white" : "bg-muted"}`} onClick={() => setTab("published")}>Published</button>
        <button className={`px-4 py-2 rounded ${tab === "drafts" ? "bg-primary text-white" : "bg-muted"}`} onClick={() => setTab("drafts")}>Drafts</button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search product / variant name / sku..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="flex gap-2 items-center">
              <Input className="w-28" placeholder="min price" type="number" value={priceMin as any} onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))} />
              <Input className="w-28" placeholder="max price" type="number" value={priceMax as any} onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} />
              <Input className="w-28" placeholder="min stock" type="number" value={minStock as any} onChange={(e) => setMinStock(e.target.value === "" ? "" : Number(e.target.value))} />
              <div className="flex items-center gap-1">
                <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
                <Label>Only in stock</Label>
              </div>
              <Input className="w-40" list="brand-list" placeholder="Filter by brand" value={filterBrand as any} onChange={(e) => setFilterBrand(e.target.value)} />
              <datalist id="brand-list">{brands.map((b) => <option key={b.brand_id} value={b.name} />)}</datalist>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Product grid */}
      <Card>
        <CardContent>
          {loading ? <div className="text-center py-6">Loading...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No results</div> : (
                filteredProducts.map(({ product, images, variants }) => (
                  <Card key={product.product_id}>
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={images[0]?.url || variants[0]?.image_url || "/placeholder.svg"} className="object-cover w-full h-full" alt={product.title} />
                    </div>
                    <CardContent className="p-3">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{product.title}</h3>
                          <div className="text-xs text-muted-foreground">{product.description}</div>
                          <div className="text-xs text-muted-foreground">Brand: {(product as any).brand_name || (product as any).brand || "—"}</div>
                        </div>

                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openProductDialog(product)}><Edit /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteProduct(product.product_id)}><Trash2 /></Button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex flex-col gap-2">
                          {variants.map((v) => (
                            <div key={v.variant_id} className="border rounded p-2 flex gap-3 items-center">
                              <img src={(v as any).image_url || "/placeholder.svg"} alt={v.variant_name || v.sku} className="w-16 h-16 object-cover rounded" />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">{v.variant_name || v.sku}</div>
                                    <div className="text-xs text-muted-foreground">{v.sku}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold">₹{(v.price ?? 0).toFixed(2)}</div>
                                    <div className="text-xs">{v.stock_quantity ?? 0} in stock</div>
                                  </div>
                                </div>

                                <div className="mt-2 flex gap-2 items-center">
                                  <Badge>{v.health_score ?? "—"} HS</Badge>
                                  <Button size="sm" variant="ghost" onClick={() => openVariantEditor(v, product.product_id)}><Edit3 className="h-4 w-4" /> Edit</Button>
                                  <Button size="sm" variant="ghost" onClick={() => restockVariant(v.variant_id)}>Restock</Button>
                                  <Button size="sm" variant="destructive" onClick={() => deleteVariant(v.variant_id)}>Delete</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 text-xs">
                          <div>Certificates: {(certificatesMap[product.product_id] || []).map(c => c.certificate).join(", ") || "—"}</div>
                          <div>Transparency: {transparencyMap[product.product_id] ? "Available" : "—"}</div>
                        </div>

                        <div className="mt-2 flex gap-2 flex-wrap text-xs">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs"
                            onClick={() => {
                              const name = window.prompt("Enter allergen to add (this creates it if missing):");
                              if (name) createAllergenInline(name);
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add allergen
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller File Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="font-semibold">Seller File Manager</h3>
              <div className="text-xs text-muted-foreground">All files under your product-images and product-certificates folders. Click to view or delete.</div>
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={() => { if (sellerId) loadSellerFiles(sellerId); }}>Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="text-center py-6">Loading files...</div>
          ) : sellerFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4">No files found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sellerFiles.map((f) => (
                <div key={f.path} className="border rounded overflow-hidden p-2 flex flex-col">
                  <div className="aspect-video bg-black/5 overflow-hidden flex items-center justify-center">
                    {/\.(jpe?g|png|gif|webp|svg)$/i.test(f.path) ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img src={f.publicUrl} alt={`file ${f.path}`} className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-xs text-muted-foreground p-4">File: {f.path.split("/").pop()}</div>
                    )}
                  </div>
                  <div className="flex-1 mt-2 text-xs break-words">{f.path}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => window.open(f.publicUrl, "_blank")}>View</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteStorageFile(f.path)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Edit Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={(o) => { setVariantDialogOpen(o); if (!o) setEditingVariant(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
          </DialogHeader>
          {editingVariant ? (
            <VariantEditor
              variant={editingVariant}
              productId={editingVariant_productId!}
              onCancel={() => { setVariantDialogOpen(false); setEditingVariant(null); }}
              onSave={saveVariantEdits}
            />
          ) : <div className="p-4">No variant selected</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------
   VariantEditor component
   ------------------------- */
function VariantEditor({ variant, productId, onCancel, onSave }: {
  variant: ListingVariantRow;
  productId: string;
  onCancel: () => void;
  onSave: (payload: Partial<ListingVariantRow> & { imageFile?: File | null }) => void;
}) {
  const [sku, setSku] = useState(variant.sku || "");
  const [name, setName] = useState(variant.variant_name || "");
  const [price, setPrice] = useState<number | "">(variant.price ?? "");
  const [stock, setStock] = useState<number | "">(variant.stock_quantity ?? "");
  const [size, setSize] = useState(variant.size || "");
  const [flavor, setFlavor] = useState(variant.flavor || "");
  const [mfg, setMfg] = useState(variant.manufacture_date ? String(variant.manufacture_date).slice(0, 10) : "");
  const [expiry, setExpiry] = useState(variant.expiry_date ? String(variant.expiry_date).slice(0, 10) : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(variant.is_available ?? true);

  useEffect(() => {
    setSku(variant.sku || "");
    setName(variant.variant_name || "");
    setPrice(variant.price ?? "");
    setStock(variant.stock_quantity ?? "");
    setSize(variant.size || "");
    setFlavor(variant.flavor || "");
    setMfg(variant.manufacture_date ? String(variant.manufacture_date).slice(0, 10) : "");
    setExpiry(variant.expiry_date ? String(variant.expiry_date).slice(0, 10) : "");
    setImageFile(null);
    setIsAvailable(variant.is_available ?? true);
  }, [variant]);

  return (
    <div className="space-y-3">
      <div><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" /></div>
      <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Variant name" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Price</Label><Input type="number" value={price as any} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.00" /></div>
        <div><Label>Stock</Label><Input type="number" value={stock as any} onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Size</Label><Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size" /></div>
        <div><Label>Flavor</Label><Input value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="Flavor" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>MFG Date</Label><Input type="date" value={mfg} onChange={(e) => setMfg(e.target.value)} /></div>
        <div><Label>Expiry Date</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
      </div>
      <div>
        <Label>Replace Image</Label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex items-center gap-2">
        <input id="avail" type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
        <Label htmlFor="avail">Available</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => {
          onSave({
            sku,
            variant_name: name,
            price: typeof price === "number" ? price : Number(price),
            stock_quantity: typeof stock === "number" ? stock : Number(stock),
            size,
            flavor,
            manufacture_date: mfg || null,
            expiry_date: expiry || null,
            imageFile,
            is_available: isAvailable,
          });
        }}>Save</Button>
      </div>
    </div>
  );
}
