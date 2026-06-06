import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, CheckCircle2, XCircle, Users, DollarSign, TrendingUp,
  Eye, Package, Plus, Upload, Trash2, Image, Tag, X, UserCheck, Star, ImageIcon,
  Pencil, Search, ChevronLeft, ChevronRight, ArrowUpDown,
  GripVertical, Layers, Globe, Save, RotateCcw,
} from "lucide-react";
import { useApp } from "../store/AppContext";
import type { Feature } from "../store/AppContext";
import type { Product, Category, Review, ProductVariant, ProductStatus, PromoCode, ShippingRate } from "../lib/mockData";
import { Button, StatusBadge, Badge } from "../components/ui";
import { ConfirmModal } from "../components/ConfirmModal";

type Tab = "analytics" | "products" | "categories" | "orders" | "payments" | "requests" | "users" | "siteContent" | "promoCodes" | "shipping";

/* ==========================================================
 *  ADMIN DASHBOARD — top-level container
 * ========================================================== */
export default function AdminDashboard() {
  const { t, user, orders, customRequests, loading } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("analytics");

  // ✅ FIX: Never call navigate() during render — causes React Router invariant crash
  // when navigating away (e.g. to /cart). Move the guard into useEffect.
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show nothing while auth is resolving or while redirecting
  if (loading || !user || user.role !== "admin") return null;

  const pendingOrdersCount = orders.filter((o) => o.orderStatus === "pending").length;
  const pendingPayments = orders.filter(
    (o) => o.paymentMethod === "vodafone" && o.paymentStatus === "pending"
  ).length;
  const pendingRequests = customRequests.filter((r) => r.status === "pending").length;

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "analytics", label: t.admin.analytics, icon: LayoutDashboard },
    { key: "orders", label: t.admin.orders, icon: ShoppingCart, badge: pendingOrdersCount },
    { key: "payments", label: t.admin.payments, icon: CheckCircle2, badge: pendingPayments },
    { key: "products", label: t.admin.products, icon: Package },
    { key: "categories", label: t.admin.categories, icon: Tag },
    { key: "requests", label: t.admin.requests, icon: Eye, badge: pendingRequests },
    { key: "users", label: "العملاء", icon: UserCheck },
    { key: "siteContent", label: "محتوى الموقع", icon: ImageIcon },
    { key: "promoCodes", label: t.admin.promoCodes, icon: Tag },
    { key: "shipping", label: t.admin.shipping, icon: Package },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-brand-black dark:text-brand-white flex items-center gap-3">
          {t.admin.title} <Badge color="lime">ADMIN</Badge>
        </h1>
        <p className="mt-2 text-brand-black/60 dark:text-brand-white/60">{user.email}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1 glass rounded-3xl p-4 h-fit">
          <nav className="space-y-1">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                  tab === tb.key
                    ? "bg-brand-lime text-brand-black glow-lime-sm"
                    : "text-brand-black/70 dark:text-brand-white/70 hover:bg-brand-lime/10"
                }`}
              >
                <span className="flex items-center gap-3">
                  <tb.icon size={18} /> {tb.label}
                </span>
                {tb.badge !== undefined && tb.badge > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                    {tb.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-4">
          {tab === "analytics" && <Analytics />}
          {tab === "orders" && <OrdersTab />}
          {tab === "payments" && <PaymentsTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "requests" && <RequestsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "siteContent" && <SiteContentTab />}
          {tab === "promoCodes" && <PromoCodesTab />}
          {tab === "shipping" && <ShippingTab />}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
 *  ANALYTICS
 * ========================================================== */
function Analytics() {
  const { t, orders } = useApp();
  const totalRevenue = orders
    .filter((o) => o.orderStatus === "delivered" || o.paymentStatus === "verified")
    .reduce((s, o) => s + o.total, 0);
  const usersCount = new Set(orders.map((o) => o.user)).size;

  const stats = [
    { label: t.admin.revenue, value: `${totalRevenue.toLocaleString()} ${t.egyptPound}`, icon: DollarSign, from: "from-[#8dff1a]", to: "to-[#7bea12]", text: "text-brand-green" },
    { label: t.admin.totalOrders, value: orders.length, icon: ShoppingCart, from: "from-[#004d1a]", to: "to-[#006b23]", text: "text-brand-lime" },
    { label: t.admin.users, value: usersCount, icon: Users, from: "from-[#6d28d9]", to: "to-[#4338ca]", text: "text-white" },
    { label: "Growth", value: "+24%", icon: TrendingUp, from: "from-[#f97316]", to: "to-[#ec4899]", text: "text-white" },
  ];

  // Simple bar chart data: order counts per status
  const statuses = ["underReview", "pendingPaymentVerification", "pending", "confirmed", "processing", "preparingShipment", "shipped", "outForDelivery", "delivered", "cancelled", "rejected"] as const;
  const chartData = statuses.map((s) => ({
    label: (t.statuses as any)[s],
    value: orders.filter((o) => o.orderStatus === s).length,
  }));
  const maxVal = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-3xl p-5 bg-gradient-to-br ${s.from} ${s.to} ${s.text} shadow-lg overflow-hidden relative`}
          >
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
            <s.icon size={28} className="mb-3 opacity-90" />
            <p className="text-xs opacity-80 font-medium">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-xl text-brand-black dark:text-brand-white mb-4">
          Orders by Status
        </h2>
        <div className="flex items-end gap-4 h-56">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-brand-black dark:text-brand-white">{d.value}</span>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-lime to-[#b6ff6e] transition-all hover:opacity-80" style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: d.value > 0 ? "8px" : "0" }} />
              <span className="text-[10px] font-bold text-brand-black/70 dark:text-brand-white/70 text-center">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders list */}
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-xl text-brand-black dark:text-brand-white mb-4">Recent Orders</h2>
        <div className="space-y-3">
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-brand-black/30">
              <div>
                <p className="font-bold text-sm text-brand-black dark:text-brand-white">{o.id}</p>
                <p className="text-xs text-brand-black/60 dark:text-brand-white/60">{o.name}</p>
              </div>
              <StatusBadge status={o.orderStatus} />
              <p className="font-black text-brand-green text-sm">{o.total} {t.egyptPound}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
 *  ORDERS MANAGEMENT
 * ========================================================== */
function OrdersTab() {
  const { t, orders, products, updateOrderStatus, updateShippingInfo } = useApp();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingShipping, setEditingShipping] = useState<string | null>(null);
  const [shippingForm, setShippingForm] = useState({
    shippingCompany: "",
    trackingNumber: "",
    shippingNotes: "",
    estimatedDelivery: "",
    shippedAt: "",
  });

  const filtered = orders
    .filter((o) => (filter === "all" ? true : o.orderStatus === filter))
    .filter((o) => o.id.toLowerCase().includes(search.toLowerCase()) || o.name.toLowerCase().includes(search.toLowerCase()));

  const statusOptions = [
    { key: "underReview", label: t.statuses.underReview },
    { key: "pendingPaymentVerification", label: t.statuses.pendingPaymentVerification },
    { key: "pending", label: t.statuses.pending },
    { key: "confirmed", label: t.statuses.confirmed },
    { key: "processing", label: t.statuses.processing },
    { key: "preparingShipment", label: t.statuses.preparingShipment },
    { key: "shipped", label: t.statuses.shipped },
    { key: "outForDelivery", label: t.statuses.outForDelivery },
    { key: "delivered", label: t.statuses.delivered },
    { key: "paymentIssue", label: t.statuses.paymentIssue },
    { key: "cancelled", label: t.statuses.cancelled },
    { key: "rejected", label: t.statuses.rejected },
  ];

  const openShippingEdit = (o: any) => {
    setEditingShipping(o.id);
    setShippingForm({
      shippingCompany: o.shippingCompany || "",
      trackingNumber: o.trackingNumber || "",
      shippingNotes: o.shippingNotes || "",
      estimatedDelivery: o.estimatedDelivery ? o.estimatedDelivery.slice(0, 10) : "",
      shippedAt: o.shippedAt ? o.shippedAt.slice(0, 10) : "",
    });
  };

  const saveShipping = (orderId: string) => {
    updateShippingInfo(orderId, {
      shippingCompany: shippingForm.shippingCompany || undefined,
      trackingNumber: shippingForm.trackingNumber || undefined,
      shippingNotes: shippingForm.shippingNotes || undefined,
      estimatedDelivery: shippingForm.estimatedDelivery ? new Date(shippingForm.estimatedDelivery).toISOString() : undefined,
      shippedAt: shippingForm.shippedAt ? new Date(shippingForm.shippedAt).toISOString() : undefined,
    });
    setEditingShipping(null);
  };

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search order ID or customer name..."
          className="flex-1 rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2.5 text-sm font-bold text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <p className="text-xs font-bold text-brand-black/60 dark:text-brand-white/60 self-center">{filtered.length} orders</p>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="bg-white/50 dark:bg-brand-black/30 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-black text-brand-black dark:text-brand-white">{o.id}</p>
                <p className="text-sm text-brand-black/70 dark:text-brand-white/70">{o.name} • {o.phone}</p>
                <p className="text-xs text-brand-black/50 dark:text-brand-white/50 mt-0.5">
                  📍 {o.address} — {o.governorate}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={o.orderStatus} />
                <StatusBadge status={o.paymentStatus} />
                <select
                  value={o.orderStatus}
                  onChange={(e) => updateOrderStatus(o.id, e.target.value as any)}
                  className="rounded-lg bg-brand-lime text-brand-black text-xs font-bold px-2.5 py-1.5 outline-none"
                >
                  {statusOptions.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-xs text-brand-black/70 dark:text-brand-white/70 flex flex-wrap gap-4">
              <span>💰 {o.total} {t.egyptPound}</span>
              <span>💳 {o.paymentMethod === "cod" ? t.checkout.cod : t.checkout.vodafone}</span>
              <span>📅 {new Date(o.createdAt).toLocaleDateString()}</span>
              {o.notes && <span>📝 {o.notes}</span>}
            </div>
<div className="mt-3 border-t border-brand-green/20 pt-3">
  <p className="font-bold text-sm mb-2">
    المنتجات المطلوبة:
  </p>

  {o.products?.map((item, index) => {
    const product = products.find(
      (p) => p.id === item.productId
    );

   return (
  <div
    key={index}
    className="flex items-center justify-between gap-4 py-2 border-b border-brand-green/10"
  >
    <div className="flex items-center gap-3">
      <img
        src={product?.images?.[0]}
        alt={product?.name}
        className="w-14 h-14 rounded-lg object-cover border"
      />

      <div>
        <p className="font-semibold">
          {product?.nameAr || product?.name || item.productId}
        </p>

        <p className="text-xs opacity-70">
          الكمية: {item.quantity}
        </p>
      </div>
    </div>

    <span className="font-bold">
      {item.price} جنيه
    </span>
  </div>
);
            {/* Shipping info summary */}
            {(o.shippingCompany || o.trackingNumber) && (
              <div className="mt-2 text-xs text-brand-black/60 dark:text-brand-white/60 flex flex-wrap gap-3">
                {o.shippingCompany && <span>🚚 {o.shippingCompany}</span>}
                {o.trackingNumber && <span>📦 #{o.trackingNumber}</span>}
                {o.estimatedDelivery && <span>📅 ETA: {new Date(o.estimatedDelivery).toLocaleDateString()}</span>}
              </div>
            )}

            {/* Shipping edit button */}
            <div className="mt-3">
              {editingShipping === o.id ? (
                <div className="mt-2 p-4 bg-brand-lime/10 rounded-xl space-y-3">
                  <p className="font-black text-sm text-brand-black dark:text-brand-white">✏️ Edit Shipping Info</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      value={shippingForm.shippingCompany}
                      onChange={(e) => setShippingForm({ ...shippingForm, shippingCompany: e.target.value })}
                      placeholder="Shipping Company"
                      className="rounded-lg bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2 text-sm text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                    />
                    <input
                      value={shippingForm.trackingNumber}
                      onChange={(e) => setShippingForm({ ...shippingForm, trackingNumber: e.target.value })}
                      placeholder="Tracking Number"
                      className="rounded-lg bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2 text-sm text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                    />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-brand-black/60 dark:text-brand-white/60">Shipped Date</label>
                      <input
                        type="date"
                        value={shippingForm.shippedAt}
                        onChange={(e) => setShippingForm({ ...shippingForm, shippedAt: e.target.value })}
                        className="rounded-lg bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2 text-sm text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-brand-black/60 dark:text-brand-white/60">Estimated Delivery</label>
                      <input
                        type="date"
                        value={shippingForm.estimatedDelivery}
                        onChange={(e) => setShippingForm({ ...shippingForm, estimatedDelivery: e.target.value })}
                        className="rounded-lg bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2 text-sm text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                      />
                    </div>
                    <input
                      value={shippingForm.shippingNotes}
                      onChange={(e) => setShippingForm({ ...shippingForm, shippingNotes: e.target.value })}
                      placeholder="Shipping Notes"
                      className="rounded-lg bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2 text-sm text-brand-black dark:text-brand-white outline-none focus:border-brand-lime md:col-span-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveShipping(o.id)}
                      className="px-4 py-1.5 bg-brand-lime text-brand-black text-xs font-black rounded-lg hover:opacity-90 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingShipping(null)}
                      className="px-4 py-1.5 bg-white/50 dark:bg-brand-black/30 text-brand-black/70 dark:text-brand-white/70 text-xs font-bold rounded-lg hover:opacity-80 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openShippingEdit(o)}
                  className="text-xs font-bold text-brand-lime hover:underline"
                >
                  🚚 Edit Shipping Info
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================
 *  PAYMENTS VERIFICATION
 * ========================================================== */
function PaymentsTab() {
  const { t, orders, updatePaymentStatus, toast } = useApp();
  const vodafoneOrders = orders.filter((o) => o.paymentMethod === "vodafone");

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-black text-xl text-brand-black dark:text-brand-white mb-4">{t.admin.payments}</h2>
      {vodafoneOrders.length === 0 ? (
        <p className="text-brand-black/60 dark:text-brand-white/60 text-center py-10">No Vodafone Cash payments yet</p>
      ) : (
        <div className="space-y-4">
          {vodafoneOrders.map((o) => (
            <div key={o.id} className="bg-white/50 dark:bg-brand-black/30 rounded-2xl p-5">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div>
                  <p className="font-black text-brand-black dark:text-brand-white">{o.id}</p>
                  <p className="text-sm text-brand-black/70 dark:text-brand-white/70">{o.name} • {o.senderPhone || "—"}</p>
                  <p className="text-brand-green font-black mt-1">{o.total} {t.egyptPound}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.paymentStatus} />
                  <StatusBadge status={o.orderStatus} />
                </div>
              </div>

              {o.screenshot && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-brand-black/70 dark:text-brand-white/70 mb-2">Transfer Screenshot:</p>
                  <a href={o.screenshot} target="_blank" rel="noreferrer">
                    <img
                      src={o.screenshot}
                      alt="Payment screenshot"
                      className="w-48 h-48 object-cover rounded-2xl border-4 border-brand-lime/40 hover:scale-105 transition-transform cursor-zoom-in"
                    />
                  </a>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={o.paymentStatus === "verified" ? "dark" : "primary"}
                  onClick={() => {
                    updatePaymentStatus(o.id, "verified");
                    toast("Payment verified");
                  }}
                >
                  <CheckCircle2 size={14} /> {t.admin.verify}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updatePaymentStatus(o.id, "rejected");
                    toast("Payment rejected", "error");
                  }}
                >
                  <XCircle size={14} /> {t.admin.reject}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
 *  PRODUCT FORM — shared between Add & Edit
 * ========================================================== */
const EMPTY_PRODUCT_FORM = {
  name: "", nameAr: "", price: "", discountPrice: "", description: "", descriptionAr: "",
  categoryId: "", stock: "10", featured: false, bestSeller: false,
  status: "active" as ProductStatus,
  tags: "", seoTitle: "", seoDescription: "",
};

type ProductFormState = typeof EMPTY_PRODUCT_FORM;

function ProductFormModal({
  open, onClose, editProduct, categories, onSave,
}: {
  open: boolean;
  onClose: () => void;
  editProduct: Product | null;
  categories: Category[];
  onSave: (data: Partial<Product>, images: string[], imageFiles: File[]) => Promise<void>;
}) {
  const { toast } = useApp();
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [images, setImages] = useState<string[]>([]);       // existing/url images
  const [imageFiles, setImageFiles] = useState<File[]>([]); // new file uploads pending
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [activeTab, setActiveTab] = useState<"basic" | "images" | "variants" | "seo">("basic");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name,
        nameAr: editProduct.nameAr,
        price: String(editProduct.price),
        discountPrice: editProduct.discountPrice ? String(editProduct.discountPrice) : "",
        description: editProduct.description,
        descriptionAr: editProduct.descriptionAr,
        categoryId: editProduct.categoryId,
        stock: String(editProduct.stock),
        featured: editProduct.featured,
        bestSeller: editProduct.bestSeller || false,
        status: editProduct.status || (editProduct.active ? "active" : "hidden"),
        tags: (editProduct.tags || []).join(", "),
        seoTitle: editProduct.seoTitle || "",
        seoDescription: editProduct.seoDescription || "",
      });
      setImages(editProduct.images || []);
      setImageFiles([]);
      setImagePreviews([]);
      setVariants(editProduct.variants || []);
    } else {
      setForm({ ...EMPTY_PRODUCT_FORM, categoryId: categories[0]?.id || "" });
      setImages([]);
      setImageFiles([]);
      setImagePreviews([]);
      setVariants([]);
    }
    setActiveTab("basic");
  }, [editProduct, open, categories]);

  const handleFileAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));
  const removePendingImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const addVariant = () =>
    setVariants((prev) => [...prev, { id: "v-" + Math.random().toString(36).slice(2, 6), name: "", nameAr: "", options: [""] }]);
  const removeVariant = (id: string) => setVariants((prev) => prev.filter((v) => v.id !== id));
  const updateVariant = (id: string, patch: Partial<ProductVariant>) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const addVariantOption = (id: string) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, options: [...v.options, ""] } : v)));
  const updateVariantOption = (variantId: string, optIdx: number, val: string) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, options: v.options.map((o, i) => (i === optIdx ? val : o)) } : v
      )
    );
  const removeVariantOption = (variantId: string, optIdx: number) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, options: v.options.filter((_, i) => i !== optIdx) } : v
      )
    );

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.categoryId) {
      toast("Please fill: Name (EN), Price, and Category", "error");
      return;
    }
    setSaving(true);
    try {
      const allImages = [...images]; // existing / url images (pending uploads handled in parent)
      const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const productData: Partial<Product> = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || form.name.trim(),
        slug: editProduct?.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.random().toString(36).slice(2, 5),
        description: form.description.trim() || form.name,
        descriptionAr: form.descriptionAr.trim() || form.nameAr.trim() || form.name,
        categoryId: form.categoryId,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stock: Number(form.stock),
        featured: form.featured,
        bestSeller: form.bestSeller,
        active: form.status === "active",
        status: form.status,
        tags,
        variants: variants.filter((v) => v.name.trim()),
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        updatedAt: new Date().toISOString(),
      };
      await onSave(productData, allImages, imageFiles);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/40 text-brand-black dark:text-brand-white text-sm transition";
  const labelCls = "block text-xs font-bold text-brand-black/70 dark:text-brand-white/70 mb-1.5 uppercase tracking-wide";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 py-6 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#0d1a0d] border border-brand-lime/30 shadow-2xl my-auto"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-brand-lime/20">
              <div>
                <h2 className="text-2xl font-black text-brand-black dark:text-brand-white flex items-center gap-2">
                  {editProduct ? <Pencil size={20} className="text-brand-lime" /> : <Plus size={20} className="text-brand-lime" />}
                  {editProduct ? "Edit Product" : "Add New Product"}
                </h2>
                {editProduct && <p className="text-xs text-brand-black/50 dark:text-brand-white/50 mt-0.5">ID: {editProduct.id}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-lime/10 text-brand-black/60 dark:text-brand-white/60 hover:text-brand-lime transition">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 pb-0 overflow-x-auto">
              {(["basic", "images", "variants", "seo"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-t-xl text-sm font-bold capitalize transition whitespace-nowrap ${activeTab === tab ? "bg-brand-lime text-brand-black" : "text-brand-black/60 dark:text-brand-white/60 hover:bg-brand-lime/10"}`}
                >
                  {tab === "basic" && "📋 Basic Info"}
                  {tab === "images" && `🖼️ Images (${images.length + imageFiles.length})`}
                  {tab === "variants" && `🔀 Variants (${variants.length})`}
                  {tab === "seo" && "🌐 SEO"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* ── BASIC INFO ── */}
              {activeTab === "basic" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Product Name (EN) *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Neon Graffiti Laptop Skin" />
                  </div>
                  <div>
                    <label className={labelCls}>اسم المنتج (AR)</label>
                    <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} placeholder="سكن لابتوب نيون جرافيتي" dir="rtl" />
                  </div>
                  <div>
                    <label className={labelCls}>Price (EGP) *</label>
                    <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="350" />
                  </div>
                  <div>
                    <label className={labelCls}>Discount Price (EGP)</label>
                    <input type="number" min="0" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} className={inputCls} placeholder="Leave empty if no discount" />
                  </div>
                  <div>
                    <label className={labelCls}>Category *</label>
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
                      <option value="">— Select Category —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name} / {c.nameAr}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Stock Qty</label>
                    <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })} className={inputCls}>
                      <option value="active">✅ Active — visible to customers</option>
                      <option value="hidden">👁️ Hidden — not listed publicly</option>
                      <option value="outOfStock">❌ Out of Stock</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tags (comma-separated)</label>
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} placeholder="sticker, custom, waterproof" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Description (EN)</label>
                    <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Short product description..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>الوصف (AR)</label>
                    <textarea rows={3} value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} className={inputCls} placeholder="وصف مختصر للمنتج..." dir="rtl" />
                  </div>
                  <div className="md:col-span-2 flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 accent-[#8DFF1A]" />
                      <span className="text-sm font-semibold text-brand-black/80 dark:text-brand-white/80">⭐ Featured</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.bestSeller} onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })} className="w-4 h-4 accent-[#8DFF1A]" />
                      <span className="text-sm font-semibold text-brand-black/80 dark:text-brand-white/80">🔥 Best Seller</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ── IMAGES ── */}
              {activeTab === "images" && (
                <div className="space-y-4">
                  <p className="text-sm text-brand-black/60 dark:text-brand-white/60">Upload multiple images or paste URLs. First image is the main product image.</p>

                  {/* Upload drop zone */}
                  <label className="block w-full cursor-pointer border-2 border-dashed border-brand-lime/40 hover:border-brand-lime rounded-2xl p-6 text-center transition bg-brand-lime/5 hover:bg-brand-lime/10">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileAdd(e.target.files)} />
                    <Upload size={32} className="mx-auto text-brand-lime mb-2" />
                    <p className="font-bold text-brand-black dark:text-brand-white">Click to upload images</p>
                    <p className="text-xs text-brand-black/50 dark:text-brand-white/50 mt-1">PNG, JPG, WEBP up to 5MB each · Multiple files allowed</p>
                  </label>

                  {/* URL input */}
                  <div className="flex gap-2">
                    <input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageUrl())} placeholder="Or paste image URL and press Enter / Add" className={`${inputCls} flex-1`} />
                    <button type="button" onClick={addImageUrl} className="px-4 py-2.5 bg-brand-lime text-brand-black rounded-xl font-bold text-sm hover:bg-[#7bea12] transition">Add</button>
                  </div>

                  {/* Existing images grid */}
                  {images.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-2 uppercase tracking-wide">Saved Images</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {images.map((src, idx) => (
                          <div key={idx} className="relative group aspect-square">
                            <img src={src} alt="" className="w-full h-full object-cover rounded-xl border-2 border-brand-lime/30" />
                            {idx === 0 && <span className="absolute top-1 left-1 text-[9px] bg-brand-lime text-brand-black font-black px-1.5 py-0.5 rounded-full">MAIN</span>}
                            <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs hover:bg-red-600">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending uploads grid */}
                  {imagePreviews.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-2 uppercase tracking-wide">Pending Upload ({imagePreviews.length})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {imagePreviews.map((src, idx) => (
                          <div key={idx} className="relative group aspect-square">
                            <img src={src} alt="" className="w-full h-full object-cover rounded-xl border-2 border-brand-lime/60 opacity-80" />
                            <span className="absolute bottom-1 left-1 text-[9px] bg-yellow-400 text-black font-black px-1.5 py-0.5 rounded-full">PENDING</span>
                            <button type="button" onClick={() => removePendingImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs hover:bg-red-600">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {images.length === 0 && imagePreviews.length === 0 && (
                    <p className="text-center text-sm text-brand-black/40 dark:text-brand-white/40 py-4">No images yet — upload or add a URL above.</p>
                  )}
                </div>
              )}

              {/* ── VARIANTS ── */}
              {activeTab === "variants" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-brand-black/60 dark:text-brand-white/60">Add product variants like Size, Color, Material.</p>
                    <button type="button" onClick={addVariant} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-lime text-brand-black rounded-xl font-bold text-sm hover:bg-[#7bea12] transition">
                      <Plus size={14} /> Add Variant
                    </button>
                  </div>
                  {variants.length === 0 && (
                    <div className="text-center py-8 text-brand-black/40 dark:text-brand-white/40">
                      <Layers size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No variants yet. Click "Add Variant" to create options like Size or Color.</p>
                    </div>
                  )}
                  {variants.map((variant) => (
                    <div key={variant.id} className="border border-brand-lime/20 rounded-2xl p-4 space-y-3 bg-white/40 dark:bg-brand-black/30">
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-brand-black/30 dark:text-brand-white/30 shrink-0" />
                        <input value={variant.name} onChange={(e) => updateVariant(variant.id, { name: e.target.value })} placeholder="Variant name (e.g. Size)" className={`${inputCls} flex-1`} />
                        <input value={variant.nameAr} onChange={(e) => updateVariant(variant.id, { nameAr: e.target.value })} placeholder="الاسم بالعربي" className={`${inputCls} flex-1`} dir="rtl" />
                        <button type="button" onClick={() => removeVariant(variant.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {variant.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-1">
                            <input value={opt} onChange={(e) => updateVariantOption(variant.id, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} className="rounded-lg border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-3 py-1.5 text-sm outline-none focus:border-brand-lime text-brand-black dark:text-brand-white w-24" />
                            {variant.options.length > 1 && (
                              <button type="button" onClick={() => removeVariantOption(variant.id, optIdx)} className="text-red-400 hover:text-red-600 p-0.5">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addVariantOption(variant.id)} className="px-3 py-1.5 text-xs border border-dashed border-brand-lime/40 text-brand-lime rounded-lg hover:bg-brand-lime/10 transition">
                          + Option
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SEO ── */}
              {activeTab === "seo" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-brand-lime/10 rounded-xl">
                    <Globe size={16} className="text-brand-lime" />
                    <p className="text-sm text-brand-black/70 dark:text-brand-white/70">SEO fields help search engines find your product. Leave empty to auto-generate.</p>
                  </div>
                  <div>
                    <label className={labelCls}>SEO Title</label>
                    <input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className={inputCls} placeholder="Custom SEO title (defaults to product name)" />
                    <p className="text-xs text-brand-black/40 dark:text-brand-white/40 mt-1">{form.seoTitle.length}/60 characters recommended</p>
                  </div>
                  <div>
                    <label className={labelCls}>SEO Description</label>
                    <textarea rows={3} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className={inputCls} placeholder="Short meta description for search results..." />
                    <p className="text-xs text-brand-black/40 dark:text-brand-white/40 mt-1">{form.seoDescription.length}/160 characters recommended</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-brand-lime/20">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-brand-green/20 text-brand-black/70 dark:text-brand-white/70 font-semibold text-sm hover:bg-brand-lime/10 transition">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-lime text-brand-black rounded-xl font-black text-sm hover:bg-[#7bea12] disabled:opacity-60 transition glow-lime-sm"
              >
                {saving ? <><RotateCcw size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> {editProduct ? "Save Changes" : "Add Product"}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ==========================================================
 *  STATUS BADGE for products
 * ========================================================== */
function ProductStatusBadge({ status }: { status?: ProductStatus | boolean }) {
  if (status === "active" || status === true) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">● Active</span>;
  if (status === "hidden") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">● Hidden</span>;
  if (status === "outOfStock" || status === false) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">● Out of Stock</span>;
  return null;
}

/* ==========================================================
 *  PRODUCTS MANAGEMENT — TABLE + ADD / EDIT / DELETE
 * ========================================================== */
function ProductsTab() {
  const { t, products, categories, addProduct, updateProduct, deleteProduct, toast, uploadImage } = useApp();
  void t;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"name" | "price" | "stock" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const openAdd = () => { setEditProduct(null); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditProduct(p); setFormOpen(true); };

  const handleSave = async (data: Partial<Product>, urlImages: string[], imageFiles: File[]) => {
    // ✅ FIX: رفع الصور لـ Firebase Storage والحصول على Download URLs دائمة
    // بدلًا من استخدام URL.createObjectURL() كـ fallback يختفي عند إغلاق الصفحة
    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      toast(`Uploading ${imageFiles.length} image(s)…`, "info");
      console.log(`[AdminDashboard] Uploading ${imageFiles.length} product image(s) to Firebase Storage...`);
      const results = await Promise.allSettled(
        imageFiles.map((f) => uploadImage(f, "products"))
      );
      for (const [i, result] of results.entries()) {
        if (result.status === "fulfilled") {
          console.log(`[AdminDashboard] ✅ Image ${i + 1} uploaded:`, result.value);
          uploadedUrls.push(result.value);
        } else {
          console.error(`[AdminDashboard] ❌ Image ${i + 1} upload failed:`, result.reason);
          // ✅ لا نستخدم blob URL كـ fallback — نُبلّغ المستخدم بالخطأ
          toast(`Failed to upload image ${i + 1}. Please re-select it and try again.`, "error");
        }
      }
      if (uploadedUrls.length === 0 && imageFiles.length > 0) {
        toast("All image uploads failed. Product not saved.", "error");
        return;
      }
    }
    const finalImages = [...urlImages, ...uploadedUrls];
    const images = finalImages.length > 0 ? finalImages : editProduct?.images || ["/category-stickers.jpg"];

    if (editProduct) {
      await updateProduct(editProduct.id, { ...data, images });
      toast(`✅ "${data.name}" updated successfully`);
    } else {
      const newProduct: Product = {
        ...(data as Product),
        id: "p-" + Math.random().toString(36).slice(2, 8),
        images,
        createdAt: new Date().toISOString(),
      };
      await addProduct(newProduct);
      toast(`✅ "${data.name}" added to shop`);
    }
    setFormOpen(false);
  };

  // ── Filtering + Sorting ──
  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.nameAr.includes(search)) return false;
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      const pStatus = p.status || (p.active ? "active" : "hidden");
      if (statusFilter !== "all" && pStatus !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal: any = a[sortKey] ?? "";
      let bVal: any = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      return sortDir === "asc" ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const SortBtn = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-brand-lime transition font-bold text-xs uppercase tracking-wide">
      {label} {sortKey === k && <ArrowUpDown size={11} className={sortDir === "desc" ? "rotate-180" : ""} />}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="glass rounded-3xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-black text-2xl text-brand-black dark:text-brand-white flex items-center gap-2">
              <Package size={22} className="text-brand-green" /> Products
              <span className="text-sm font-normal text-brand-black/50 dark:text-brand-white/50 ml-1">({products.length} total)</span>
            </h2>
            <p className="text-sm text-brand-black/50 dark:text-brand-white/50 mt-0.5">Manage your product catalog. Changes sync to the shop in real-time.</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-brand-lime text-brand-black rounded-xl font-black text-sm hover:bg-[#7bea12] glow-lime-sm transition shrink-0">
            <Plus size={16} /> Add Product
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-black/40 dark:text-brand-white/40" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white text-sm transition"
            />
          </div>

          {/* Category filter */}
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2.5 text-sm font-semibold text-brand-black dark:text-brand-white outline-none focus:border-brand-lime">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2.5 text-sm font-semibold text-brand-black dark:text-brand-white outline-none focus:border-brand-lime">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-lime/10 bg-brand-lime/5">
                <th className="text-left px-4 py-3 text-brand-black/60 dark:text-brand-white/60 font-semibold w-14">Image</th>
                <th className="text-left px-4 py-3"><SortBtn k="name" label="Product" /></th>
                <th className="text-left px-4 py-3 text-brand-black/60 dark:text-brand-white/60 font-bold text-xs uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3"><SortBtn k="price" label="Price" /></th>
                <th className="text-left px-4 py-3"><SortBtn k="stock" label="Stock" /></th>
                <th className="text-left px-4 py-3 text-brand-black/60 dark:text-brand-white/60 font-bold text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-brand-black/60 dark:text-brand-white/60 font-bold text-xs uppercase tracking-wide hidden lg:table-cell"><SortBtn k="createdAt" label="Created" /></th>
                <th className="text-center px-4 py-3 text-brand-black/60 dark:text-brand-white/60 font-bold text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-brand-black/40 dark:text-brand-white/40">
                    <Package size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No products match your filters</p>
                  </td>
                </tr>
              )}
              {paginated.map((p, idx) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const pStatus: ProductStatus = p.status || (p.active ? "active" : "hidden");
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-brand-lime/5 hover:bg-brand-lime/5 transition group"
                  >
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-brand-lime/10 shrink-0">
                        <img src={p.images?.[0] || "/category-stickers.jpg"} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/category-stickers.jpg"; }} />
                      </div>
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-brand-black dark:text-brand-white line-clamp-1 max-w-[160px]">{p.name}</p>
                      <p className="text-xs text-brand-black/50 dark:text-brand-white/50 truncate max-w-[160px]">{p.nameAr}</p>
                      {p.featured && <span className="text-[9px] bg-brand-lime text-brand-black font-black px-1.5 py-0.5 rounded-full mr-1">⭐ FEAT</span>}
                      {p.bestSeller && <span className="text-[9px] bg-orange-400 text-white font-black px-1.5 py-0.5 rounded-full">🔥 HOT</span>}
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs font-semibold text-brand-black/70 dark:text-brand-white/60 bg-brand-lime/10 px-2 py-1 rounded-lg">
                        {cat?.name || "—"}
                      </span>
                    </td>
                    {/* Price */}
                    <td className="px-4 py-3">
                      <p className="font-black text-brand-green text-sm">{p.price.toLocaleString()} {t.egyptPound}</p>
                      {p.discountPrice && (
                        <p className="text-xs text-red-400 line-through">{p.discountPrice.toLocaleString()}</p>
                      )}
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${p.stock <= 0 ? "text-red-500" : p.stock <= 5 ? "text-orange-500" : "text-brand-black dark:text-brand-white"}`}>
                        {p.stock}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={pStatus} />
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-brand-black/50 dark:text-brand-white/50">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg bg-brand-lime/10 text-brand-lime hover:bg-brand-lime hover:text-brand-black transition"
                          title="Edit product"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setPendingDelete({ id: p.id, name: p.name })}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition"
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-lime/10 bg-white/30 dark:bg-brand-black/20">
            <p className="text-xs text-brand-black/50 dark:text-brand-white/50">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-brand-lime/10 disabled:opacity-30 text-brand-black dark:text-brand-white transition">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => Math.abs(n - page) <= 2).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded-lg text-xs font-bold transition ${n === page ? "bg-brand-lime text-brand-black" : "hover:bg-brand-lime/10 text-brand-black dark:text-brand-white"}`}>{n}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-brand-lime/10 disabled:opacity-30 text-brand-black dark:text-brand-white transition">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editProduct={editProduct}
        categories={categories}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteProduct(pendingDelete.id);
            toast(`Deleted "${pendingDelete.name}"`, "error");
          }
          setPendingDelete(null);
        }}
        title="Delete this product?"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This cannot be undone and the product will be removed from the shop immediately.`}
        confirmText="Delete Product"
      />
    </div>
  );
}

/* ==========================================================
 *  CATEGORIES MANAGEMENT — ADD / LIST / DELETE
 * ========================================================== */
function CategoriesTab() {
  const { t, categories, addCategory, updateCategory, deleteCategory, toast, uploadImage } = useApp();

  const emptyForm = { name: "", nameAr: "", slug: "", active: true, parentId: "" };
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const parentCategories = categories.filter((c: any) => !c.parentId);

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ name: c.name, nameAr: c.nameAr || "", slug: c.slug, active: c.active, parentId: c.parentId || "" });
    setImageUrl(c.image || "");
    setImagePreview("");
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setImageUrl("");
  };

  const handleImageFile = (f: File | null) => {
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast("Please fill in the category name", "error");
      return;
    }
    let finalImage = imageUrl || "/category-stickers.jpg";
    if (imageFile) {
      try {
        toast("Uploading image...", "info");
        console.log("[Categories] Uploading category image to Firebase Storage...");
        finalImage = await uploadImage(imageFile, "categories");
        console.log("[Categories] ✅ Category image uploaded:", finalImage);
      } catch (err) {
        console.error("[Categories] ❌ Category image upload failed:", err);
        toast("Failed to upload image. Please try again.", "error");
        return; // ✅ لا نكمل بـ blob URL — نوقف العملية
      }
    }
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (editingId) {
      const patch: any = {
        name: form.name,
        nameAr: form.nameAr || form.name,
        slug,
        active: form.active,
        image: finalImage,
        parentId: form.parentId || null,
      };
      await updateCategory(editingId, patch);
      toast(`Updated category "${form.name}"`);
      cancelEdit();
    } else {
      const newCategory: any = {
        id: "cat-" + Math.random().toString(36).slice(2, 8),
        name: form.name,
        nameAr: form.nameAr || form.name,
        slug,
        image: finalImage,
        active: form.active,
      };
      if (form.parentId) newCategory.parentId = form.parentId;
      addCategory(newCategory);
      toast(`Added category "${form.name}"`);
      setForm(emptyForm);
      setImageFile(null);
      setImagePreview("");
      setImageUrl("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add / Edit form */}
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-2xl text-brand-black dark:text-brand-white mb-1 flex items-center gap-2">
          <Plus size={22} className="text-brand-green" />
          {editingId ? "Edit Category" : t.admin.addCategory}
        </h2>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mb-6">
          {editingId
            ? "Update category details below."
            : "Add a new product category. New categories will instantly appear on the Shop page."}
        </p>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-brand-black/80 dark:text-brand-white/80 mb-1.5">
              Name (English) *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white"
              placeholder="e.g. Phone Skins"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-black/80 dark:text-brand-white/80 mb-1.5" dir="rtl">
              الاسم (العربية)
            </label>
            <input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              className="w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white"
              placeholder="مثال: سكنات موبايل"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-black/80 dark:text-brand-white/80 mb-1.5">
              Slug (optional)
            </label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white"
              placeholder="auto-generated if empty"
            />
          </div>

          {/* Parent category */}
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-brand-black/80 dark:text-brand-white/80 mb-1.5">
              Parent Category{" "}
              <span className="text-brand-black/40 dark:text-brand-white/40 font-normal">
                (optional — leave empty for top-level)
              </span>
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white"
            >
              <option value="">— No parent (top-level category) —</option>
              {parentCategories
                .filter((c: any) => c.id !== editingId)
                .map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.nameAr})
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-3 grid md:grid-cols-2 gap-4">
            {/* Image upload */}
            <div>
              <label className="block text-sm font-bold text-brand-black/80 dark:text-brand-white/80 mb-1.5">
                Category Image *
              </label>
              <label className="block w-full cursor-pointer border-2 border-dashed border-brand-green/30 hover:border-brand-lime rounded-2xl p-6 text-center transition">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
                />
                <Image size={28} className="mx-auto text-brand-lime mb-2" />
                <p className="text-sm font-bold text-brand-black/80 dark:text-brand-white/80">
                  {imageFile ? imageFile.name : "📎 Click to upload image"}
                </p>
              </label>
            </div>

            {/* URL + preview + checkbox */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1.5">
                  OR paste an image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => { setImageUrl(e.target.value); setImagePreview(""); setImageFile(null); }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white"
                />
              </div>
              {(imagePreview || imageUrl) && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={imagePreview || imageUrl}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-brand-lime/50"
                    />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(""); setImageFile(null); setImageUrl(""); }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:scale-110 transition flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="w-5 h-5 accent-[#8DFF1A]"
                    />
                    <span className="text-sm font-bold">Active (show in shop)</span>
                  </label>
                </div>
              )}
              {!imagePreview && !imageUrl && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-5 h-5 accent-[#8DFF1A]"
                  />
                  <span className="text-sm font-bold">Active (show in shop)</span>
                </label>
              )}
            </div>
          </div>

          <div className="md:col-span-3 flex gap-3">
            <Button type="submit" size="lg" className="flex-1">
              <Plus size={18} /> {editingId ? "Save Changes" : "Add Category"}
            </Button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-3 rounded-2xl bg-white/50 dark:bg-brand-black/30 font-bold text-brand-black/70 dark:text-brand-white/70 hover:opacity-80 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Categories list — grouped by parent */}
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-2xl text-brand-black dark:text-brand-white mb-1 flex items-center gap-2">
          <Tag size={22} className="text-brand-green" /> All Categories ({categories.length})
        </h2>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mb-6">
          Sub-categories are shown under their parent. Click ✏️ to edit any category.
        </p>

        <div className="space-y-6">
          {parentCategories.map((parent: any) => {
            const children = categories.filter((c: any) => c.parentId === parent.id);
            return (
              <div key={parent.id}>
                {/* Parent card */}
                <div className="relative bg-white/50 dark:bg-brand-black/30 rounded-2xl overflow-hidden hover:ring-2 hover:ring-brand-lime/40 transition">
                  <div className="relative h-32">
                    <img src={parent.image} alt={parent.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={() => startEdit(parent)}
                        className="p-2 rounded-lg bg-brand-lime text-brand-black hover:scale-110 transition shadow-lg"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setPendingDelete({ id: parent.id, name: parent.name })}
                        className="p-2 rounded-lg bg-red-500 text-white hover:scale-110 transition shadow-lg"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="font-black text-white text-lg truncate">{parent.name}</p>
                      <p className="text-brand-lime text-xs font-bold">/{parent.slug}</p>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-black/70 dark:text-brand-white/70 truncate">
                      {parent.nameAr}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${parent.active ? "bg-brand-lime text-brand-green" : "bg-gray-300 text-gray-700"}`}>
                      {parent.active ? "ACTIVE" : "HIDDEN"}
                    </span>
                  </div>
                </div>

                {/* Sub-categories */}
                {children.length > 0 && (
                  <div className="ml-6 mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {children.map((child: any) => (
                      <div key={child.id} className="relative bg-brand-lime/5 border border-brand-lime/20 rounded-2xl overflow-hidden hover:ring-2 hover:ring-brand-lime/40 transition">
                        <div className="relative h-24">
                          <img src={child.image} alt={child.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button
                              onClick={() => startEdit(child)}
                              className="p-1.5 rounded-lg bg-brand-lime text-brand-black hover:scale-110 transition text-xs"
                            >✏️</button>
                            <button
                              onClick={() => setPendingDelete({ id: child.id, name: child.name })}
                              className="p-1.5 rounded-lg bg-red-500 text-white hover:scale-110 transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="font-black text-white text-sm truncate">↳ {child.name}</p>
                          </div>
                        </div>
                        <div className="p-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-brand-black/70 dark:text-brand-white/70 truncate">{child.nameAr}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${child.active ? "bg-brand-lime text-brand-green" : "bg-gray-300 text-gray-700"}`}>
                            {child.active ? "ACTIVE" : "HIDDEN"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphan sub-categories */}
          {categories
            .filter((c: any) => c.parentId && !categories.find((p: any) => p.id === c.parentId))
            .map((c: any) => (
              <div key={c.id} className="relative bg-orange-50 dark:bg-orange-900/20 border border-orange-300/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-brand-black dark:text-brand-white">
                    {c.name} <span className="text-xs text-orange-500">(parent deleted)</span>
                  </p>
                  <p className="text-xs text-brand-black/60 dark:text-brand-white/60">{c.nameAr}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="p-2 rounded-lg bg-brand-lime text-brand-black hover:scale-110 transition">✏️</button>
                  <button onClick={() => setPendingDelete({ id: c.id, name: c.name })} className="p-2 rounded-lg bg-red-500 text-white hover:scale-110 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteCategory(pendingDelete.id);
            toast(`Deleted category "${pendingDelete.name}"`, "error");
          }
          setPendingDelete(null);
        }}
        title="Delete this category?"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? Products inside it will remain but won't be filtered under this category anymore. This cannot be undone.`}
        confirmText="Delete Category"
      />
    </div>
  );
}


/* ==========================================================
 *  CUSTOM REQUESTS
 * ========================================================== */
function RequestsTab() {
  const { t, customRequests, updateRequestStatus, toast } = useApp();

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-black text-xl text-brand-black dark:text-brand-white mb-4">{t.admin.requests}</h2>
      {customRequests.length === 0 ? (
        <p className="text-center py-10 text-brand-black/60 dark:text-brand-white/60">No requests yet</p>
      ) : (
        <div className="space-y-4">
          {customRequests.map((r) => (
            <div key={r.id} className="bg-white/50 dark:bg-brand-black/30 rounded-2xl p-5">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div>
                  <p className="font-black text-brand-black dark:text-brand-white">{r.id}</p>
                  <p className="text-sm text-brand-black/70 dark:text-brand-white/70">{r.userName} • {r.userEmail}</p>
                  <p className="text-xs text-brand-black/50 dark:text-brand-white/50 mt-0.5">Product: {r.productType}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.notes && (
                <p className="text-sm text-brand-black/80 dark:text-brand-white/80 mb-3 bg-brand-lime/10 rounded-xl p-3">
                  💬 {r.notes}
                </p>
              )}
              {r.image && (
                <img src={r.image} className="w-32 h-32 object-cover rounded-2xl mb-3 border-2 border-brand-lime/30" />
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={r.status === "accepted" ? "dark" : "primary"}
                  onClick={() => {
                    updateRequestStatus(r.id, "accepted");
                    toast("Request accepted");
                  }}
                >
                  <CheckCircle2 size={14} /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateRequestStatus(r.id, "rejected");
                    toast("Request rejected", "error");
                  }}
                >
                  <XCircle size={14} /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ==========================================================
 *  SITE CONTENT TAB — Hero, Features, Logo, Reviews
 * ========================================================== */
function SiteContentTab() {
  const [activeSection, setActiveSection] = useState<"hero" | "features" | "media" | "reviews">("hero");

  const sections = [
    { key: "hero" as const, label: "📝 نصوص الهيرو", desc: "تعديل عناوين وأزرار الصفحة الرئيسية" },
    { key: "features" as const, label: "✨ الـ Features", desc: "إضافة وتعديل وحذف مميزات الموقع" },
    { key: "media" as const, label: "🖼️ الصور والميديا", desc: "لوجو + صورة الهيرو" },
    { key: "reviews" as const, label: "⭐ التقييمات", desc: "إدارة تقييمات العملاء" },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="glass rounded-3xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`rounded-2xl p-4 text-left transition-all ${
                activeSection === s.key
                  ? "bg-brand-lime text-brand-black glow-lime-sm"
                  : "bg-white/30 dark:bg-brand-black/30 text-brand-black/70 dark:text-brand-white/70 hover:bg-brand-lime/20"
              }`}
            >
              <p className="font-black text-sm">{s.label}</p>
              <p className="text-xs mt-1 opacity-70">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {activeSection === "hero" && <HeroContentSection />}
      {activeSection === "features" && <FeaturesSection />}
      {activeSection === "media" && <MediaSection />}
      {activeSection === "reviews" && <ReviewsSection />}
    </div>
  );
}

/* ─── Hero Content ─── */
function HeroContentSection() {
  const { heroContent, setHeroContent, toast } = useApp();
  const [form, setForm] = useState({ ...heroContent });
  const [saving, setSaving] = useState(false);

  // Sync if heroContent changes externally (real-time)
  const heroJSON = JSON.stringify(heroContent);
  useEffect(() => { setForm({ ...heroContent }); }, [heroJSON]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      await setHeroContent(form);
      toast("تم حفظ نصوص الهيرو ✅");
    } catch { toast("فشل الحفظ، حاول تاني", "error"); }
    setSaving(false);
  };

  const Field = ({ label, fieldKey }: { label: string; fieldKey: keyof typeof form }) => (
    <div>
      <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">{label}</label>
      <input
        value={form[fieldKey] as string}
        onChange={(e) => setForm({ ...form, [fieldKey]: e.target.value })}
        className="w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white text-sm"
      />
    </div>
  );

  return (
    <div className="glass rounded-3xl p-6 space-y-6">
      <div>
        <h2 className="font-black text-2xl text-brand-black dark:text-brand-white flex items-center gap-2">
          📝 تعديل نصوص الهيرو
        </h2>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mt-1">
          التغييرات تظهر فوراً لكل الزوار عبر Firebase Realtime
        </p>
      </div>

      {/* Live Preview */}
      <div className="rounded-2xl bg-brand-green/10 border border-brand-lime/30 p-5">
        <p className="text-xs font-bold text-brand-lime mb-3 uppercase tracking-wider">Preview — عربي</p>
        <h1 className="text-2xl font-black text-brand-black dark:text-brand-white leading-tight">
          {form.title1Ar}<br />
          <span className="text-brand-lime">{form.title2Ar}</span><br />
          {form.title3Ar}
        </h1>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mt-2">{form.subtitleAr}</p>
        <div className="flex gap-2 mt-3">
          <span className="px-4 py-1.5 bg-brand-lime text-brand-black rounded-xl text-sm font-bold">{form.ctaAr}</span>
          <span className="px-4 py-1.5 border-2 border-brand-lime text-brand-black dark:text-brand-white rounded-xl text-sm font-bold">{form.cta2Ar}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Arabic */}
        <div className="space-y-4">
          <h3 className="font-black text-brand-green flex items-center gap-2">🇪🇬 العربي</h3>
          <Field label="العنوان الأول" fieldKey="title1Ar" />
          <Field label="العنوان الثاني (الملون)" fieldKey="title2Ar" />
          <Field label="العنوان الثالث" fieldKey="title3Ar" />
          <Field label="الوصف (Subtitle)" fieldKey="subtitleAr" />
          <Field label="زر الـ CTA الأول" fieldKey="ctaAr" />
          <Field label="زر الـ CTA الثاني" fieldKey="cta2Ar" />
        </div>
        {/* English */}
        <div className="space-y-4">
          <h3 className="font-black text-brand-green flex items-center gap-2">🇬🇧 English</h3>
          <Field label="Title Line 1" fieldKey="title1En" />
          <Field label="Title Line 2 (colored)" fieldKey="title2En" />
          <Field label="Title Line 3" fieldKey="title3En" />
          <Field label="Subtitle" fieldKey="subtitleEn" />
          <Field label="CTA Button 1" fieldKey="ctaEn" />
          <Field label="CTA Button 2" fieldKey="cta2En" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-brand-lime text-brand-black font-black rounded-2xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
      >
        {saving ? "⏳ جاري الحفظ..." : "💾 حفظ وتطبيق التغييرات"}
      </button>
    </div>
  );
}

/* ─── Features Section ─── */
function FeaturesSection() {
  const { features, addFeature, updateFeature, deleteFeature, toast } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const emptyForm = { icon: "✨", titleEn: "", titleAr: "", descEn: "", descAr: "" };
  const [addForm, setAddForm] = useState(emptyForm);
  const [editForms, setEditForms] = useState<Record<string, Partial<Feature>>>({});

  const handleAdd = async () => {
    if (!addForm.titleEn && !addForm.titleAr) { toast("اكتب عنوان على الأقل", "error"); return; }
    setSaving(true);
    try {
      const newFeature: Feature = {
        id: "f-" + Date.now(),
        icon: addForm.icon || "✨",
        titleEn: addForm.titleEn,
        titleAr: addForm.titleAr,
        descEn: addForm.descEn,
        descAr: addForm.descAr,
        order: features.length + 1,
      };
      await addFeature(newFeature);
      toast("تمت إضافة الـ Feature ✅");
      setAddForm(emptyForm);
      setShowAdd(false);
    } catch { toast("فشل الإضافة", "error"); }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editForms[id]) return;
    setSaving(true);
    try {
      await updateFeature(id, editForms[id]);
      toast("تم التعديل ✅");
      setEditingId(null);
    } catch { toast("فشل التعديل", "error"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeature(id);
      toast("تم الحذف", "error");
    } catch { toast("فشل الحذف", "error"); }
    setConfirmDelete(null);
  };

  const startEdit = (f: Feature) => {
    setEditingId(f.id);
    setEditForms((prev) => ({ ...prev, [f.id]: { icon: f.icon, titleEn: f.titleEn, titleAr: f.titleAr, descEn: f.descEn, descAr: f.descAr } }));
  };

  const inputCls = "w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-3 py-2 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white text-sm";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass rounded-3xl p-5 flex items-center justify-between">
        <div>
          <h2 className="font-black text-2xl text-brand-black dark:text-brand-white">✨ الـ Features ({features.length})</h2>
          <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mt-1">المميزات اللي بتظهر في الصفحة الرئيسية</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-lime text-brand-black font-black rounded-xl hover:opacity-90 transition"
        >
          <Plus size={18} /> Feature جديدة
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass rounded-3xl p-6 border-2 border-brand-lime/40">
          <h3 className="font-black text-lg text-brand-black dark:text-brand-white mb-4">➕ إضافة Feature جديدة</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">الأيقونة (Emoji)</label>
              <input value={addForm.icon} onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })}
                placeholder="✨" className={inputCls + " text-2xl"} />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">العنوان (عربي) *</label>
              <input value={addForm.titleAr} onChange={(e) => setAddForm({ ...addForm, titleAr: e.target.value })}
                placeholder="توصيل سريع" className={inputCls} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">Title (English) *</label>
              <input value={addForm.titleEn} onChange={(e) => setAddForm({ ...addForm, titleEn: e.target.value })}
                placeholder="Fast Delivery" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">الوصف (عربي)</label>
              <textarea value={addForm.descAr} onChange={(e) => setAddForm({ ...addForm, descAr: e.target.value })}
                placeholder="٢-٥ أيام القاهرة والجيزة..." rows={2} className={inputCls} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">Description (English)</label>
              <textarea value={addForm.descEn} onChange={(e) => setAddForm({ ...addForm, descEn: e.target.value })}
                placeholder="2-5 days Cairo/Giza..." rows={2} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 py-2.5 bg-brand-lime text-brand-black font-black rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? "⏳..." : <><Plus size={16} /> إضافة</>}
            </button>
            <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); }}
              className="px-5 py-2.5 bg-white/50 dark:bg-brand-black/30 text-brand-black/70 dark:text-brand-white/70 font-bold rounded-xl hover:bg-red-500/10 hover:text-red-500 transition">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Features List */}
      {features.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-brand-black/50 dark:text-brand-white/50">
          <p className="text-4xl mb-3">✨</p>
          <p>مفيش features لسه. ابدأ بإضافة واحدة!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {features.map((f) => (
            <div key={f.id} className="glass rounded-2xl p-5">
              {editingId === f.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">الأيقونة</label>
                      <input value={editForms[f.id]?.icon ?? f.icon}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [f.id]: { ...prev[f.id], icon: e.target.value } }))}
                        className={inputCls + " text-2xl"} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">العنوان عربي</label>
                      <input value={editForms[f.id]?.titleAr ?? f.titleAr}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [f.id]: { ...prev[f.id], titleAr: e.target.value } }))}
                        className={inputCls} dir="rtl" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">English Title</label>
                      <input value={editForms[f.id]?.titleEn ?? f.titleEn}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [f.id]: { ...prev[f.id], titleEn: e.target.value } }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">الوصف عربي</label>
                      <textarea value={editForms[f.id]?.descAr ?? f.descAr}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [f.id]: { ...prev[f.id], descAr: e.target.value } }))}
                        rows={2} className={inputCls} dir="rtl" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-black/60 dark:text-brand-white/60 mb-1">English Description</label>
                      <textarea value={editForms[f.id]?.descEn ?? f.descEn}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [f.id]: { ...prev[f.id], descEn: e.target.value } }))}
                        rows={2} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleUpdate(f.id)} disabled={saving}
                      className="flex-1 py-2 bg-brand-lime text-brand-black font-black rounded-xl hover:opacity-90 transition disabled:opacity-50">
                      {saving ? "⏳..." : "💾 حفظ"}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-5 py-2 bg-white/50 dark:bg-brand-black/30 rounded-xl font-bold text-brand-black/70 dark:text-brand-white/70 hover:bg-red-500/10 hover:text-red-500 transition">
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-lime/20 flex items-center justify-center text-2xl shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="font-black text-brand-black dark:text-brand-white">
                        {f.titleAr} <span className="text-brand-black/40 dark:text-brand-white/40 font-normal text-sm">/ {f.titleEn}</span>
                      </p>
                      <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mt-1 line-clamp-2">{f.descAr}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(f)}
                      className="p-2 rounded-xl bg-brand-lime/20 text-brand-green hover:bg-brand-lime hover:text-brand-black transition">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setConfirmDelete(f.id)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="font-black text-xl text-brand-black dark:text-brand-white mb-2">حذف الـ Feature؟</h3>
            <p className="text-brand-black/60 dark:text-brand-white/60 mb-6">الحذف دايمي ومش هيتراجع فيه</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-500 text-white font-black rounded-xl hover:opacity-90 transition">
                نعم، احذف
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-white/50 dark:bg-brand-black/30 text-brand-black dark:text-brand-white font-bold rounded-xl hover:opacity-80 transition">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Media Section (Logo + Hero Image) ─── */
function MediaSection() {
  const { heroImage, setHeroImage, logoImage, setLogoImage, uploadImage, toast } = useApp();
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroUrl, setHeroUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState<"hero" | "logo" | null>(null);

  const handleHeroUpload = async () => {
    if (!heroFile && !heroUrl) { toast("اختار صورة أو حط URL", "error"); return; }
    setUploading("hero");
    try {
      let url = heroUrl;
      if (heroFile) url = await uploadImage(heroFile, "hero");
      await setHeroImage(url);
      toast("تم تغيير صورة الهيرو ✅");
      setHeroFile(null); setHeroUrl("");
    } catch { toast("فشل الرفع، حاول تاني", "error"); }
    setUploading(null);
  };

  const handleLogoUpload = async () => {
    if (!logoFile && !logoUrl) { toast("اختار صورة أو حط URL", "error"); return; }
    setUploading("logo");
    try {
      let url = logoUrl;
      if (logoFile) url = await uploadImage(logoFile, "logo");
      await setLogoImage(url);
      toast("تم تغيير اللوجو ✅");
      setLogoFile(null); setLogoUrl("");
    } catch { toast("فشل الرفع، حاول تاني", "error"); }
    setUploading(null);
  };

  const uploadCls = "block w-full cursor-pointer border-2 border-dashed border-brand-green/30 hover:border-brand-lime rounded-2xl p-5 text-center transition";
  const inputCls = "w-full rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white text-sm";

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-2xl text-brand-black dark:text-brand-white mb-1 flex items-center gap-2">
          <Image size={22} className="text-brand-green" /> إدارة اللوجو
        </h2>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mb-5">اللوجو اللي بيظهر في النافبار والفوتر — يتحدث فوراً لكل الزوار</p>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/30 dark:bg-brand-black/20">
            <p className="text-xs font-bold text-brand-black/50 dark:text-brand-white/50 uppercase tracking-wider">اللوجو الحالي</p>
            <img src={logoImage} alt="Current logo" className="h-24 object-contain" />
          </div>
          <div className="space-y-3">
            <label className={uploadCls}>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { setLogoFile(e.target.files?.[0] || null); setLogoUrl(""); }} />
              <Upload size={24} className="mx-auto text-brand-lime mb-2" />
              <p className="text-sm font-bold text-brand-black/80 dark:text-brand-white/80">
                {logoFile ? `✅ ${logoFile.name}` : "📎 ارفع لوجو جديد (PNG/SVG)"}
              </p>
            </label>
            <p className="text-xs text-center text-brand-black/40 dark:text-brand-white/40">أو</p>
            <input type="url" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setLogoFile(null); }}
              placeholder="https://example.com/logo.png" className={inputCls} />
            <button onClick={handleLogoUpload} disabled={uploading !== null}
              className="w-full py-2.5 bg-brand-lime text-brand-black font-black rounded-xl hover:opacity-90 transition disabled:opacity-50">
              {uploading === "logo" ? "⏳ جاري الرفع..." : "💾 حفظ اللوجو"}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-2xl text-brand-black dark:text-brand-white mb-1 flex items-center gap-2">
          <Image size={22} className="text-brand-green" /> صورة الهيرو
        </h2>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mb-5">الصورة الكبيرة في أول صفحة الهوم — تتحدث فوراً</p>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <p className="text-xs font-bold text-brand-black/50 dark:text-brand-white/50 uppercase tracking-wider mb-2">الصورة الحالية</p>
            <img src={heroImage} alt="Current hero" className="w-full h-52 object-cover rounded-2xl border-2 border-brand-lime/30" />
          </div>
          <div className="space-y-3">
            <label className={uploadCls}>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { setHeroFile(e.target.files?.[0] || null); setHeroUrl(""); }} />
              <Upload size={24} className="mx-auto text-brand-lime mb-2" />
              <p className="text-sm font-bold text-brand-black/80 dark:text-brand-white/80">
                {heroFile ? `✅ ${heroFile.name}` : "📎 ارفع صورة هيرو جديدة"}
              </p>
            </label>
            <p className="text-xs text-center text-brand-black/40 dark:text-brand-white/40">أو</p>
            <input type="url" value={heroUrl} onChange={(e) => { setHeroUrl(e.target.value); setHeroFile(null); }}
              placeholder="https://example.com/hero.jpg" className={inputCls} />
            <button onClick={handleHeroUpload} disabled={uploading !== null}
              className="w-full py-2.5 bg-brand-lime text-brand-black font-black rounded-xl hover:opacity-90 transition disabled:opacity-50">
              {uploading === "hero" ? "⏳ جاري الرفع..." : "💾 حفظ صورة الهيرو"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reviews Section ─── */
function ReviewsSection() {
  const { lang, reviews, addReview, deleteReview, toast } = useApp();
  const [form, setForm] = useState({ name: "", comment: "", commentAr: "", rating: 5 });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.comment) { toast("املأ الاسم والتعليق", "error"); return; }
    setSaving(true);
    try {
      const r: Review = {
        id: "r-" + Date.now(),
        name: form.name,
        rating: form.rating,
        comment: form.comment,
        commentAr: form.commentAr || form.comment,
        avatar: form.name.slice(0, 2).toUpperCase(),
      };
      await addReview(r);
      toast("تمت إضافة التقييم ✅");
      setForm({ name: "", comment: "", commentAr: "", rating: 5 });
    } catch { toast("فشل الإضافة", "error"); }
    setSaving(false);
  };

  const inputCls = "rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 outline-none focus:border-brand-lime text-brand-black dark:text-brand-white text-sm w-full";

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <h2 className="font-black text-2xl text-brand-black dark:text-brand-white mb-1 flex items-center gap-2">
          <Star size={22} className="text-brand-green" /> آراء العملاء ({reviews.length})
        </h2>
        <p className="text-sm text-brand-black/60 dark:text-brand-white/60 mb-5">أضف أو احذف التقييمات اللي بتظهر في الهوم</p>

        <form onSubmit={handleAdd} className="grid md:grid-cols-2 gap-3 mb-6 p-4 bg-brand-lime/10 rounded-2xl">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسم العميل *" className={inputCls} />
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            className={inputCls + " font-bold"}>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{"⭐".repeat(r)} ({r})</option>)}
          </select>
          <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="التعليق بالإنجليزي *" rows={2} className={inputCls} />
          <textarea value={form.commentAr} onChange={(e) => setForm({ ...form, commentAr: e.target.value })}
            placeholder="التعليق بالعربي (اختياري)" rows={2} dir="rtl" className={inputCls} />
          <button type="submit" disabled={saving}
            className="md:col-span-2 py-2.5 bg-brand-lime text-brand-black font-black rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? "⏳..." : <><Plus size={18} /> إضافة تقييم</>}
          </button>
        </form>

        <div className="grid md:grid-cols-2 gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white/50 dark:bg-brand-black/30 rounded-2xl p-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-lime text-brand-black font-black flex items-center justify-center shrink-0">
                {r.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-black dark:text-brand-white text-sm">{r.name}</p>
                <p className="text-xs text-brand-lime">{"⭐".repeat(r.rating)}</p>
                <p className="text-xs text-brand-black/70 dark:text-brand-white/70 mt-1 line-clamp-2">
                  {lang === "ar" ? r.commentAr : r.comment}
                </p>
              </div>
              <button onClick={() => setConfirmDelete(r.id)}
                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition shrink-0 self-start">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">⭐</div>
            <h3 className="font-black text-xl text-brand-black dark:text-brand-white mb-2">حذف التقييم؟</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { deleteReview(confirmDelete); toast("تم حذف التقييم", "error"); setConfirmDelete(null); }}
                className="flex-1 py-2.5 bg-red-500 text-white font-black rounded-xl hover:opacity-90 transition">
                نعم، احذف
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-white/50 dark:bg-brand-black/30 font-bold rounded-xl hover:opacity-80 transition text-brand-black dark:text-brand-white">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ==========================================================
 *  USERS TAB
 * ========================================================== */
function UsersTab() {
  const { allUsers, orders } = useApp();
  const [search, setSearch] = useState("");

  const filtered = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-black text-xl text-brand-black dark:text-brand-white mb-4">
        👥 العملاء ({allUsers.length})
      </h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 ابحث باسم أو إيميل أو موبايل..."
        className="w-full mb-5 rounded-xl bg-white/70 dark:bg-brand-black/40 border border-brand-green/20 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
      />
      {filtered.length === 0 ? (
        <p className="text-center text-brand-black/50 dark:text-brand-white/50 py-10">مفيش عملاء لسه</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const userOrders = orders.filter((o) => o.user === u.email);
            const totalSpent = userOrders
              .filter((o) => o.paymentStatus === "verified" || o.orderStatus === "delivered")
              .reduce((s, o) => s + o.total, 0);
            return (
              <div key={u.id} className="bg-white/50 dark:bg-brand-black/30 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-lime text-brand-black font-black text-lg flex items-center justify-center">
                      {(u.name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-brand-black dark:text-brand-white">{u.name || "—"}</p>
                      <p className="text-xs text-brand-black/60 dark:text-brand-white/60">{u.email}</p>
                      {u.phone && <p className="text-xs text-brand-black/60 dark:text-brand-white/60">{u.phone}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-brand-black/60 dark:text-brand-white/60">{userOrders.length} طلب</p>
                    <p className="font-black text-brand-green text-sm">{totalSpent.toLocaleString()} ج.م</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.role === "admin" ? "bg-brand-lime text-brand-black" : "bg-brand-green/10 text-brand-green"}`}>
                      {u.role === "admin" ? "أدمن" : "عميل"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
 *  PROMO CODES TAB
 * ========================================================== */
function PromoCodesTab() {
  const { promoCodes, addPromoCode, updatePromoCode, deletePromoCode, toast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const EMPTY_FORM = {
    code: "",
    discount: 10,
    active: true,
    expiryDate: "",
    maxUses: 0,
  };
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: PromoCode) => {
    setForm({
      code: p.code,
      discount: p.discount,
      active: p.active,
      expiryDate: p.expiryDate,
      maxUses: p.maxUses,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast("أدخل كود الخصم", "error"); return; }
    if (form.discount < 1 || form.discount > 100) { toast("الخصم لازم يكون بين 1 و 100%", "error"); return; }
    if (!form.expiryDate) { toast("أدخل تاريخ انتهاء الصلاحية", "error"); return; }

    try {
      if (editingId) {
        await updatePromoCode(editingId, {
          code: form.code.trim().toUpperCase(),
          discount: form.discount,
          active: form.active,
          expiryDate: form.expiryDate,
          maxUses: form.maxUses,
        });
        toast("تم تحديث الكود ✅");
      } else {
        // Check for duplicate code
        const duplicate = promoCodes.find(
          (p) => p.code.toUpperCase() === form.code.trim().toUpperCase()
        );
        if (duplicate) { toast("الكود ده موجود بالفعل", "error"); return; }

        const id = "PROMO-" + Date.now();
        await addPromoCode({
          id,
          code: form.code.trim().toUpperCase(),
          discount: form.discount,
          active: form.active,
          expiryDate: form.expiryDate,
          maxUses: form.maxUses,
          usedCount: 0,
          createdAt: new Date().toISOString(),
        });
        toast("تم إضافة الكود ✅");
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      toast("حصل خطأ، حاول تاني", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePromoCode(id);
      toast("تم حذف الكود");
    } catch {
      toast("فشل الحذف", "error");
    }
    setConfirmDelete(null);
  };

  const handleToggleActive = async (p: PromoCode) => {
    try {
      await updatePromoCode(p.id, { active: !p.active });
      toast(p.active ? "تم إيقاف الكود" : "تم تفعيل الكود");
    } catch {
      toast("حصل خطأ", "error");
    }
  };

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-2xl text-brand-black dark:text-brand-white flex items-center gap-2">
            🎟️ أكواد الخصم ({promoCodes.length})
          </h2>
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> إضافة كود
          </Button>
        </div>

        {/* Create / Edit form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-lime/10 border border-brand-lime/30 rounded-2xl p-5 mb-6 space-y-4"
          >
            <h3 className="font-black text-lg text-brand-black dark:text-brand-white">
              {editingId ? "✏️ تعديل الكود" : "➕ كود جديد"}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  الكود (بالإنجليزي)
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="w-full rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  نسبة الخصم (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  تاريخ انتهاء الصلاحية
                </label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  الحد الأقصى للاستخدام (0 = غير محدود)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                  className="w-full rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <label className="text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  مفعّل؟
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? "bg-brand-lime" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
                <span className="text-sm text-brand-black/60 dark:text-brand-white/60">
                  {form.active ? "مفعّل" : "معطّل"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} size="sm">
                <Save size={15} /> حفظ
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                <X size={15} /> إلغاء
              </Button>
            </div>
          </motion.div>
        )}

        {/* Promo codes list */}
        {promoCodes.length === 0 ? (
          <p className="text-center text-brand-black/50 dark:text-brand-white/50 py-10">
            مفيش أكواد خصم لسه — ابدأ بإضافة أول كود
          </p>
        ) : (
          <div className="space-y-3">
            {promoCodes.map((p) => {
              const expired = isExpired(p.expiryDate);
              const usagePct = p.maxUses > 0 ? Math.round((p.usedCount / p.maxUses) * 100) : null;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-4 border transition ${
                    !p.active || expired
                      ? "bg-gray-50 dark:bg-brand-black/20 border-gray-200 dark:border-brand-black/30 opacity-60"
                      : "bg-white/50 dark:bg-brand-black/30 border-brand-green/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: code info */}
                    <div className="flex items-center gap-4">
                      <div className="bg-brand-lime/20 rounded-xl px-4 py-2">
                        <span className="font-black text-brand-green text-lg tracking-widest">
                          {p.code}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-brand-black dark:text-brand-white text-sm">
                            خصم {p.discount}%
                          </span>
                          {expired && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                              منتهي
                            </span>
                          )}
                          {!p.active && !expired && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                              معطّل
                            </span>
                          )}
                          {p.active && !expired && (
                            <span className="text-xs bg-brand-lime text-brand-black px-2 py-0.5 rounded-full font-bold">
                              نشط
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brand-black/50 dark:text-brand-white/50 mt-0.5">
                          ينتهي: {new Date(p.expiryDate).toLocaleDateString("ar-EG")} •{" "}
                          الاستخدام: {p.usedCount}
                          {p.maxUses > 0 ? ` / ${p.maxUses}` : " (غير محدود)"}
                        </p>
                        {usagePct !== null && (
                          <div className="mt-1.5 w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-lime rounded-full"
                              style={{ width: `${Math.min(usagePct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2">
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(p)}
                        title={p.active ? "إيقاف" : "تفعيل"}
                        className={`relative w-10 h-5 rounded-full transition-colors ${p.active ? "bg-brand-lime" : "bg-gray-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.active ? "translate-x-5" : "translate-x-0.5"}`}
                        />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-xl hover:bg-brand-lime/20 text-brand-black/60 dark:text-brand-white/60"
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!confirmDelete}
        title="حذف كود الخصم"
        message="هل أنت متأكد من حذف هذا الكود؟ لن يمكن التراجع."
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/* ==========================================================
 *  SHIPPING SETTINGS TAB
 * ========================================================== */
function ShippingTab() {
  const { shippingRates, addShippingRate, updateShippingRate, deleteShippingRate, toast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const EMPTY_FORM = { governorate: "", price: 0, active: true };
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r: ShippingRate) => {
    setForm({ governorate: r.governorate, price: r.price, active: r.active });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.governorate.trim()) { toast("أدخل اسم المحافظة", "error"); return; }
    if (form.price < 0) { toast("سعر الشحن لازم يكون 0 أو أكتر", "error"); return; }

    try {
      if (editingId) {
        await updateShippingRate(editingId, {
          governorate: form.governorate.trim(),
          price: form.price,
          active: form.active,
        });
        toast("تم تحديث سعر الشحن ✅");
      } else {
        const duplicate = shippingRates.find(
          (r) => r.governorate.toLowerCase() === form.governorate.trim().toLowerCase()
        );
        if (duplicate) { toast("المحافظة دي موجودة بالفعل", "error"); return; }

        const id = "SHIP-" + Date.now();
        await addShippingRate({
          id,
          governorate: form.governorate.trim(),
          price: form.price,
          active: form.active,
        });
        toast("تم إضافة المحافظة ✅");
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      toast("حصل خطأ، حاول تاني", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShippingRate(id);
      toast("تم الحذف");
    } catch {
      toast("فشل الحذف", "error");
    }
    setConfirmDelete(null);
  };

  const handleToggleActive = async (r: ShippingRate) => {
    try {
      await updateShippingRate(r.id, { active: !r.active });
      toast(r.active ? "تم إيقاف المحافظة" : "تم تفعيل المحافظة");
    } catch {
      toast("حصل خطأ", "error");
    }
  };

  // Sort: active first, then alphabetical
  const sorted = [...shippingRates].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.governorate.localeCompare(b.governorate);
  });

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-2xl text-brand-black dark:text-brand-white flex items-center gap-2">
            🚚 إعدادات الشحن ({shippingRates.length} محافظة)
          </h2>
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> إضافة محافظة
          </Button>
        </div>

        {/* Info note */}
        <div className="bg-brand-green/10 border border-brand-lime/30 rounded-2xl p-4 mb-6 text-sm text-brand-black/70 dark:text-brand-white/70">
          💡 سعر الشحن بيتحفظ مع كل طلب وقت إنشائه، فالتغييرات اللي بتعملها دلوقتي مش هتأثر على الطلبات القديمة.
          المحافظات اللي مش موجودة هنا هيكون شحنها <strong>0 ج.م</strong> تلقائياً.
        </div>

        {/* Create / Edit form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-lime/10 border border-brand-lime/30 rounded-2xl p-5 mb-6 space-y-4"
          >
            <h3 className="font-black text-lg text-brand-black dark:text-brand-white">
              {editingId ? "✏️ تعديل سعر الشحن" : "➕ محافظة جديدة"}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  اسم المحافظة (إنجليزي)
                </label>
                <input
                  value={form.governorate}
                  onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                  placeholder="Cairo"
                  disabled={!!editingId}
                  className="w-full rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime disabled:opacity-60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  سعر الشحن (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-brand-black dark:text-brand-white outline-none focus:border-brand-lime"
                />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <label className="text-sm font-medium text-brand-black/80 dark:text-brand-white/80">
                  مفعّل؟
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? "bg-brand-lime" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
                <span className="text-sm text-brand-black/60 dark:text-brand-white/60">
                  {form.active ? "مفعّل" : "معطّل"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} size="sm">
                <Save size={15} /> حفظ
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                <X size={15} /> إلغاء
              </Button>
            </div>
          </motion.div>
        )}

        {/* Shipping rates list */}
        {sorted.length === 0 ? (
          <p className="text-center text-brand-black/50 dark:text-brand-white/50 py-10">
            مفيش محافظات مضافة لسه — ابدأ بإضافة أول محافظة
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map((r) => (
              <div
                key={r.id}
                className={`rounded-2xl p-4 border flex items-center justify-between gap-3 transition ${
                  r.active
                    ? "bg-white/50 dark:bg-brand-black/30 border-brand-green/10"
                    : "bg-gray-50 dark:bg-brand-black/20 border-gray-200 dark:border-brand-black/30 opacity-60"
                }`}
              >
                {/* Governorate name + price */}
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold text-brand-black dark:text-brand-white flex items-center gap-2">
                      {r.governorate}
                      {!r.active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                          معطّل
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-black text-brand-green mt-0.5">
                      {r.price === 0 ? "مجاني 🎉" : `${r.price} ج.م`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(r)}
                    title={r.active ? "إيقاف" : "تفعيل"}
                    className={`relative w-10 h-5 rounded-full transition-colors ${r.active ? "bg-brand-lime" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.active ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="p-2 rounded-xl hover:bg-brand-lime/20 text-brand-black/60 dark:text-brand-white/60"
                    title="تعديل السعر"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(r.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-500"
                    title="حذف"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!confirmDelete}
        title="حذف محافظة"
        message="هل أنت متأكد من حذف هذه المحافظة؟"
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
