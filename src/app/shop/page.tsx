"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ImageIcon,
  IndianRupee,
  Loader2,
  Package,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  getShopOrders,
  getShopProducts,
  updateShopOrderStatus,
  upsertShopProduct,
  type ShopOrder,
  type ShopOrderStatus,
  type ShopProduct,
  type ShopProductCategory,
  type ShopProductInput,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { normalizeKarateMediaUrl } from "@/lib/media-url";

const NEW_PRODUCT_ID = "__new__";

const CATEGORY_OPTIONS: Array<{ value: ShopProductCategory; label: string }> = [
  { value: "uniforms", label: "Uniforms" },
  { value: "belts", label: "Belts" },
  { value: "gear", label: "Gear" },
  { value: "merchandise", label: "Merchandise" },
];

const BELT_OPTIONS = ["None", "White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Black"];

const ORDER_STATUS_OPTIONS: Array<{ value: ShopOrderStatus; label: string }> = [
  { value: "processing", label: "Processing" },
  { value: "payment-pending", label: "Payment Pending" },
  { value: "pending-approval", label: "Needs Approval" },
  { value: "approved", label: "Approved" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

type ProductVariantDraft = {
  id: string;
  size: string;
  stock: string;
  requiresApproval: boolean;
};

type ProductDraft = {
  id: string;
  createdAt?: string;
  updatedAt?: string | null;
  name: string;
  description: string;
  category: ShopProductCategory;
  price: string;
  imagesText: string;
  rating: string;
  reviewCount: string;
  isPublic: boolean;
  requiresBelt: string;
  variants: ProductVariantDraft[];
};

function currency(value: number | string | null | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function emptyProductDraft(): ProductDraft {
  return {
    id: "",
    name: "",
    description: "",
    category: "merchandise",
    price: "",
    imagesText: "",
    rating: "0",
    reviewCount: "0",
    isPublic: true,
    requiresBelt: "None",
    variants: [{ id: "", size: "Standard", stock: "0", requiresApproval: false }],
  };
}

function draftFromProduct(product: ShopProduct): ProductDraft {
  return {
    id: product.id,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    name: product.name,
    description: product.description,
    category: product.category,
    price: String(product.price),
    imagesText: (product.images || []).join("\n"),
    rating: String(product.rating || 0),
    reviewCount: String(product.review_count || 0),
    isPublic: product.is_public,
    requiresBelt: product.requires_belt || "None",
    variants: product.variants.length
      ? product.variants.map((variant) => ({
          id: variant.id,
          size: variant.size,
          stock: String(variant.stock),
          requiresApproval: Boolean(variant.requiresApproval),
        }))
      : [{ id: "", size: "Standard", stock: "0", requiresApproval: false }],
  };
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function totalStock(product: ShopProduct) {
  return product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
}

function upsertProductList(products: ShopProduct[], saved: ShopProduct) {
  const exists = products.some((product) => product.id === saved.id);
  if (!exists) return [saved, ...products];
  return products.map((product) => (product.id === saved.id ? saved : product));
}

function statusTone(status: ShopOrderStatus) {
  if (status === "delivered" || status === "approved") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "pending-approval" || status === "payment-pending") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  if (status === "cancelled") return "border-zinc-700 bg-zinc-800 text-zinc-400";
  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
}

function ImagePreview({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const imageUrl = normalizeKarateMediaUrl(src);

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-black text-zinc-700 ${className}`}>
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={alt} className={`object-cover ${className}`} />
  );
}

export default function ShopPage() {
  const { user, checking } = useFeeTrackAuth();
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const selectedProductIdRef = useRef("");
  const [draft, setDraft] = useState<ProductDraft>(() => emptyProductDraft());
  const [editorOpen, setEditorOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ShopProductCategory>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | ShopOrderStatus>("all");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshingProducts, setRefreshingProducts] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async (forceRefresh = false) => {
    setError("");
    if (forceRefresh) setRefreshingProducts(true);
    else setLoadingProducts(true);

    try {
      const rows = await getShopProducts(forceRefresh);
      setProducts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load shop products.");
    } finally {
      setLoadingProducts(false);
      setRefreshingProducts(false);
    }
  }, []);

  const loadOrders = useCallback(async (forceRefresh = false) => {
    setError("");
    if (forceRefresh) setRefreshingOrders(true);
    else setLoadingOrders(true);

    try {
      const rows = await getShopOrders(forceRefresh);
      setOrders(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load shop orders.");
    } finally {
      setLoadingOrders(false);
      setRefreshingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    const timeoutId = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [checking, loadProducts, user]);

  useEffect(() => {
    if (checking || !user || activeTab !== "orders" || orders.length > 0) return;
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, checking, loadOrders, orders.length, user]);

  const draftImages = useMemo(() => splitLines(draft.imagesText), [draft.imagesText]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesSearch = !term || [product.id, product.name, product.description, product.category]
        .join(" ")
        .toLowerCase()
        .includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, productSearch, products]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
      const matchesSearch = !term || [
        order.orderId,
        order.skfId || "",
        order.customerName,
        order.customerPhone || "",
        ...order.items.map((item) => `${item.name} ${item.size}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [orderSearch, orderStatusFilter, orders]);

  const productSummary = useMemo(() => {
    const stock = products.reduce((sum, product) => sum + totalStock(product), 0);
    const athleteOnly = products.filter((product) => !product.is_public).length;
    return { count: products.length, stock, athleteOnly };
  }, [products]);

  const orderSummary = useMemo(() => {
    return {
      count: orders.length,
      revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      pending: orders.filter((order) => order.status === "pending-approval" || order.status === "payment-pending").length,
    };
  }, [orders]);

  function openProduct(product: ShopProduct) {
    selectedProductIdRef.current = product.id;
    setSelectedProductId(product.id);
    setDraft(draftFromProduct(product));
    setEditorOpen(true);
    setNotice("");
    setError("");
  }

  function startNewProduct() {
    selectedProductIdRef.current = NEW_PRODUCT_ID;
    setSelectedProductId(NEW_PRODUCT_ID);
    setDraft(emptyProductDraft());
    setEditorOpen(true);
    setNotice("");
    setError("");
  }

  function updateDraft(input: Partial<ProductDraft>) {
    setDraft((current) => ({ ...current, ...input }));
    setNotice("");
    setError("");
  }

  function updateVariant(index: number, input: Partial<ProductVariantDraft>) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...input } : variant,
      ),
    }));
    setNotice("");
    setError("");
  }

  function addVariant() {
    setDraft((current) => ({
      ...current,
      variants: [...current.variants, { id: "", size: "", stock: "0", requiresApproval: false }],
    }));
  }

  function removeVariant(index: number) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.length === 1
        ? current.variants
        : current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  function resetDraft() {
    if (selectedProductId && selectedProductId !== NEW_PRODUCT_ID) {
      const product = products.find((item) => item.id === selectedProductId);
      if (product) openProduct(product);
      return;
    }

    startNewProduct();
  }

  async function handleProductSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!draft.description.trim()) {
      setError("Product description is required.");
      return;
    }
    if (!draft.variants.some((variant) => variant.size.trim())) {
      setError("Add at least one size or variant.");
      return;
    }

    const isExisting = selectedProductId !== NEW_PRODUCT_ID && Boolean(selectedProductId);
    const payload: ShopProductInput = {
      id: isExisting ? draft.id : draft.id.trim() || undefined,
      created_at: draft.createdAt,
      updated_at: draft.updatedAt,
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      price: Number(draft.price || 0),
      images: draftImages,
      rating: Number(draft.rating || 0),
      review_count: Number(draft.reviewCount || 0),
      is_public: draft.isPublic,
      requires_belt: draft.isPublic || draft.requiresBelt === "None" ? null : draft.requiresBelt,
      variants: draft.variants
        .filter((variant) => variant.size.trim())
        .map((variant) => ({
          id: variant.id.trim() || undefined,
          size: variant.size.trim(),
          stock: Number(variant.stock || 0),
          requiresApproval: variant.requiresApproval,
        })),
    };

    setSavingProduct(true);
    setError("");
    setNotice("");
    try {
      const saved = await upsertShopProduct(payload);
      setProducts((current) => upsertProductList(current, saved));
      selectedProductIdRef.current = saved.id;
      setSelectedProductId(saved.id);
      setDraft(draftFromProduct(saved));
      setEditorOpen(false);
      setNotice("Product saved. The live SKF-Karate shop catalog has been refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleOrderStatus(order: ShopOrder, status: ShopOrderStatus) {
    setUpdatingOrderId(order.orderId);
    setError("");
    setNotice("");
    try {
      const updated = await updateShopOrderStatus(order.orderId, status);
      setOrders((current) => current.map((item) => (item.orderId === updated.orderId ? updated : item)));
      setNotice(`${updated.orderId} moved to ${updated.statusLabel}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order status.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-black text-zinc-300">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  const isEditingExisting = selectedProductId !== NEW_PRODUCT_ID && Boolean(selectedProductId);

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Shop" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Store Operations</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Shop Manager
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Manage products, images, variants, stock and order progress from one simple control screen.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-center text-xs">
            <div className="px-3 py-2">
              <p className="font-semibold text-white">{productSummary.count}</p>
              <p className="mt-1 text-zinc-600">Products</p>
            </div>
            <div className="border-x border-zinc-800 px-3 py-2">
              <p className="font-semibold text-white">{productSummary.stock}</p>
              <p className="mt-1 text-zinc-600">Stock</p>
            </div>
            <div className="px-3 py-2">
              <p className="font-semibold text-white">{orderSummary.pending}</p>
              <p className="mt-1 text-zinc-600">Pending</p>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors ${
                activeTab === "products" ? "bg-white text-black" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Package className="h-4 w-4" />
              Products
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors ${
                activeTab === "orders" ? "bg-white text-black" : "text-zinc-500 hover:text-white"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Orders
            </button>
          </div>

          <button
            type="button"
            onClick={() => activeTab === "products" ? void loadProducts(true) : void loadOrders(true)}
            className="btn-ghost inline-flex min-h-10 items-center justify-center gap-2"
            disabled={refreshingProducts || refreshingOrders}
          >
            <RefreshCw className={`h-4 w-4 ${refreshingProducts || refreshingOrders ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {activeTab === "products" ? (
          <section className="space-y-5">
            <div className="card-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Catalog</p>
                  <h2 className="text-lg font-semibold text-white">Products</h2>
                </div>
                <button
                  type="button"
                  onClick={startNewProduct}
                  className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-sm"
                  aria-label="Add product"
                >
                  <PackagePlus className="h-4 w-4" />
                  Create Product
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3">
                  <Search className="h-4 w-4 text-zinc-600" />
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search products"
                    className="min-h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as "all" | ShopProductCategory)}
                  className="input-minimal"
                >
                  <option value="all">All categories</option>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

              {loadingProducts ? (
                <div className="flex h-56 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="card-panel flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">No products found.</p>
                  <button type="button" onClick={startNewProduct} className="btn-primary inline-flex items-center gap-2">
                    <PackagePlus className="h-4 w-4" />
                    Create Product
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const firstImage = product.images[0] || "";
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => openProduct(product)}
                        className="card-panel group overflow-hidden text-left transition-colors hover:border-zinc-700"
                      >
                        <ImagePreview
                          src={firstImage}
                          alt={product.name}
                          className="aspect-[4/3] w-full border-b border-zinc-800"
                        />
                        <div className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">{product.id}</p>
                            </div>
                            <span className="whitespace-nowrap text-sm font-semibold text-white">{currency(product.price)}</span>
                          </div>
                          <p className="line-clamp-2 min-h-10 text-xs leading-relaxed text-zinc-500">{product.description}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {product.category}
                            </span>
                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {totalStock(product)} stock
                            </span>
                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {product.is_public ? "Public" : "Athlete-only"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            {editorOpen ? (
              <div
                className="glass-modal-overlay"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !savingProduct) setEditorOpen(false);
                }}
              >
            <form onSubmit={handleProductSave} className="glass-modal !max-w-5xl grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="card-panel p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500">
                      {isEditingExisting ? "Edit Product" : "Create Product"}
                    </p>
                    <h2 className="text-lg font-semibold text-white">
                      {draft.name || "New product"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    disabled={savingProduct}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close product editor"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Product Name</span>
                      <input
                        value={draft.name}
                        onChange={(event) => updateDraft({ name: event.target.value })}
                        className="input-minimal"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Product ID</span>
                      <input
                        value={draft.id}
                        onChange={(event) => updateDraft({ id: event.target.value })}
                        className="input-minimal disabled:opacity-50"
                        placeholder="Auto-generated"
                        disabled={isEditingExisting}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Category</span>
                      <select
                        value={draft.category}
                        onChange={(event) => updateDraft({ category: event.target.value as ShopProductCategory })}
                        className="input-minimal"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Price</span>
                      <input
                        type="number"
                        min="0"
                        value={draft.price}
                        onChange={(event) => updateDraft({ price: event.target.value })}
                        className="input-minimal"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft({ description: event.target.value })}
                      rows={5}
                      className="input-minimal min-h-32 resize-y"
                      required
                    />
                  </label>

                  <div>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Images</span>
                      <textarea
                        value={draft.imagesText}
                        onChange={(event) => updateDraft({ imagesText: event.target.value })}
                        rows={4}
                        className="input-minimal min-h-28 resize-y"
                        placeholder="One image URL per line"
                      />
                    </label>
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {draftImages.length ? draftImages.slice(0, 6).map((image, index) => (
                        <ImagePreview
                          key={`${image}-${index}`}
                          src={image}
                          alt={`Product image ${index + 1}`}
                          className="aspect-square w-full rounded-md border border-zinc-800"
                        />
                      )) : (
                        <div className="col-span-full rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-600">
                          Add image URLs to preview product photos.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Access</span>
                      <select
                        value={draft.isPublic ? "public" : "athlete"}
                        onChange={(event) => updateDraft({ isPublic: event.target.value === "public" })}
                        className="input-minimal"
                      >
                        <option value="public">Public checkout</option>
                        <option value="athlete">Athletes only</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Required Belt</span>
                      <select
                        value={draft.isPublic ? "None" : draft.requiresBelt}
                        onChange={(event) => updateDraft({ requiresBelt: event.target.value })}
                        className="input-minimal disabled:opacity-50"
                        disabled={draft.isPublic}
                      >
                        {BELT_OPTIONS.map((belt) => (
                          <option key={belt} value={belt}>
                            {belt}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Rating</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={draft.rating}
                        onChange={(event) => updateDraft({ rating: event.target.value })}
                        className="input-minimal"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Reviews</span>
                      <input
                        type="number"
                        min="0"
                        value={draft.reviewCount}
                        onChange={(event) => updateDraft({ reviewCount: event.target.value })}
                        className="input-minimal"
                      />
                    </label>
                  </div>

                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-500">Variants and Stock</p>
                        <h3 className="text-sm font-semibold text-white">Sizes, units and approval rules</h3>
                      </div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="btn-ghost inline-flex min-h-10 items-center gap-2"
                      >
                        <PackagePlus className="h-4 w-4" />
                        Add
                      </button>
                    </div>

                    <div className="space-y-3">
                      {draft.variants.map((variant, index) => (
                        <div key={`${variant.id || "variant"}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_auto] sm:items-end">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-600">Size</span>
                                <input
                                  value={variant.size}
                                  onChange={(event) => updateVariant(index, { size: event.target.value })}
                                  className="input-minimal"
                                  placeholder="Standard"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-600">Variant ID</span>
                                <input
                                  value={variant.id}
                                  onChange={(event) => updateVariant(index, { id: event.target.value })}
                                  className="input-minimal"
                                  placeholder="Optional"
                                />
                              </label>
                            </div>

                            <label className="block">
                              <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-600">Stock</span>
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(event) => updateVariant(index, { stock: event.target.value })}
                                className="input-minimal"
                              />
                            </label>

                            <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                              <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-400">
                                <input
                                  type="checkbox"
                                  checked={variant.requiresApproval}
                                  onChange={(event) => updateVariant(index, { requiresApproval: event.target.checked })}
                                />
                                Approval
                              </label>
                              <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                disabled={draft.variants.length === 1}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Remove variant"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2"
                    >
                      {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingProduct ? "Saving" : "Save Product"}
                    </button>
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="btn-ghost min-h-11"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </section>

              <aside className="card-panel h-fit overflow-hidden">
                <div className="aspect-square bg-black">
                  <ImagePreview
                    src={draftImages[0]}
                    alt={draft.name || "Product preview"}
                    className="h-full w-full"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {draft.category}
                    </span>
                    <span className="text-sm font-semibold text-white">{currency(draft.price)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{draft.name || "Product preview"}</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-zinc-500">
                    {draft.description || "Description preview will appear here."}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-zinc-600">Images</p>
                      <p className="mt-1 font-semibold text-white">{draftImages.length}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-zinc-600">Variants</p>
                      <p className="mt-1 font-semibold text-white">{draft.variants.length}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
                    {draft.isPublic ? "Available for public checkout." : `Athlete-only${draft.requiresBelt !== "None" ? `, ${draft.requiresBelt}+ belt` : ""}.`}
                  </div>
                </div>
              </aside>
            </form>
          </div>
            ) : null}
          </section>
        ) : (
          <section className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card-panel p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Orders</p>
                <p className="mt-2 text-2xl font-semibold text-white">{orderSummary.count}</p>
              </div>
              <div className="card-panel p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-white">{currency(orderSummary.revenue)}</p>
              </div>
              <div className="card-panel p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Pending Work</p>
                <p className="mt-2 text-2xl font-semibold text-white">{orderSummary.pending}</p>
              </div>
            </div>

            <div className="card-panel p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3">
                  <Search className="h-4 w-4 text-zinc-600" />
                  <input
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search order, customer, SKF ID, phone or product"
                    className="min-h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(event) => setOrderStatusFilter(event.target.value as "all" | ShopOrderStatus)}
                  className="input-minimal"
                >
                  <option value="all">All statuses</option>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingOrders ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="card-panel flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
                <ShoppingBag className="h-8 w-8 text-zinc-600" />
                <p className="text-sm text-zinc-500">No shop orders found.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredOrders.map((order) => (
                  <article key={order.orderId} className="card-panel p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-mono text-sm font-semibold text-white">{order.orderId}</h3>
                          <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(order.status)}`}>
                            {order.statusLabel}
                          </span>
                          {order.skfId ? (
                            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              {order.skfId}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">{order.customerName}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {order.customerPhone || "No phone"} / {order.fulfillmentMethod === "dojo-pickup" ? "Dojo pickup" : "Shipping"}
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[160px_220px] lg:flex-shrink-0">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                          <p className="flex items-center gap-1.5 text-xs text-zinc-600">
                            <IndianRupee className="h-3.5 w-3.5" />
                            Total
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">{currency(order.total)}</p>
                        </div>
                        <select
                          value={order.status}
                          onChange={(event) => void handleOrderStatus(order, event.target.value as ShopOrderStatus)}
                          disabled={updatingOrderId === order.orderId}
                          className="input-minimal min-h-14"
                        >
                          {ORDER_STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {order.items.map((item) => (
                        <div key={`${order.orderId}-${item.variantId}`} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                          <ImagePreview
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 flex-shrink-0 rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-200">{item.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-600">
                              {item.size} / Qty {item.quantity} / {currency(item.lineTotal)}
                            </p>
                          </div>
                          {item.requiresApproval ? (
                            <span className="hidden rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 sm:inline-flex">
                              Approval
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
