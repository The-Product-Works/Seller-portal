// ✅ src/pages/Inventory.tsx
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";

type Db = Database;
type Product = Db["public"]["Tables"]["products"]["Row"];
type ProductImage = Db["public"]["Tables"]["product_images"]["Row"];
type Brand = Db["public"]["Tables"]["brands"]["Row"];
type Seller = Db["public"]["Tables"]["sellers"]["Row"];

export default function InventoryPage() {
  const { toast } = useToast();

  const [sellerId, setSellerId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "archived" | "">("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 9;
  const [totalCount, setTotalCount] = useState(0);

  const offset = (page - 1) * pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ✅ Fetch seller id for logged-in user
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      setSellerId(seller?.id || null);
    })();
  }, []);

  // ✅ Fetch brands
  useEffect(() => {
    supabase.from("brands").select("*").then(({ data }) => setBrands(data || []));
  }, []);

  // ✅ Fetch products
  const fetchProducts = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (search) query = query.ilike("title", `%${search}%`);
      if (statusFilter) query = query.eq("status", statusFilter);

      const { data, count, error } = await query;
      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast({ title: "Error loading products", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) fetchProducts();
  }, [sellerId, page, search, statusFilter]);

  // ✅ Create or update product
  const saveProduct = async (draft = false) => {
    if (!sellerId) return toast({ title: "Error", description: "Seller not found" });
    if (!title.trim()) return toast({ title: "Validation Error", description: "Title is required" });

    setLoading(true);
    try {
      let brand_id: string | null = null;
      if (brandName) {
        const { data: brand } = await supabase.from("brands").select("brand_id").ilike("name", brandName).maybeSingle();
        if (brand) brand_id = brand.brand_id;
        else {
          const slug = brandName.toLowerCase().replace(/\s+/g, "-");
          const { data: inserted } = await supabase
            .from("brands")
            .insert({
              name: brandName,
              slug,
              description: "",
              logo_url: "",
              website: "",
              is_active: true,
              is_verified: false,
            })
            .select()
            .maybeSingle();
          brand_id = inserted?.brand_id || null;
        }
      }

      const payload: Partial<Product> = {
        title,
        description,
        base_price: Number(basePrice || 0),
        category_id: categoryId || "",
        seller_id: sellerId,
        status: draft ? "inactive" : "active",
      };

      if (editing) {
        await supabase.from("products").update(payload).eq("product_id", editing.product_id);
        toast({ title: "Product updated" });
      } else {
        const { data: inserted } = await supabase.from("products").insert(payload).select().maybeSingle();
        if (inserted && images.length) {
          for (const im of images) {
            await supabase.from("product_images").insert({ product_id: inserted.product_id, url: im.url });
          }
        }
        toast({ title: "Product created" });
      }

      setEditorOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Error saving product", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Product
  const deleteProduct = async (product_id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("product_images").delete().eq("product_id", product_id);
    await supabase.from("products").delete().eq("product_id", product_id);
    toast({ title: "Deleted successfully" });
    fetchProducts();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage products and their images</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditorOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
          <Button variant="outline" onClick={fetchProducts}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v as any))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Card key={p.product_id}>
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{p.title}</h3>
                        <p className="text-sm text-muted-foreground">₹{p.base_price}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(p); setEditorOpen(true); }}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteProduct(p.product_id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Badge className="mt-2">{p.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            <Label>Base Price</Label>
            <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            <Label>Category ID</Label>
            <Input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            <Label>Brand Name</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            <Label>Image URLs (Mock)</Label>
            <Input placeholder="https://example.com/image.jpg" onBlur={(e) => {
              if (e.target.value) setImages((prev) => [...prev, { url: e.target.value }]);
            }} />
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.map((im, i) => (
                <img key={i} src={im.url} className="w-20 h-20 object-cover rounded" alt="img" />
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => saveProduct(true)}>Save as Draft</Button>
              <Button onClick={() => saveProduct(false)}>Save</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
