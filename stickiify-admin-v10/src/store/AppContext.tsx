import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { db, auth, storage } from "../lib/firebase";

import { translations, type Lang } from "../lib/i18n";
import {
  products as seedProducts,
  categories as seedCategories,
  reviews as seedReviews,
  type Product,
  type Category,
  type Review,
  type Order,
  type CustomRequest,
  type RegisteredUser,
} from "../lib/mockData";

export type Feature = {
  id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  order: number;
};

export type HeroContent = {
  title1En: string; title1Ar: string;
  title2En: string; title2Ar: string;
  title3En: string; title3Ar: string;
  subtitleEn: string; subtitleAr: string;
  ctaEn: string; ctaAr: string;
  cta2En: string; cta2Ar: string;
};

const DEFAULT_HERO: HeroContent = {
  title1En: "Stickers That", title1Ar: "ستيكرز",
  title2En: "Stick With", title2Ar: "هتفضل",
  title3En: "You Forever", title3Ar: "معاك للأبد",
  subtitleEn: "Premium custom stickers & prints for every surface, mood, and moment.",
  subtitleAr: "ستيكرز وطباعة بريميوم لكل سطح، موود، ولحظة.",
  ctaEn: "Shop Now", ctaAr: "تسوق الآن",
  cta2En: "Custom Design", cta2Ar: "تصميم مخصص",
};

const DEFAULT_FEATURES: Feature[] = [
  { id: "f1", icon: "🚚", titleEn: "Fast Delivery", titleAr: "توصيل سريع", descEn: "2-5 days Cairo/Giza, up to 7 days nationwide.", descAr: "٢-٥ أيام القاهرة والجيزة و الفيوم، لغاية ٧ أيام للمحافظات.", order: 1 },
  { id: "f2", icon: "🛡️", titleEn: "Quality Guaranteed", titleAr: "جودة مضمونة", descEn: "Premium waterproof vinyl for lasting prints.", descAr: "فينيل بريميوم مضاد للماء لطباعة تدوم.", order: 2 },
  { id: "f3", icon: "🎨", titleEn: "Custom Designs", titleAr: "تصميمات مخصصة", descEn: "Send your design, we'll make it perfect.", descAr: "ابعت تصميمك وأحنا نعمله تحفة.", order: 3 },
  { id: "f4", icon: "✨", titleEn: "Premium Finish", titleAr: "تشطيب بريميوم", descEn: "Glossy, matte, holographic — your choice.", descAr: "لامع، مات، هولوجرافيك — اختارك.", order: 4 },
];

type CartItem = { productId: string; quantity: number };

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
} | null;

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

type AppState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: any;
  dir: "ltr" | "rtl";
  theme: "light" | "dark";
  toggleTheme: () => void;

  user: User;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  register: (name: string, email: string, password: string, phone: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  updateUser: (patch: Partial<NonNullable<User>>) => void;
  forgotPassword: (emailOrPhone: string) => { ok: boolean; message: string };
  resetPassword: (email: string, code: string, newPassword: string) => { ok: boolean; message: string };

  cart: CartItem[];
  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  categories: Category[];
  addCategory: (c: Category) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  orders: Order[];
  customRequests: CustomRequest[];
  allUsers: RegisteredUser[];
  createOrder: (o: Omit<Order, "id" | "createdAt" | "history">) => Promise<string>;
  createRequest: (r: Omit<CustomRequest, "id" | "createdAt">) => void;
  updateOrderStatus: (id: string, status: Order["orderStatus"]) => void;
  updatePaymentStatus: (id: string, status: Order["paymentStatus"]) => void;
  updateRequestStatus: (id: string, status: CustomRequest["status"]) => void;
  updateShippingInfo: (id: string, info: { shippingCompany?: string; trackingNumber?: string; shippingNotes?: string; estimatedDelivery?: string; shippedAt?: string }) => void;

  reviews: Review[];
  addReview: (r: Review) => void;
  updateReview: (id: string, patch: Partial<Review>) => void;
  deleteReview: (id: string) => void;

  heroImage: string;
  setHeroImage: (url: string) => void;
  logoImage: string;
  setLogoImage: (url: string) => void;

  heroContent: HeroContent;
  setHeroContent: (content: HeroContent) => Promise<void>;

  features: Feature[];
  addFeature: (f: Feature) => Promise<void>;
  updateFeature: (id: string, patch: Partial<Feature>) => Promise<void>;
  deleteFeature: (id: string) => Promise<void>;

  uploadImage: (file: File, folder: string) => Promise<string>;

  toasts: Toast[];
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;

  loading: boolean;
};

const AppContext = createContext<AppState | null>(null);

const ADMIN_EMAIL = "ziadelkady20@gmail.com";

const LS = {
  lang: "stk_lang",
  theme: "stk_theme",
  cart: "stk_cart",
  wish: "stk_wish",
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadJSON(LS.lang, "ar" as Lang));
  const [theme, setTheme] = useState<"light" | "dark">(() => loadJSON(LS.theme, "light"));
  const [user, setUser] = useState<User>(null);
  const [cart, setCart] = useState<CartItem[]>(() => loadJSON(LS.cart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => loadJSON(LS.wish, []));
 const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customRequests, setRequests] = useState<CustomRequest[]>([]);
  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [heroImage, setHeroImageState] = useState<string>("/hero.jpg");
  const [logoImage, setLogoImageState] = useState<string>("/logo.png");
  const [heroContent, setHeroContentState] = useState<HeroContent>(DEFAULT_HERO);
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetCodes, setResetCodes] = useState<Record<string, { code: string; expiresAt: number }>>({});

  const t = translations[lang];
  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem(LS.lang, JSON.stringify(lang));
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    localStorage.setItem(LS.theme, JSON.stringify(theme));
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => localStorage.setItem(LS.cart, JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem(LS.wish, JSON.stringify(wishlist)), [wishlist]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const role = fbUser.email === ADMIN_EMAIL ? "admin" : "user";
        try {
          const snap = await getDocs(query(collection(db, "users")));
          const found = snap.docs.find((d) => d.id === fbUser.uid);
          const data = found?.data();
          setUser({
            id: fbUser.uid,
            name: data?.name || fbUser.email?.split("@")[0] || "User",
            email: fbUser.email || "",
            phone: data?.phone,
            role,
          });
        } catch {
          setUser({
            id: fbUser.uid,
            name: fbUser.email?.split("@")[0] || "User",
            email: fbUser.email || "",
            role,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (snap) => setOrders(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Order))),
      () => {}
    );
    const unsubReqs = onSnapshot(
      query(collection(db, "requests"), orderBy("createdAt", "desc")),
      (snap) => setRequests(snap.docs.map((d) => ({ ...d.data(), id: d.id } as CustomRequest))),
      () => {}
    );
    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Product));
        setProducts(docs);
      },
      () => setProducts([])
    );
    const unsubCategories = onSnapshot(
      collection(db, "categories"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Category));
        setCategories(docs);
      },
      () => setCategories([])
    );
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => setAllUsers(snap.docs.map((d) => ({ ...d.data(), id: d.id } as RegisteredUser))),
      () => {}
    );
    const unsubReviews = onSnapshot(
      collection(db, "reviews"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Review));
        setReviews(docs);
      },
      () => setReviews([])
    );
    const unsubHero = onSnapshot(
      collection(db, "settings"),
      (snap) => {
        const heroDoc = snap.docs.find((d) => d.id === "hero");
        if (heroDoc?.data()?.image) setHeroImageState(heroDoc.data().image);
        const logoDoc = snap.docs.find((d) => d.id === "logo");
        if (logoDoc?.data()?.image) setLogoImageState(logoDoc.data().image);
        const heroContentDoc = snap.docs.find((d) => d.id === "heroContent");
        if (heroContentDoc?.data()) setHeroContentState({ ...DEFAULT_HERO, ...heroContentDoc.data() } as HeroContent);
      },
      () => {}
    );
    const unsubFeatures = onSnapshot(
      collection(db, "features"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Feature));
        setFeatures(docs.length > 0 ? docs.sort((a, b) => a.order - b.order) : DEFAULT_FEATURES);
      },
      () => setFeatures(DEFAULT_FEATURES)
    );
    return () => {
      unsubOrders();
      unsubReqs();
      unsubProducts();
      unsubCategories();
      unsubUsers();
      unsubReviews();
      unsubHero();
      unsubFeatures();
    };
  }, []);

  useEffect(() => {
    
    seedFirestore();
  }, []);

  const setLang = (l: Lang) => setLangState(l);
  const toggleTheme = () => setTheme((th) => (th === "light" ? "dark" : "light"));

  const login = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL;
      if (!isAdmin) {
        const snap = await getDocs(query(collection(db, "users")));
        const found = snap.docs.find((d) => d.id === cred.user.uid);
        if (!found) {
          await signOut(auth);
          return {
            ok: false,
            message: lang === "ar" ? "مفيش حساب مسجل بالإيميل ده" : "No registered account found for this email",
          };
        }
      }
      return {
        ok: true,
        message: isAdmin ? "Welcome back, Admin 👑" : lang === "ar" ? "أهلًا بيك! 👋" : "Logged in successfully",
      };
    } catch {
      return {
        ok: false,
        message: lang === "ar" ? "الإيميل أو كلمة السر غلط" : "Invalid email or password",
      };
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    if (!name || !email || !password)
      return { ok: false, message: lang === "ar" ? "املأ كل الحقول" : "Fill all fields" };
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        name,
        email: email.trim().toLowerCase(),
        phone: phone || "",
        role: "user",
        createdAt: new Date().toISOString(),
      });
      return { ok: true, message: lang === "ar" ? "تم إنشاء الحساب ✅" : "Account created ✅" };
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use")
        return { ok: false, message: lang === "ar" ? "الإيميل ده مسجل بالفعل" : "Email already registered" };
      if (err.code === "auth/weak-password")
        return { ok: false, message: lang === "ar" ? "كلمة السر ضعيفة (6 أحرف على الأقل)" : "Password too weak (min 6 chars)" };
      return { ok: false, message: lang === "ar" ? "حصل خطأ، حاول تاني" : "Something went wrong" };
    }
  };

  const logout = () => signOut(auth);
  const updateUser = (patch: Partial<NonNullable<User>>) =>
    setUser((u) => (u ? { ...u, ...patch } : u));

  const forgotPassword = async (emailOrPhone: string) => {
    const normalized = emailOrPhone.trim().toLowerCase();
    const found = allUsers.find(
      (u) =>
        u.email.toLowerCase() === normalized ||
        (u.phone && u.phone.replace(/\s/g, "") === normalized.replace(/\s/g, ""))
    );
    if (!found) {
      return { ok: false, message: lang === "ar" ? "مفيش حساب بالبيانات دي" : "No account found" };
    }
    try {
      await sendPasswordResetEmail(auth, found.email);
      return {
        ok: true,
        message: lang === "ar" ? "تم إرسال رابط تغيير كلمة السر على إيميلك ✅" : "Password reset email sent ✅",
        email: found.email,
      };
    } catch {
      return { ok: false, message: lang === "ar" ? "حصل خطأ، حاول تاني" : "Something went wrong" };
    }
  };

  const resetPassword = (email: string, code: string, newPassword: string) => {
    const key = email.trim().toLowerCase();
    const entry = resetCodes[key];
    if (!entry) return { ok: false, message: lang === "ar" ? "اطلب كود تحقق أولاً" : "Request a reset code first" };
    if (Date.now() > entry.expiresAt) {
      setResetCodes((prev) => { const n = { ...prev }; delete n[key]; return n; });
      return { ok: false, message: lang === "ar" ? "الكود انتهت صلاحيته" : "Code expired" };
    }
    if (entry.code !== code.trim()) return { ok: false, message: lang === "ar" ? "كود التحقق غلط" : "Invalid code" };
    if (newPassword.length < 6) return { ok: false, message: lang === "ar" ? "كلمة السر لازم 6 أحرف على الأقل" : "Min 6 characters" };
    if (auth.currentUser) {
      updatePassword(auth.currentUser, newPassword).catch(() => {});
    }
    setResetCodes((prev) => { const n = { ...prev }; delete n[key]; return n; });
    return { ok: true, message: lang === "ar" ? "تم تغيير كلمة السر ✅" : "Password changed ✅" };
  };

  const addToCart = (productId: string, qty = 1) => {
    setCart((c) => {
      const found = c.find((i) => i.productId === productId);
      if (found) return c.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i);
      return [...c, { productId, quantity: qty }];
    });
  };
  const removeFromCart = (productId: string) => setCart((c) => c.filter((i) => i.productId !== productId));
  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart((c) => c.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };
  const clearCart = () => setCart([]);
  const toggleWishlist = (productId: string) => {
    setWishlist((w) => w.includes(productId) ? w.filter((id) => id !== productId) : [...w, productId]);
  };

  const addProduct = async (p: Product) => { await setDoc(doc(db, "products", p.id), p); };
  const updateProduct = async (id: string, patch: Partial<Product>) => { await updateDoc(doc(db, "products", id), patch as any); };
  const deleteProduct = async (id: string) => { await deleteDoc(doc(db, "products", id)); };

  const addCategory = async (c: Category) => { await setDoc(doc(db, "categories", c.id), c); };
  const updateCategory = async (id: string, patch: Partial<Category>) => { await updateDoc(doc(db, "categories", id), patch as any); };
  const deleteCategory = async (id: string) => { await deleteDoc(doc(db, "categories", id)); };

  const addReview = async (r: Review) => { await setDoc(doc(db, "reviews", r.id), r); };
  const updateReview = async (id: string, patch: Partial<Review>) => { await updateDoc(doc(db, "reviews", id), patch as any); };
  const deleteReview = async (id: string) => { await deleteDoc(doc(db, "reviews", id)); };

  const setHeroImage = async (url: string) => {
    await setDoc(doc(db, "settings", "hero"), { image: url });
    setHeroImageState(url);
  };
  const setLogoImage = async (url: string) => {
    await setDoc(doc(db, "settings", "logo"), { image: url });
    setLogoImageState(url);
  };
  const setHeroContent = async (content: HeroContent) => {
    await setDoc(doc(db, "settings", "heroContent"), content as any);
    setHeroContentState(content);
  };

  const addFeature = async (f: Feature) => { await setDoc(doc(db, "features", f.id), f); };
  const updateFeature = async (id: string, patch: Partial<Feature>) => { await updateDoc(doc(db, "features", id), patch as any); };
  const deleteFeature = async (id: string) => { await deleteDoc(doc(db, "features", id)); };

  // ── Upload Image to Cloudinary ─────────────────────────────────────
const uploadImage = async (file: File, folder: string): Promise<string> => {
  console.log(`[uploadImage] Starting Cloudinary upload`);

  try {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "stickify_upload");
    formData.append("folder", folder);

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dvralpxes/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error("Cloudinary upload failed");
    }

    console.log(`[uploadImage] URL: ${data.secure_url}`);

    return data.secure_url;
  } catch (err: any) {
    console.error(`[uploadImage] Failed: ${err?.message}`);
    throw err;
  }
};
  // ── Orders (Firestore) ────────────────────────────────────────────────────
  const createOrder = async (o: Omit<Order, "id" | "createdAt" | "history">) => {
    const id = "ORD-" + Date.now();
    const now = new Date().toISOString();
    const raw: Order = {
      ...o,
      id,
      createdAt: now,
      history: [{ status: o.orderStatus, timestamp: now }],
    };
    const order = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined)
    ) as Order;
    await setDoc(doc(db, "orders", id), order);
    return id;
  };

  const updateOrderStatus = async (id: string, status: Order["orderStatus"]) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const history = [...order.history, { status, timestamp: new Date().toISOString() }];
    await updateDoc(doc(db, "orders", id), { orderStatus: status, history });
  };

  const updatePaymentStatus = async (id: string, status: Order["paymentStatus"]) => {
    await updateDoc(doc(db, "orders", id), { paymentStatus: status });
  };

  const updateShippingInfo = async (
    id: string,
    info: { shippingCompany?: string; trackingNumber?: string; shippingNotes?: string; estimatedDelivery?: string; shippedAt?: string }
  ) => {
    await updateDoc(doc(db, "orders", id), info as any);
  };

  const createRequest = async (r: Omit<CustomRequest, "id" | "createdAt">) => {
    const id = "REQ-" + Date.now();
    await setDoc(doc(db, "requests", id), { ...r, id, createdAt: new Date().toISOString() });
  };

  const updateRequestStatus = async (id: string, status: CustomRequest["status"]) => {
    await updateDoc(doc(db, "requests", id), { status });
  };

  const toast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => dismissToast(id), 3500);
  };
  const dismissToast = (id: string) => setToasts((ts) => ts.filter((t) => t.id !== id));

  return (
    <AppContext.Provider
      value={{
        lang, setLang, t, dir, theme, toggleTheme,
        user, login, register, logout, updateUser, forgotPassword, resetPassword,
        cart, addToCart, removeFromCart, updateQty, clearCart,
        wishlist, toggleWishlist,
        products, addProduct, updateProduct, deleteProduct,
        categories, addCategory, updateCategory, deleteCategory,
        orders, customRequests, allUsers,
        createOrder, createRequest,
        updateOrderStatus, updatePaymentStatus, updateRequestStatus, updateShippingInfo,
        reviews, addReview, updateReview, deleteReview,
        heroImage, setHeroImage,
        logoImage, setLogoImage,
        heroContent, setHeroContent,
        features, addFeature, updateFeature, deleteFeature,
        uploadImage,
        toasts, toast, dismissToast,
        loading,
      } as AppState}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
