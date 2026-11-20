"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import AccountMenu from "@/components/common/AccountMenu";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
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

function orderLedgerStatus(status: ShopOrderStatus): LedgerStatus {
  if (status === "payment-pending") return "verifying";
  return "neutral";
}

function ImagePreview({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const imageUrl = normalizeKarateMediaUrl(src);

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-[color:var(--color-well)] text-[color:var(--color-text-faint)] ${className}`}>
        <ImageIcon className="h-[24px] w-[24px]" />
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
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      void loadProducts();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checking, loadProducts, user]);

  useEffect(() => {
    if (checking || !user || activeTab !== "orders" || orders.length > 0) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      void loadOrders();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
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
      <div className="min-h-screen text-[color:var(--color-text)]">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
        </div>
      </div>
    );
  }

  const isEditingExisting = selectedProductId !== NEW_PRODUCT_ID && Boolean(selectedProductId);

  return (
    <PageShell
      hud={{
        title: "Shop",
        backHref: "/dashboard",
        actions: <AccountMenu />,
      }}
    >
      <div>
        <header className="mb-[32px] flex flex-col gap-[20px] md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-[12px] flex items-center gap-[12px]">
              <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--color-accent)]" />
              <p className="eyebrow text-[color:var(--color-text-dim)]">Store Operations</p>
            </div>
            <h1 className="mt-[4px] text-[15px] font-semibold text-[color:var(--color-text)]">Shop Manager</h1>
            <p className="mt-[12px] max-w-2xl text-sm leading-relaxed text-[color:var(--color-text-dim)]">
              Manage products, images, variants, stock and order progress from one simple control screen.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-[12px]">
            <StatTile label="Products" value={String(productSummary.count)} />
            <StatTile label="Stock" value={String(productSummary.stock)} />
            <StatTile label="Pending" value={String(orderSummary.pending)} tone="action" />
          </div>
        </header>

        <div className="mb-[24px] flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
          <SegmentedTabs
            ariaLabel="Shop section"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "products", label: "Products" },
              { value: "orders", label: "Orders" },
            ]}
          />

          <button
            type="button"
            onClick={() => activeTab === "products" ? void loadProducts(true) : void loadOrders(true)}
            className="btn-ghost inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-[8px]"
            disabled={refreshingProducts || refreshingOrders}
          >
            <RefreshCw className={`h-[16px] w-[16px] ${refreshingProducts || refreshingOrders ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <CheckCircle2 className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {activeTab === "products" ? (
          <section className="space-y-[20px]">
            <div className="hud-panel p-[16px]">
              <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[12px]">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[color:var(--color-text-dim)]">Catalog</p>
                  <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Products</h2>
                </div>
                <button
                  type="button"
                  onClick={startNewProduct}
                  className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[16px] py-[8px] text-sm"
                  aria-label="Add product"
                >
                  <PackagePlus className="h-[16px] w-[16px]" />
                  Create Product
                </button>
              </div>

              <div className="grid min-w-[0px] grid-cols-[minmax(0,1fr)] gap-[12px] md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="flex min-w-[0px] items-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px]">
                  <Search className="h-[16px] w-[16px] text-[color:var(--color-text-faint)]" />
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search products"
                    className="min-h-[44px] min-w-[0px] flex-1 bg-transparent text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)]"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as "all" | ShopProductCategory)}
                  className="input-minimal min-w-[0px] max-w-full"
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
                <div className="flex h-[224px] items-center justify-center">
                  <Loader2 className="h-[20px] w-[20px] animate-spin text-[color:var(--color-text-dim)]" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="card-panel flex min-h-[224px] flex-col items-center justify-center gap-[16px] p-[32px] text-center">
                  <ShoppingBag className="h-[32px] w-[32px] text-[color:var(--color-text-faint)]" />
                  <p className="text-sm text-[color:var(--color-text-dim)]">No products found.</p>
                  <button type="button" onClick={startNewProduct} className="btn-primary inline-flex items-center gap-[8px]">
                    <PackagePlus className="h-[16px] w-[16px]" />
                    Create Product
                  </button>
                </div>
              ) : (
                <div className="hud-panel overflow-hidden">
                  <div className="divide-y divide-[color:var(--color-hairline)]">
                    {filteredProducts.map((product, index) => (
                      <LedgerRow
                        key={product.id}
                        index={index}
                        status="neutral"
                        title={product.name}
                        subtitle={product.description}
                        idLabel={`${product.id} · ${totalStock(product)} STOCK`}
                        amount={currency(product.price)}
                        amountLabel="price"
                        trailing={
                          <div className="flex items-center gap-[8px]">
                            <ImagePreview
                              src={product.images[0] || ""}
                              alt={product.name}
                              className="h-[44px] w-[44px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)]"
                            />
                            <StatusPill
                              status="neutral"
                              label={product.is_public ? "Public" : "Athlete"}
                              ariaLabel={`${product.name} visibility`}
                            />
                          </div>
                        }
                        onClick={() => openProduct(product)}
                      />
                    ))}
                  </div>
                </div>
              )}
            <Sheet
              open={editorOpen}
              title={isEditingExisting ? "Edit Product" : "Create Product"}
              onClose={() => {
                if (!savingProduct) setEditorOpen(false);
              }}
              footer={
                <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-[1fr_1fr_1.5fr]">
                  <button
                    type="button"
                    onClick={resetDraft}
                    disabled={savingProduct}
                    className="tap-target inline-flex items-center justify-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-sm text-[color:var(--color-text)] disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    disabled={savingProduct}
                    className="tap-target inline-flex items-center justify-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-sm text-[color:var(--color-text)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="product-form"
                    disabled={savingProduct}
                    className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)] disabled:opacity-50"
                  >
                    {savingProduct ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <Save className="h-[16px] w-[16px]" />}
                    {savingProduct ? "Saving" : "Save Product"}
                  </button>
                </div>
              }
            >
              <form id="product-form" onSubmit={handleProductSave} className="grid gap-[20px] pt-[4px] lg:grid-cols-[minmax(0,1fr)_260px]">
                <section className="hud-panel p-[16px] sm:p-[20px]">
                <div className="space-y-[24px]">
                  <div className="grid gap-[16px] sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Product Name</span>
                      <input
                        value={draft.name}
                        onChange={(event) => updateDraft({ name: event.target.value })}
                        className="input-minimal"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Product ID</span>
                      <input
                        value={draft.id}
                        onChange={(event) => updateDraft({ id: event.target.value })}
                        className="input-minimal disabled:opacity-50"
                        placeholder="Auto-generated"
                        disabled={isEditingExisting}
                      />
                    </label>
                  </div>

                  <div className="grid gap-[16px] sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Category</span>
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
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Price</span>
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
                    <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft({ description: event.target.value })}
                      rows={5}
                      className="input-minimal min-h-[128px] resize-y"
                      required
                    />
                  </label>

                  <div>
                    <label className="block">
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Images</span>
                      <textarea
                        value={draft.imagesText}
                        onChange={(event) => updateDraft({ imagesText: event.target.value })}
                        rows={4}
                        className="input-minimal min-h-[112px] resize-y"
                        placeholder="One image URL per line"
                      />
                    </label>
                    <div className="mt-[12px] grid grid-cols-4 gap-[8px] sm:grid-cols-6">
                      {draftImages.length ? draftImages.slice(0, 6).map((image, index) => (
                        <ImagePreview
                          key={`${image}-${index}`}
                          src={image}
                          alt={`Product image ${index + 1}`}
                          className="aspect-square w-full rounded-[var(--radius-row)] border border-[color:var(--color-hairline)]"
                        />
                      )) : (
                        <div className="col-span-full rounded-[var(--radius-row)] border border-dashed border-[color:var(--color-hairline)] p-[16px] text-sm text-[color:var(--color-text-faint)]">
                          Add image URLs to preview product photos.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Access</span>
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
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Required Belt</span>
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
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Rating</span>
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
                      <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Reviews</span>
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
                    <div className="mb-[12px] flex items-center justify-between gap-[12px]">
                      <div>
                        <p className="eyebrow text-[color:var(--color-text-dim)]">Variants and Stock</p>
                        <h3 className="text-sm font-semibold text-[color:var(--color-text)]">Sizes, units and approval rules</h3>
                      </div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="btn-ghost inline-flex min-h-[44px] items-center gap-[8px]"
                      >
                        <PackagePlus className="h-[16px] w-[16px]" />
                        Add
                      </button>
                    </div>

                    <div className="space-y-[12px]">
                      {draft.variants.map((variant, index) => (
                        <div key={`${variant.id || "variant"}-${index}`} className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
                          <div className="grid gap-[12px] sm:grid-cols-[minmax(0,1fr)_130px_auto] sm:items-end">
                            <div className="grid gap-[12px] sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-[8px] block eyebrow text-[color:var(--color-text-faint)]">Size</span>
                                <input
                                  value={variant.size}
                                  onChange={(event) => updateVariant(index, { size: event.target.value })}
                                  className="input-minimal"
                                  placeholder="Standard"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-[8px] block eyebrow text-[color:var(--color-text-faint)]">Variant ID</span>
                                <input
                                  value={variant.id}
                                  onChange={(event) => updateVariant(index, { id: event.target.value })}
                                  className="input-minimal"
                                  placeholder="Optional"
                                />
                              </label>
                            </div>

                            <label className="block">
                              <span className="mb-[8px] block eyebrow text-[color:var(--color-text-faint)]">Stock</span>
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(event) => updateVariant(index, { stock: event.target.value })}
                                className="input-minimal"
                              />
                            </label>

                            <div className="flex items-center gap-[8px] sm:flex-col sm:items-stretch">
                              <label className="flex min-h-[44px] flex-1 items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-xs font-semibold text-[color:var(--color-text-dim)]">
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
                                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Remove variant"
                              >
                                <X className="h-[16px] w-[16px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                </div>
              </section>

              <aside className="hud-panel h-fit overflow-hidden">
                <div className="aspect-square bg-[color:var(--color-well)]">
                  <ImagePreview
                    src={draftImages[0]}
                    alt={draft.name || "Product preview"}
                    className="h-full w-full"
                  />
                </div>
                <div className="p-[16px]">
                  <div className="mb-[12px] flex items-center justify-between gap-[12px]">
                    <span className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[8px] py-[4px] text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-dim)]">
                      {draft.category}
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--color-text)]">{currency(draft.price)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{draft.name || "Product preview"}</h3>
                  <p className="mt-[8px] line-clamp-4 text-sm leading-relaxed text-[color:var(--color-text-dim)]">
                    {draft.description || "Description preview will appear here."}
                  </p>
                  <div className="mt-[16px] grid grid-cols-2 gap-[8px] text-xs">
                    <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
                      <p className="text-[color:var(--color-text-faint)]">Images</p>
                      <p className="mt-[4px] font-semibold text-[color:var(--color-text)]">{draftImages.length}</p>
                    </div>
                    <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
                      <p className="text-[color:var(--color-text-faint)]">Variants</p>
                      <p className="mt-[4px] font-semibold text-[color:var(--color-text)]">{draft.variants.length}</p>
                    </div>
                  </div>
                  <div className="mt-[12px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px] text-xs text-[color:var(--color-text-dim)]">
                    {draft.isPublic ? "Available for public checkout." : `Athlete-only${draft.requiresBelt !== "None" ? `, ${draft.requiresBelt}+ belt` : ""}.`}
                  </div>
                </div>
              </aside>
              </form>
            </Sheet>
          </section>
        ) : (
          <section className="space-y-[20px]">
            <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3">
              <StatTile label="Orders" value={String(orderSummary.count)} />
              <StatTile label="Revenue" value={currency(orderSummary.revenue)} tone="settled" />
              <StatTile label="Pending Work" value={String(orderSummary.pending)} tone="action" />
            </div>

            <div className="card-panel p-[16px]">
              <div className="grid min-w-[0px] grid-cols-[minmax(0,1fr)] gap-[12px] md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="flex min-w-[0px] items-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px]">
                  <Search className="h-[16px] w-[16px] text-[color:var(--color-text-faint)]" />
                  <input
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search order, customer, SKF ID, phone or product"
                    className="min-h-[44px] min-w-[0px] flex-1 bg-transparent text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)]"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(event) => setOrderStatusFilter(event.target.value as "all" | ShopOrderStatus)}
                  className="input-minimal min-w-[0px] max-w-full"
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
              <div className="flex h-[224px] items-center justify-center">
                <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="card-panel flex min-h-[224px] flex-col items-center justify-center gap-[12px] p-[32px] text-center">
                <ShoppingBag className="h-[32px] w-[32px] text-[color:var(--color-text-faint)]" />
                <p className="text-sm text-[color:var(--color-text-dim)]">No shop orders found.</p>
              </div>
            ) : (
              <div className="hud-panel overflow-hidden">
                <div className="divide-y divide-[color:var(--color-hairline)]">
                  {filteredOrders.map((order, index) => {
                    const status = orderLedgerStatus(order.status);
                    return (
                      <LedgerRow
                        key={order.orderId}
                        index={index}
                        status={status}
                        title={order.customerName}
                        subtitle={`${order.customerPhone || "No phone"} · ${order.fulfillmentMethod === "dojo-pickup" ? "Dojo pickup" : "Shipping"}`}
                        idLabel={`${order.orderId}${order.skfId ? ` · ${order.skfId}` : ""} · ${order.items.length} ITEM${order.items.length === 1 ? "" : "S"}`}
                        amount={currency(order.total)}
                        amountLabel="total"
                        trailing={
                          <div className="flex flex-col items-end gap-[8px]">
                            <StatusPill status={status} label={order.statusLabel} />
                            <select
                              value={order.status}
                              onChange={(event) => void handleOrderStatus(order, event.target.value as ShopOrderStatus)}
                              disabled={updatingOrderId === order.orderId}
                              aria-label={`Update status for ${order.orderId}`}
                              className="input-minimal min-h-[44px] px-[8px] text-xs"
                            >
                              {ORDER_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </PageShell>
  );
}
