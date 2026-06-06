import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Check, Tag, X } from "lucide-react";
import { useApp } from "../store/AppContext";
import { governorates } from "../lib/mockData";
import { Button, Input, Textarea, Select, EmptyState } from "../components/ui";

/* ─────────────────────────────────────────────────────────────────────────────
 *  CART PAGE
 *  Shows cart items + a summary panel with promo code input.
 *  Shipping is shown as "calculated at checkout" since we don't know the
 *  governorate yet on the cart page.
 * ───────────────────────────────────────────────────────────────────────────── */
export default function Cart() {
  const { t, lang, cart, updateQty, removeFromCart, clearCart, toast, products, validatePromoCode } = useApp();

  // ── Promo code state ──────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string; promoId: string; discount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const items = cart
    .map((c) => {
      const p = products.find((pp) => pp.id === c.productId);
      return { ...c, product: p };
    })
    .filter((i) => i.product);

  const subtotal = items.reduce((s, i) => s + i.product!.price * i.quantity, 0);
  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discount) / 100)
    : 0;
  // Shipping will be calculated at checkout based on governorate
  const total = subtotal - discountAmount;

  // ── Apply promo code ──────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    const result = await validatePromoCode(promoInput.trim(), subtotal);
    setPromoLoading(false);
    if (result.ok) {
      setAppliedPromo({ code: promoInput.trim().toUpperCase(), promoId: result.promoId, discount: result.discount });
      setPromoInput("");
      toast(result.message, "success");
    } else {
      toast(result.message, "error");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    toast(lang === "en" ? "Promo code removed" : "تم إزالة كود الخصم", "info");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <EmptyState
          icon={<ShoppingBag size={40} />}
          title={t.cart.empty}
          action={
            <Link to="/shop">
              <Button size="lg">{lang === "en" ? "Start shopping" : "ابدأ التسوق"}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <h1 className="text-4xl md:text-5xl font-black text-brand-black dark:text-brand-white mb-10">
        {t.cart.title}
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Cart items ── */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((i) => (
            <motion.div
              key={i.productId}
              layout
              className="glass rounded-3xl p-4 md:p-5 flex gap-4 items-center"
            >
              <Link to={`/product/${i.product!.slug}`} className="shrink-0">
                <img
                  src={i.product!.images[0]}
                  className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${i.product!.slug}`}>
                  <h3 className="font-bold text-brand-black dark:text-brand-white truncate">
                    {lang === "en" ? i.product!.name : i.product!.nameAr}
                  </h3>
                </Link>
                <p className="text-brand-green font-black text-lg mt-1">
                  {i.product!.price} {t.egyptPound}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 glass rounded-xl p-1">
                    <button
                      onClick={() => updateQty(i.productId, i.quantity - 1)}
                      className="w-7 h-7 rounded-lg hover:bg-brand-lime/20 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{i.quantity}</span>
                    <button
                      onClick={() => updateQty(i.productId, i.quantity + 1)}
                      className="w-7 h-7 rounded-lg hover:bg-brand-lime/20 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(i.productId)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-brand-green text-lg">
                  {i.product!.price * i.quantity} {t.egyptPound}
                </p>
              </div>
            </motion.div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                clearCart();
                toast(lang === "en" ? "Cart cleared" : "السلة اتفرغت");
              }}
              className="text-sm text-red-500 hover:underline"
            >
              {t.cart.clear}
            </button>
          </div>
        </div>

        {/* ── Summary panel ── */}
        <div className="glass rounded-3xl p-6 h-fit sticky top-28 space-y-4">
          <h2 className="font-black text-xl text-brand-black dark:text-brand-white">
            {lang === "en" ? "Summary" : "الملخص"}
          </h2>

          {/* Promo code input */}
          <div className="space-y-2">
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-brand-lime/20 border border-brand-lime rounded-xl px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold text-brand-green">
                  <Tag size={14} />
                  {appliedPromo.code} — {appliedPromo.discount}% {lang === "en" ? "off" : "خصم"}
                </span>
                <button onClick={handleRemovePromo} className="text-brand-black/60 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                  placeholder={t.cart.promoPlaceholder}
                  className="flex-1 rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-sm text-brand-black dark:text-brand-white placeholder:text-brand-black/40 dark:placeholder:text-brand-white/40 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30 outline-none transition-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? "…" : t.cart.promoApply}
                </Button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-black/70 dark:text-brand-white/70">{t.cart.subtotal}</span>
              <span className="font-bold text-brand-black dark:text-brand-white">
                {subtotal} {t.egyptPound}
              </span>
            </div>

            {appliedPromo && (
              <div className="flex justify-between text-brand-green">
                <span className="font-medium">
                  {t.cart.discount} ({appliedPromo.discount}%)
                </span>
                <span className="font-bold">− {discountAmount} {t.egyptPound}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-brand-black/50 dark:text-brand-white/50">
              <span>{t.cart.shipping}</span>
              <span>{lang === "en" ? "Calculated at checkout" : "يُحسب عند الدفع"}</span>
            </div>

            <div className="border-t border-brand-green/20 pt-3 flex justify-between text-base">
              <span className="font-bold text-brand-black dark:text-brand-white">{t.cart.total}</span>
              <span className="font-black text-2xl text-brand-green">
                {total} {t.egyptPound}
              </span>
            </div>
          </div>

          <Link
            to="/checkout"
            state={{ appliedPromo }}
            className="block"
          >
            <Button size="lg" className="w-full">
              {t.cart.checkout} <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  CHECKOUT PAGE
 *  Full order form with governorate-based shipping + promo code support.
 *  Calculation: subtotal − discountAmount + shippingPrice = finalTotal
 * ───────────────────────────────────────────────────────────────────────────── */
export function Checkout() {
  const {
    t, lang, cart, createOrder, clearCart, toast, user, products, uploadImage,
    validatePromoCode, incrementPromoUsage, getShippingPrice,
  } = useApp();

  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [payment, setPayment] = useState<"cod" | "vodafone">("cod");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [senderPhone, setSenderPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    governorate: "Cairo",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Promo code state ──────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string; promoId: string; discount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const items = cart
    .map((c) => {
      const p = products.find((pp) => pp.id === c.productId);
      return { ...c, product: p };
    })
    .filter((i) => i.product);

  // ── Order total calculation ───────────────────────────────────────────────
  // Formula: subtotal − discountAmount + shippingPrice = finalTotal
  const subtotal = items.reduce((s, i) => s + i.product!.price * i.quantity, 0);
  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discount) / 100)
    : 0;
  const shippingPrice = getShippingPrice(form.governorate);
  const total = subtotal - discountAmount + shippingPrice;

  if (items.length === 0 && step !== "done") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <EmptyState
          icon={<ShoppingBag size={40} />}
          title={t.cart.empty}
          action={
            <Link to="/shop">
              <Button size="lg">{lang === "en" ? "Start shopping" : "ابدأ التسوق"}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t.checkout.required;
    if (!form.phone.trim() || form.phone.length < 10) e.phone = t.checkout.required;
    if (!form.address.trim()) e.address = t.checkout.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Apply promo code ──────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    const result = await validatePromoCode(promoInput.trim(), subtotal);
    setPromoLoading(false);
    if (result.ok) {
      setAppliedPromo({ code: promoInput.trim().toUpperCase(), promoId: result.promoId, discount: result.discount });
      setPromoInput("");
      toast(result.message, "success");
    } else {
      toast(result.message, "error");
    }
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    try {
      setUploading(true);

      // Upload Vodafone Cash screenshot to Cloudinary
      let screenshotUrl: string | undefined = undefined;
      if (payment === "vodafone" && screenshot) {
        try {
          screenshotUrl = await uploadImage(screenshot, "payment-screenshots");
        } catch {
          toast(
            lang === "en"
              ? "Failed to upload payment screenshot. Please try again."
              : "فشل رفع صورة إثبات الدفع. حاول تاني.",
            "error"
          );
          setUploading(false);
          return;
        }
      }

      const id = await createOrder({
        user: user?.email || "guest@stickiify.eg",
        products: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.product!.price,
        })),
        total,
        paymentMethod: payment,
        paymentStatus: "pending",
        orderStatus: "pending",
        address: form.address,
        phone: form.phone,
        name: form.name,
        governorate: form.governorate,
        notes: form.notes,
        senderPhone: payment === "vodafone" ? senderPhone : undefined,
        screenshot: screenshotUrl,
        // ── Snapshot shipping + promo at order creation time ──────────────
        shippingPrice,
        promoCode: appliedPromo?.code,
        discountPercentage: appliedPromo?.discount,
        discountAmount: appliedPromo ? discountAmount : undefined,
      });

      // Atomically increment promo usedCount after successful order
      if (appliedPromo?.promoId) {
        await incrementPromoUsage(appliedPromo.promoId);
      }

      setOrderId(id);
      clearCart();
      setStep("done");
      toast(t.checkout.success + " " + id);
    } catch {
      toast(lang === "en" ? "Failed to place order. Try again." : "فشل إرسال الطلب. حاول تاني.", "error");
    } finally {
      setUploading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-brand-lime mx-auto flex items-center justify-center mb-6 glow-lime"
        >
          <Check size={48} className="text-brand-green" strokeWidth={3} />
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-black text-brand-black dark:text-brand-white mb-4">
          {lang === "en" ? "Order Placed!" : "تم الطلب!"}
        </h1>
        <p className="text-lg text-brand-black/70 dark:text-brand-white/70 mb-2">
          {t.checkout.success}
        </p>
        <p className="text-3xl font-black text-brand-green mb-8">{orderId}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={`/track?orderId=${orderId}`}>
            <Button size="lg">{lang === "en" ? "Track Order" : "تتبع الطلب"}</Button>
          </Link>
          <Link to="/shop">
            <Button size="lg" variant="outline">
              {lang === "en" ? "Continue shopping" : "كمّل تسوق"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Checkout form ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <h1 className="text-4xl md:text-5xl font-black text-brand-black dark:text-brand-white mb-10">
        {t.checkout.title}
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Left: delivery + payment ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery info */}
          <section className="glass rounded-3xl p-6 space-y-4">
            <h2 className="font-black text-xl text-brand-black dark:text-brand-white">
              {lang === "en" ? "Delivery Info" : "بيانات التوصيل"}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label={t.checkout.name}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
              />
              <Input
                label={t.checkout.phone}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                error={errors.phone}
              />
              <Input
                label={t.checkout.address}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                error={errors.address}
                className="md:col-span-2"
              />
              {/* Governorate dropdown — triggers live shipping price update */}
              <Select
                label={t.checkout.gov}
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                options={governorates.map((g) => ({ value: g, label: g }))}
              />
              <Textarea
                label={t.checkout.notes}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="md:col-span-2"
                rows={3}
              />
            </div>
          </section>

          {/* Payment method */}
          <section className="glass rounded-3xl p-6 space-y-4">
            <h2 className="font-black text-xl text-brand-black dark:text-brand-white">
              {t.checkout.payment}
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { id: "cod", label: t.checkout.cod, icon: "💵" },
                { id: "vodafone", label: t.checkout.vodafone, icon: "📱" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id as "cod" | "vodafone")}
                  className={`p-5 rounded-2xl border-2 text-left transition ${
                    payment === p.id
                      ? "border-brand-lime bg-brand-lime/10"
                      : "border-brand-green/20 hover:border-brand-lime/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <p className="font-bold text-brand-black dark:text-brand-white">{p.label}</p>
                  </div>
                </button>
              ))}
            </div>

            {payment === "vodafone" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-green/10 rounded-2xl p-5 space-y-4"
              >
                <div>
                  <p className="text-sm text-brand-black/70 dark:text-brand-white/70 mb-1">
                    {t.checkout.vodafoneNumber}
                  </p>
                  <p
                    className="text-2xl font-black text-brand-green"
                    dir="ltr"
                    style={{ unicodeBidi: "embed" }}
                  >
                    +20 110 793 0397
                  </p>
                </div>
                <Input
                  label={t.checkout.senderPhone}
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium mb-2 text-brand-black/80 dark:text-brand-white/80">
                    {t.checkout.screenshot}
                    <span className="ml-2 text-xs opacity-60">{t.checkout.screenshotHint}</span>
                  </label>
                  <label className="block w-full cursor-pointer border-2 border-dashed border-brand-green/30 rounded-2xl p-6 text-center hover:border-brand-lime transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    />
                    <div className="text-brand-green font-semibold">
                      {screenshot
                        ? screenshot.name
                        : lang === "en"
                        ? "📎 Click to upload"
                        : "📎 اضغط للرفع"}
                    </div>
                  </label>
                </div>
              </motion.div>
            )}
          </section>
        </div>

        {/* ── Right: order summary ── */}
        <div className="glass rounded-3xl p-6 h-fit sticky top-28 space-y-4">
          <h2 className="font-black text-xl text-brand-black dark:text-brand-white">
            {lang === "en" ? "Summary" : "الملخص"}
          </h2>

          {/* Product list */}
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.productId} className="flex gap-3 items-center">
                <img src={i.product!.images[0]} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-black dark:text-brand-white truncate">
                    {lang === "en" ? i.product!.name : i.product!.nameAr}
                  </p>
                  <p className="text-xs text-brand-black/60 dark:text-brand-white/60">× {i.quantity}</p>
                </div>
                <p className="font-bold text-brand-green">
                  {i.product!.price * i.quantity} {t.egyptPound}
                </p>
              </div>
            ))}
          </div>

          {/* Promo code input */}
          <div className="space-y-2">
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-brand-lime/20 border border-brand-lime rounded-xl px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold text-brand-green">
                  <Tag size={14} />
                  {appliedPromo.code} — {appliedPromo.discount}% {lang === "en" ? "off" : "خصم"}
                </span>
                <button
                  onClick={() => setAppliedPromo(null)}
                  className="text-brand-black/60 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                  placeholder={t.cart.promoPlaceholder}
                  className="flex-1 rounded-xl border border-brand-green/20 bg-white/70 dark:bg-brand-black/40 px-4 py-2.5 text-sm text-brand-black dark:text-brand-white placeholder:text-brand-black/40 dark:placeholder:text-brand-white/40 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30 outline-none transition-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? "…" : t.cart.promoApply}
                </Button>
              </div>
            )}
          </div>

          {/* Totals breakdown */}
          <div className="border-t border-brand-green/20 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-black/70 dark:text-brand-white/70">{t.cart.subtotal}</span>
              <span className="font-bold">
                {subtotal} {t.egyptPound}
              </span>
            </div>

            {appliedPromo && (
              <div className="flex justify-between text-brand-green">
                <span className="font-medium">
                  {t.cart.discount} ({appliedPromo.discount}%)
                </span>
                <span className="font-bold">− {discountAmount} {t.egyptPound}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-brand-black/70 dark:text-brand-white/70">{t.cart.shipping}</span>
              <span className="font-bold">
                {shippingPrice === 0
                  ? lang === "en" ? "Free" : "مجاني"
                  : `${shippingPrice} ${t.egyptPound}`}
              </span>
            </div>

            <div className="border-t border-brand-green/20 pt-2 flex justify-between">
              <span className="font-bold">{t.cart.total}</span>
              <span className="font-black text-2xl text-brand-green">
                {total} {t.egyptPound}
              </span>
            </div>
          </div>

          {/* Place order button */}
          <Button
            size="lg"
            className="w-full"
            disabled={uploading}
            onClick={() => {
              if (!validateForm()) {
                toast(
                  lang === "en"
                    ? "Please fill all required fields"
                    : "املأ كل الحقول المطلوبة",
                  "error"
                );
                return;
              }
              if (payment === "vodafone" && !senderPhone) {
                toast(
                  lang === "en"
                    ? "Please enter the sender phone number"
                    : "أدخل رقم موبايل المرسل",
                  "error"
                );
                return;
              }
              handlePlaceOrder();
            }}
          >
            {uploading ? (
              lang === "en" ? "Uploading…" : "جاري الرفع…"
            ) : (
              <>
                {t.checkout.place} <Check size={18} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
