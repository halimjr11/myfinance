"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Flame,
  Globe2,
  Goal as GoalIcon,
  Heart,
  Info,
  Landmark,
  LayoutDashboard,
  LineChart,
  LogOut,
  Mail,
  Pencil,
  PieChart,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { auth, db, firebaseReady } from "@/lib/firebase";
import { setFirebaseAnalyticsUserId, trackAnalyticsEvent } from "@/lib/firebase-analytics";
import type {
  Budget,
  BudgetDraft,
  Goal,
  MoneyMindset,
  Transaction,
  TransactionDraft,
  TransactionType,
  WishlistDraft,
  WishlistGroup,
  WishlistGroupDraft,
  WishlistItem,
  WishlistPriority,
} from "@/types/finance";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function toDateInputFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthInputToLocalDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthRange(value: string) {
  const start = monthInputToLocalDate(value);
  return {
    start,
    end: addMonths(start, 1),
    trendStart: addMonths(start, -5),
  };
}

const today = toDateInputFromDate(new Date());

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "saving", label: "Tabungan" },
  { value: "investment", label: "Investasi" },
  { value: "debt", label: "Cicilan/Utang" },
];

const expenseAllocationOptions: { value: MoneyMindset; label: string }[] = [
  { value: "need", label: "Kebutuhan" },
  { value: "want", label: "Keinginan" },
];

const categories = [
  "Gaji",
  "Bisnis",
  "Makanan",
  "Transport",
  "Rumah",
  "Tagihan",
  "Kesehatan",
  "Hiburan",
  "Belanja",
  "Edukasi",
  "Investasi",
  "Dana Darurat",
  "Cicilan",
  "Lainnya",
];

const transactionCategories: Record<TransactionType, string[]> = {
  income: ["Gaji", "Bisnis", "Lainnya"],
  expense: ["Makanan", "Transport", "Rumah", "Tagihan", "Kesehatan", "Hiburan", "Belanja", "Edukasi", "Lainnya"],
  saving: ["Dana Darurat", "Rumah", "Edukasi", "Lainnya"],
  investment: ["Investasi", "Pensiun", "Edukasi", "Lainnya"],
  debt: ["Cicilan", "Rumah", "Tagihan", "Lainnya"],
};

const wishlistCategories = [
  "Pembelian",
  "Perjalanan",
  "Pengembangan diri",
  "Keluarga",
  "Pengalaman",
  "Lainnya",
];

const wishlistPriorities: { value: WishlistPriority; label: string }[] = [
  { value: "high", label: "Prioritas tinggi" },
  { value: "medium", label: "Prioritas sedang" },
  { value: "low", label: "Prioritas rendah" },
];

const demoTransactionSignatures: Array<Pick<Transaction, "type" | "title" | "category" | "mindset" | "amount">> = [
  {
    type: "income",
    title: "Gaji bulanan",
    category: "Gaji",
    mindset: "future",
    amount: 12000000,
  },
  {
    type: "expense",
    title: "Makan dan groceries",
    category: "Makanan",
    mindset: "need",
    amount: 1850000,
  },
  {
    type: "expense",
    title: "Hiburan",
    category: "Hiburan",
    mindset: "want",
    amount: 650000,
  },
  {
    type: "saving",
    title: "Dana darurat",
    category: "Dana Darurat",
    mindset: "future",
    amount: 1800000,
  },
  {
    type: "investment",
    title: "Reksa dana indeks",
    category: "Investasi",
    mindset: "future",
    amount: 1200000,
  },
];

const demoBudgetSignatures: Array<Pick<Budget, "category" | "limit" | "mindset">> = [
  { category: "Makanan", limit: 2500000, mindset: "need" },
  { category: "Transport", limit: 1200000, mindset: "need" },
  { category: "Hiburan", limit: 900000, mindset: "want" },
  { category: "Belanja", limit: 1000000, mindset: "want" },
];

const demoGoalSignatures: Array<Pick<Goal, "title" | "target">> = [
  {
    title: "Dana darurat 6 bulan",
    target: 48000000,
  },
  {
    title: "DP rumah",
    target: 150000000,
  },
];

function isDemoTransaction(item: Transaction) {
  return demoTransactionSignatures.some((demo) => (
    demo.type === item.type &&
    demo.title === item.title &&
    demo.category === item.category &&
    demo.mindset === item.mindset &&
    demo.amount === item.amount
  ));
}

function isDemoBudget(item: Budget) {
  return demoBudgetSignatures.some((demo) => (
    demo.category === item.category &&
    demo.mindset === item.mindset &&
    demo.limit === item.limit
  ));
}

function isDemoGoal(item: Goal) {
  return demoGoalSignatures.some((demo) => (
    demo.title === item.title && demo.target === item.target
  ));
}

function transactionAllocationLabel(item: Transaction) {
  if (item.type === "income") return "Pemasukan";
  if (item.type === "saving") return "Tabungan";
  if (item.type === "investment") return "Investasi";
  if (item.type === "debt") return "Cicilan";
  return expenseAllocationOptions.find((option) => option.value === item.mindset)?.label ?? "Pengeluaran";
}

function asNumber(value: FormDataEntryValue | null) {
  return Number(String(value ?? "0").replace(/[^\d]/g, ""));
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function formatDateLabel(date: string) {
  return dateInputToLocalDate(date).toLocaleDateString("id-ID");
}

function toDateInput(value: unknown) {
  if (value instanceof Timestamp) {
    return toDateInputFromDate(value.toDate());
  }
  return String(value ?? today);
}

function mapTransactionDoc(snapshotDoc: { id: string; data: () => Record<string, unknown> }) {
  const data = snapshotDoc.data();
  return { id: snapshotDoc.id, ...data, date: toDateInput(data.date) } as Transaction;
}

function mapGoalDoc(snapshotDoc: { id: string; data: () => Record<string, unknown> }) {
  const data = snapshotDoc.data();
  return { id: snapshotDoc.id, ...data, deadline: toDateInput(data.deadline) } as Goal;
}

function mapBudgetDoc(snapshotDoc: { id: string; data: () => Record<string, unknown> }) {
  const data = snapshotDoc.data();
  return { id: snapshotDoc.id, ...data } as Budget;
}

function mapWishlistDoc(snapshotDoc: { id: string; data: () => Record<string, unknown> }) {
  const data = snapshotDoc.data();
  return { id: snapshotDoc.id, ...data, deadline: toDateInput(data.deadline) } as WishlistItem;
}

function mapWishlistGroupDoc(snapshotDoc: { id: string; data: () => Record<string, unknown> }) {
  const data = snapshotDoc.data();
  return { id: snapshotDoc.id, ...data, deadline: toDateInput(data.deadline) } as WishlistGroup;
}

function authErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "Domain aplikasi belum diizinkan di Firebase Authentication.";
    case "auth/operation-not-allowed":
      return "Provider login ini belum diaktifkan di Firebase.";
    case "auth/popup-closed-by-user":
      return "Jendela login ditutup sebelum proses selesai.";
    case "auth/popup-blocked":
      return "Popup login diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.";
    case "auth/network-request-failed":
      return "Koneksi ke Firebase gagal. Periksa jaringan lalu coba lagi.";
    case "auth/invalid-credential":
      return "Email atau password tidak valid.";
    default:
      return error instanceof Error ? error.message : "Proses autentikasi gagal.";
  }
}

function firestoreErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code.includes("permission-denied")) {
    return "Akses Firestore ditolak. Muat ulang halaman dan pastikan Anda masih login.";
  }
  if (code.includes("unavailable")) {
    return "Firestore sedang tidak terjangkau. Periksa koneksi lalu coba lagi.";
  }
  return "Data belum berhasil disimpan. Silakan coba kembali.";
}

export type FinanceView = "dashboard" | "transactions" | "budgets" | "goals" | "wishlist";
type WishlistToast = {
  message: string;
  tone: "success" | "error" | "info";
};

const viewCopy: Record<FinanceView, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: {
    eyebrow: "Ringkasan keuangan",
    title: "Dashboard",
    subtitle: "Pantau arus kas, alokasi, dan kesehatan finansial Anda.",
  },
  transactions: {
    eyebrow: "Pencatatan harian",
    title: "Transaksi",
    subtitle: "Catat pemasukan, pengeluaran, tabungan, investasi, dan cicilan di sini.",
  },
  budgets: {
    eyebrow: "Kontrol pengeluaran",
    title: "Budget",
    subtitle: "Tetapkan batas bulanan dan pantau penggunaannya.",
  },
  goals: {
    eyebrow: "Rencana masa depan",
    title: "Financial Goals",
    subtitle: "Ukur perkembangan target keuangan jangka pendek dan panjang.",
  },
  wishlist: {
    eyebrow: "Checklist masa depan",
    title: "Wishlist",
    subtitle: "Simpan keinginan, tentukan prioritas, dan tandai saat sudah tercapai.",
  },
};

export default function FinanceApp({ view }: { view: FinanceView }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(firebaseReady);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wishlistGroups, setWishlistGroups] = useState<WishlistGroup[]>([]);
  const [selectedWishlistGroupId, setSelectedWishlistGroupId] = useState("");
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [transactionFormType, setTransactionFormType] = useState<TransactionType>("expense");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wishlistWriteState, setWishlistWriteState] = useState<"group" | "item" | "cleanup" | null>(null);
  const [wishlistToast, setWishlistToast] = useState<WishlistToast | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalUpdatingId, setGoalUpdatingId] = useState<string | null>(null);
  const [demoCleanupBusy, setDemoCleanupBusy] = useState(false);
  const wishlistGroupSubmitLock = useRef(false);
  const wishlistItemSubmitLock = useRef(false);
  const goalUpdateLocks = useRef(new Set<string>());

  useEffect(() => {
    if (!wishlistToast) {
      return;
    }
    const timer = window.setTimeout(() => setWishlistToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [wishlistToast]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      void setFirebaseAnalyticsUserId(nextUser?.uid ?? null);
      if (!nextUser) {
        setTransactions([]);
        setBudgets([]);
        setGoals([]);
        setWishlistGroups([]);
        setWishlistItems([]);
        setSelectedWishlistGroupId("");
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) {
      return;
    }

    const userRef = collection(db, "users", user.uid, "transactions");
    const budgetsRef = collection(db, "users", user.uid, "budgets");
    const goalsRef = collection(db, "users", user.uid, "goals");
    const wishlistGroupsRef = collection(db, "users", user.uid, "wishlistGroups");
    const range = monthRange(month);

    const unsubTransactions = onSnapshot(
      query(
        userRef,
        where("date", ">=", Timestamp.fromDate(range.trendStart)),
        where("date", "<", Timestamp.fromDate(range.end)),
        orderBy("date", "desc"),
      ),
      (snapshot) => {
        setTransactions(snapshot.docs.map(mapTransactionDoc));
      },
      (error) => setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" }),
    );
    const unsubBudgets = onSnapshot(query(budgetsRef, orderBy("category", "asc")), (snapshot) => {
      setBudgets(snapshot.docs.map(mapBudgetDoc));
    }, (error) => setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" }));
    const unsubGoals = onSnapshot(query(goalsRef, orderBy("deadline", "asc")), (snapshot) => {
      setGoals(snapshot.docs.map(mapGoalDoc));
    }, (error) => setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" }));
    const unsubWishlistGroups = onSnapshot(
      query(wishlistGroupsRef, orderBy("title", "asc")),
      (snapshot) => {
        const nextGroups = snapshot.docs.map(mapWishlistGroupDoc);
        setWishlistGroups(nextGroups);
        setSelectedWishlistGroupId((current) => (
          nextGroups.some((group) => group.id === current) ? current : (nextGroups[0]?.id ?? "")
        ));
      },
      (error) => setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" }),
    );

    return () => {
      unsubTransactions();
      unsubBudgets();
      unsubGoals();
      unsubWishlistGroups();
    };
  }, [month, user]);

  useEffect(() => {
    if (!user || !db || !selectedWishlistGroupId) {
      return;
    }

    const itemsRef = collection(
      db,
      "users",
      user.uid,
      "wishlistGroups",
      selectedWishlistGroupId,
      "items",
    );
    return onSnapshot(
      query(itemsRef, orderBy("deadline", "asc")),
      (snapshot) => setWishlistItems(snapshot.docs.map(mapWishlistDoc)),
      (error) => setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" }),
    );
  }, [selectedWishlistGroupId, user]);

  function selectWishlistGroup(groupId: string) {
    setWishlistItems([]);
    setSelectedWishlistGroupId(groupId);
  }

  const monthlyTransactions = useMemo(
    () => transactions.filter((item) => monthKey(item.date) === month),
    [transactions, month],
  );

  const stats = useMemo(() => {
    const income = monthlyTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const spending = monthlyTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const savings = monthlyTransactions
      .filter((item) => item.type === "saving" || item.type === "investment")
      .reduce((sum, item) => sum + item.amount, 0);
    const debt = monthlyTransactions
      .filter((item) => item.type === "debt")
      .reduce((sum, item) => sum + item.amount, 0);
    const needs = monthlyTransactions
      .filter((item) => item.type === "expense" && item.mindset === "need")
      .reduce((sum, item) => sum + item.amount, 0);
    const wants = monthlyTransactions
      .filter((item) => item.type === "expense" && item.mindset === "want")
      .reduce((sum, item) => sum + item.amount, 0);
    const future = monthlyTransactions
      .filter((item) => (
        item.type === "saving" ||
        item.type === "investment" ||
        item.type === "debt" ||
        (item.type === "expense" && item.mindset === "future")
      ))
      .reduce((sum, item) => sum + item.amount, 0);
    const net = income - spending - savings - debt;
    const savingsRate = income ? Math.round((savings / income) * 100) : 0;
    const debtRatio = income ? Math.round((debt / income) * 100) : 0;
    const monthlyBurn = spending + debt;
    const emergencyFund = goals.find((goal) => goal.title.toLowerCase().includes("darurat"))?.current ?? 0;
    const runway = monthlyBurn ? emergencyFund / monthlyBurn : 0;

    const byCategory = monthlyTransactions
      .filter((item) => item.type === "expense" || item.type === "debt")
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.amount;
        return acc;
      }, {});

    const categoryRows = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const budgetRows = budgets
      .filter((budget) => !budget.month || budget.month === month)
      .map((budget) => {
        const used = byCategory[budget.category] ?? 0;
        return {
          ...budget,
          used,
          remaining: budget.limit - used,
          percent: budget.limit ? Math.min(100, Math.round((used / budget.limit) * 100)) : 0,
        };
      });

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        45 +
          Math.min(savingsRate, 35) -
          Math.max(0, debtRatio - 30) -
          (net < 0 ? 15 : 0) +
          Math.min(Math.round(runway * 3), 20),
      ),
    );

    return {
      income,
      spending,
      savings,
      debt,
      needs,
      wants,
      future,
      net,
      savingsRate,
      debtRatio,
      monthlyBurn,
      runway,
      categoryRows,
      budgetRows,
      healthScore,
    };
  }, [budgets, goals, month, monthlyTransactions]);

  const monthlyTrend = useMemo(() => {
    const keys = Array.from(new Set(transactions.map((item) => monthKey(item.date)))).sort().slice(-6);
    return keys.map((key) => {
      const rows = transactions.filter((item) => monthKey(item.date) === key);
      const income = rows.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
      const outflow = rows
        .filter((item) => item.type !== "income")
        .reduce((sum, item) => sum + item.amount, 0);
      return { month: key, income, outflow };
    });
  }, [transactions]);

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (!auth) {
        throw new Error("Firebase belum dikonfigurasi.");
      }

      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        void trackAnalyticsEvent("login", { method: "password" });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        void trackAnalyticsEvent("sign_up", { method: "password" });
      }
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleAuth() {
    setAuthError("");
    setBusy(true);
    try {
      if (!auth) {
        throw new Error("Firebase belum dikonfigurasi.");
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      void trackAnalyticsEvent("login", { method: "google" });
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !db) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = form.get("type") as TransactionType;
    const mindset: MoneyMindset = type === "expense"
      ? form.get("mindset") as MoneyMindset
      : type === "debt"
        ? "debt"
        : "future";
    const payload: TransactionDraft = {
      type,
      title: String(form.get("title") ?? ""),
      category: String(form.get("category") ?? "Lainnya"),
      mindset,
      amount: asNumber(form.get("amount")),
      date: String(form.get("date") ?? today),
      note: String(form.get("note") ?? ""),
    };

    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        ...payload,
        title: payload.title.trim(),
        note: payload.note?.trim() ?? "",
        date: Timestamp.fromDate(dateInputToLocalDate(payload.date)),
        createdAt: serverTimestamp(),
      });
      void trackAnalyticsEvent("finance_transaction_created", {
        transaction_type: payload.type,
        allocation_type: payload.mindset,
      });
      formElement.reset();
      setTransactionFormType("expense");
      setWishlistToast({ message: "Transaksi berhasil disimpan.", tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function addBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !db) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await addDoc(collection(db, "users", user.uid, "budgets"), {
        category: String(form.get("category") ?? "Lainnya"),
        month,
        mindset: form.get("mindset") as MoneyMindset,
        limit: asNumber(form.get("limit")),
        createdAt: serverTimestamp(),
      } satisfies BudgetDraft & { createdAt: ReturnType<typeof serverTimestamp> });
      void trackAnalyticsEvent("finance_budget_created");
      formElement.reset();
      setWishlistToast({ message: `Budget ${month} berhasil disimpan.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !db) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await addDoc(collection(db, "users", user.uid, "goals"), {
        title: String(form.get("title") ?? "").trim(),
        target: asNumber(form.get("target")),
        current: asNumber(form.get("current")),
        deadline: Timestamp.fromDate(dateInputToLocalDate(String(form.get("deadline") ?? today))),
        createdAt: serverTimestamp(),
      });
      void trackAnalyticsEvent("finance_goal_created");
      formElement.reset();
      setWishlistToast({ message: "Goal berhasil disimpan.", tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function addWishlistGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !db || wishlistGroupSubmitLock.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload: WishlistGroupDraft = {
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      color: String(form.get("color") ?? "#3478bd"),
      deadline: String(form.get("deadline") ?? today),
    };

    const duplicate = wishlistGroups.find(
      (group) => group.title.trim().toLocaleLowerCase("id-ID") === payload.title.toLocaleLowerCase("id-ID"),
    );
    if (duplicate) {
      selectWishlistGroup(duplicate.id);
      setWishlistToast({
        message: `Grup "${duplicate.title}" sudah ada dan sekarang dipilih.`,
        tone: "info",
      });
      return;
    }

    wishlistGroupSubmitLock.current = true;
    setWishlistWriteState("group");
    setWishlistToast({ message: "Menyimpan grup...", tone: "info" });
    const groupRef = doc(collection(db, "users", user.uid, "wishlistGroups"));
    const optimisticGroup: WishlistGroup = { id: groupRef.id, ...payload };
    setWishlistGroups((current) => [...current, optimisticGroup].sort(
      (left, right) => left.title.localeCompare(right.title, "id-ID"),
    ));
    selectWishlistGroup(groupRef.id);
    formElement.reset();

    try {
      await setDoc(groupRef, {
        ...payload,
        deadline: Timestamp.fromDate(dateInputToLocalDate(payload.deadline)),
        createdAt: serverTimestamp(),
      });
      void trackAnalyticsEvent("wishlist_group_created");
      setWishlistToast({
        message: `Grup "${payload.title}" berhasil dibuat dan langsung ditampilkan.`,
        tone: "success",
      });
    } catch (error) {
      setWishlistGroups((current) => current.filter((group) => group.id !== groupRef.id));
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    } finally {
      wishlistGroupSubmitLock.current = false;
      setWishlistWriteState(null);
    }
  }

  async function updateGoalProgress(event: FormEvent<HTMLFormElement>, goal: Goal) {
    event.preventDefault();
    if (!user || !db || goalUpdateLocks.current.has(goal.id)) return;
    const form = new FormData(event.currentTarget);
    const nextCurrent = asNumber(form.get("current"));

    if (nextCurrent > goal.target) {
      setWishlistToast({
        message: "Dana terkumpul tidak boleh melebihi target goal.",
        tone: "error",
      });
      return;
    }

    goalUpdateLocks.current.add(goal.id);
    setGoalUpdatingId(goal.id);
    setGoals((current) => current.map((item) => (
      item.id === goal.id ? { ...item, current: nextCurrent } : item
    )));

    try {
      await updateDoc(doc(db, "users", user.uid, "goals", goal.id), {
        current: nextCurrent,
      });
      setEditingGoalId(null);
      setWishlistToast({
        message: `Progres "${goal.title}" berhasil diperbarui.`,
        tone: "success",
      });
      void trackAnalyticsEvent("finance_goal_progress_updated");
    } catch (error) {
      setGoals((current) => current.map((item) => (
        item.id === goal.id ? { ...item, current: goal.current } : item
      )));
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    } finally {
      goalUpdateLocks.current.delete(goal.id);
      setGoalUpdatingId(null);
    }
  }

  async function editGoal(goal: Goal) {
    if (!user || !db) return;
    const nextTitle = window.prompt("Nama goal", goal.title)?.trim();
    if (!nextTitle) return;
    const nextTargetRaw = window.prompt("Target dana", String(goal.target));
    if (nextTargetRaw === null) return;
    const nextDeadline = window.prompt("Deadline YYYY-MM-DD", goal.deadline)?.trim();
    if (!nextDeadline) return;
    const nextTarget = asNumber(nextTargetRaw);

    if (nextTarget < goal.current) {
      setWishlistToast({
        message: "Target goal tidak boleh lebih kecil dari dana yang sudah terkumpul.",
        tone: "error",
      });
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid, "goals", goal.id), {
        title: nextTitle,
        target: nextTarget,
        deadline: Timestamp.fromDate(dateInputToLocalDate(nextDeadline)),
      });
      setWishlistToast({ message: `Goal "${nextTitle}" berhasil diperbarui.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function addWishlistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !db || !selectedWishlistGroupId || wishlistItemSubmitLock.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload: WishlistDraft = {
      title: String(form.get("title") ?? "").trim(),
      category: String(form.get("category") ?? "Lainnya"),
      priority: form.get("priority") as WishlistPriority,
      targetAmount: asNumber(form.get("targetAmount")),
      deadline: String(form.get("deadline") ?? today),
      note: String(form.get("note") ?? "").trim(),
      completed: false,
    };

    const duplicate = wishlistItems.find(
      (item) => item.title.trim().toLocaleLowerCase("id-ID") === payload.title.toLocaleLowerCase("id-ID"),
    );
    if (duplicate) {
      setWishlistToast({
        message: `Item "${duplicate.title}" sudah ada di grup ini.`,
        tone: "info",
      });
      return;
    }

    wishlistItemSubmitLock.current = true;
    setWishlistWriteState("item");
    setWishlistToast({ message: "Menyimpan item...", tone: "info" });
    const itemRef = doc(collection(
      db,
      "users",
      user.uid,
      "wishlistGroups",
      selectedWishlistGroupId,
      "items",
    ));
    const optimisticItem: WishlistItem = { id: itemRef.id, ...payload };
    setWishlistItems((current) => [...current, optimisticItem].sort(
      (left, right) => left.deadline.localeCompare(right.deadline),
    ));
    formElement.reset();

    try {
      await setDoc(itemRef, {
        ...payload,
        deadline: Timestamp.fromDate(dateInputToLocalDate(payload.deadline)),
        createdAt: serverTimestamp(),
      });
      void trackAnalyticsEvent("wishlist_item_created", { priority: payload.priority });
      setWishlistToast({
        message: `Item "${payload.title}" berhasil ditambahkan.`,
        tone: "success",
      });
    } catch (error) {
      setWishlistItems((current) => current.filter((item) => item.id !== itemRef.id));
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    } finally {
      wishlistItemSubmitLock.current = false;
      setWishlistWriteState(null);
    }
  }

  async function toggleWishlistItem(item: WishlistItem) {
    if (!user || !db || !selectedWishlistGroupId) return;
    try {
      await updateDoc(doc(
        db,
        "users",
        user.uid,
        "wishlistGroups",
        selectedWishlistGroupId,
        "items",
        item.id,
      ), {
        completed: !item.completed,
      });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function editWishlistItem(item: WishlistItem) {
    if (!user || !db || !selectedWishlistGroupId) return;
    const nextTitle = window.prompt("Nama item", item.title)?.trim();
    if (!nextTitle) return;
    const nextAmountRaw = window.prompt("Target dana", String(item.targetAmount));
    if (nextAmountRaw === null) return;
    const nextDeadline = window.prompt("Target selesai YYYY-MM-DD", item.deadline)?.trim();
    if (!nextDeadline) return;
    const nextNote = window.prompt("Catatan", item.note ?? "")?.trim() ?? "";

    try {
      await updateDoc(doc(
        db,
        "users",
        user.uid,
        "wishlistGroups",
        selectedWishlistGroupId,
        "items",
        item.id,
      ), {
        title: nextTitle,
        targetAmount: asNumber(nextAmountRaw),
        deadline: Timestamp.fromDate(dateInputToLocalDate(nextDeadline)),
        note: nextNote,
      });
      setWishlistToast({ message: `Item "${nextTitle}" berhasil diperbarui.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function removeWishlistItem(id: string) {
    if (!user || !db || !selectedWishlistGroupId) return;
    try {
      await deleteDoc(doc(
        db,
        "users",
        user.uid,
        "wishlistGroups",
        selectedWishlistGroupId,
        "items",
        id,
      ));
      setWishlistToast({ message: "Item wishlist berhasil dihapus.", tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function editWishlistGroup(group: WishlistGroup) {
    if (!user || !db) return;
    const nextTitle = window.prompt("Nama grup", group.title)?.trim();
    if (!nextTitle) return;
    const nextDescription = window.prompt("Deskripsi", group.description)?.trim() ?? "";
    const nextDeadline = window.prompt("Target YYYY-MM-DD", group.deadline)?.trim();
    if (!nextDeadline) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "wishlistGroups", group.id), {
        title: nextTitle,
        description: nextDescription,
        deadline: Timestamp.fromDate(dateInputToLocalDate(nextDeadline)),
      });
      setWishlistToast({ message: `Grup "${nextTitle}" berhasil diperbarui.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function removeWishlistGroup(group: WishlistGroup) {
    if (!user || !db) return;
    const shouldDelete = window.confirm(
      `Hapus grup "${group.title}" beserta seluruh checklist di dalamnya?`,
    );
    if (!shouldDelete) return;

    try {
      const groupRef = doc(db, "users", user.uid, "wishlistGroups", group.id);
      const itemsSnapshot = await getDocs(collection(groupRef, "items"));
      await Promise.all(itemsSnapshot.docs.map((item) => deleteDoc(item.ref)));
      await deleteDoc(groupRef);
      setWishlistToast({ message: `Grup "${group.title}" berhasil dihapus.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function cleanupDuplicateWishlistGroups() {
    if (!user || !db || wishlistGroupSubmitLock.current) return;

    const groupsByTitle = new Map<string, WishlistGroup[]>();
    wishlistGroups.forEach((group) => {
      const key = group.title.trim().toLocaleLowerCase("id-ID");
      groupsByTitle.set(key, [...(groupsByTitle.get(key) ?? []), group]);
    });
    const duplicateSets = [...groupsByTitle.values()].filter((groups) => groups.length > 1);
    if (!duplicateSets.length) {
      setWishlistToast({ message: "Tidak ada grup duplikat.", tone: "info" });
      return;
    }

    const shouldCleanup = window.confirm(
      "Gabungkan checklist dari grup dengan nama sama lalu hapus grup duplikatnya?",
    );
    if (!shouldCleanup) return;

    wishlistGroupSubmitLock.current = true;
    setWishlistWriteState("cleanup");
    setWishlistToast({ message: "Merapikan grup duplikat...", tone: "info" });

    try {
      for (const groups of duplicateSets) {
        const [primaryGroup, ...duplicateGroups] = groups;
        const primaryItemsRef = collection(
          db,
          "users",
          user.uid,
          "wishlistGroups",
          primaryGroup.id,
          "items",
        );
        const primaryItems = await getDocs(primaryItemsRef);
        const signatures = new Set(primaryItems.docs.map((item) => {
          const data = item.data();
          const deadline = data.deadline instanceof Timestamp ? data.deadline.toMillis() : String(data.deadline);
          return JSON.stringify([data.title, data.category, data.targetAmount, deadline, data.completed]);
        }));

        for (const duplicateGroup of duplicateGroups) {
          const duplicateGroupRef = doc(db, "users", user.uid, "wishlistGroups", duplicateGroup.id);
          const duplicateItems = await getDocs(collection(duplicateGroupRef, "items"));

          for (const item of duplicateItems.docs) {
            const data = item.data();
            const deadline = data.deadline instanceof Timestamp ? data.deadline.toMillis() : String(data.deadline);
            const signature = JSON.stringify([
              data.title,
              data.category,
              data.targetAmount,
              deadline,
              data.completed,
            ]);

            if (!signatures.has(signature)) {
              await setDoc(doc(primaryItemsRef), {
                title: data.title,
                category: data.category,
                priority: data.priority,
                targetAmount: data.targetAmount,
                deadline: data.deadline,
                note: typeof data.note === "string" ? data.note : "",
                completed: data.completed,
                createdAt: serverTimestamp(),
              });
              signatures.add(signature);
            }
            await deleteDoc(item.ref);
          }
          await deleteDoc(duplicateGroupRef);
        }
      }
      setWishlistToast({
        message: "Grup duplikat berhasil digabungkan dan dirapikan.",
        tone: "success",
      });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    } finally {
      wishlistGroupSubmitLock.current = false;
      setWishlistWriteState(null);
    }
  }

  async function cleanupDemoData() {
    if (!user || !db || demoCleanupBusy) return;
    const store = db;
    const userId = user.uid;
    const demoTransactions = transactions.filter(isDemoTransaction);
    const demoBudgets = budgets.filter(isDemoBudget);
    const demoGoals = goals.filter(isDemoGoal);
    const total = demoTransactions.length + demoBudgets.length + demoGoals.length;

    if (!total) {
      setWishlistToast({ message: "Tidak ada data contoh yang tersisa.", tone: "info" });
      return;
    }

    const shouldDelete = window.confirm(
      `Hapus ${total} data contoh dari transaksi, budget, dan goals?`,
    );
    if (!shouldDelete) return;

    setDemoCleanupBusy(true);
    try {
      await Promise.all([
        ...demoTransactions.map((item) =>
          deleteDoc(doc(store, "users", userId, "transactions", item.id))),
        ...demoBudgets.map((item) =>
          deleteDoc(doc(store, "users", userId, "budgets", item.id))),
        ...demoGoals.map((item) =>
          deleteDoc(doc(store, "users", userId, "goals", item.id))),
      ]);
      setWishlistToast({
        message: `${total} data contoh berhasil dihapus.`,
        tone: "success",
      });
      void trackAnalyticsEvent("demo_data_removed", { item_count: total });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    } finally {
      setDemoCleanupBusy(false);
    }
  }

  async function editTransaction(item: Transaction) {
    if (!user || !db) return;
    const nextTitle = window.prompt("Judul transaksi", item.title)?.trim();
    if (!nextTitle) return;
    const nextAmountRaw = window.prompt("Nominal", String(item.amount));
    if (nextAmountRaw === null) return;
    const nextDate = window.prompt("Tanggal YYYY-MM-DD", item.date)?.trim();
    if (!nextDate) return;
    const nextNote = window.prompt("Catatan", item.note ?? "")?.trim() ?? "";

    try {
      await updateDoc(doc(db, "users", user.uid, "transactions", item.id), {
        title: nextTitle,
        amount: asNumber(nextAmountRaw),
        date: Timestamp.fromDate(dateInputToLocalDate(nextDate)),
        note: nextNote,
      });
      setWishlistToast({ message: `Transaksi "${nextTitle}" berhasil diperbarui.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function editBudget(item: Budget) {
    if (!user || !db) return;
    const nextLimitRaw = window.prompt(`Limit budget ${item.category}`, String(item.limit));
    if (nextLimitRaw === null) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "budgets", item.id), {
        limit: asNumber(nextLimitRaw),
      });
      setWishlistToast({ message: `Budget ${item.category} berhasil diperbarui.`, tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function removeItem(collectionName: "transactions" | "budgets" | "goals", id: string) {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, collectionName, id));
      setWishlistToast({ message: "Data berhasil dihapus.", tone: "success" });
    } catch (error) {
      setWishlistToast({ message: firestoreErrorMessage(error), tone: "error" });
    }
  }

  async function handleSignOut() {
    if (!auth) return;
    await signOut(auth);
  }

  if (authLoading) {
    return (
      <main className="shell center-screen">
        <div className="loading-dot" />
      </main>
    );
  }

  if (!firebaseReady) {
    return (
      <main className="setup-page">
        <section className="setup-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Wallet size={22} />
            </div>
            <span>MyFinance</span>
          </div>
          <div>
            <p className="eyebrow">Setup Firebase</p>
            <h1>Tambahkan konfigurasi Firebase dulu.</h1>
            <p>
              Buat file <code>.env.local</code> dari <code>.env.local.example</code>, isi nilai
              project Firebase, lalu aktifkan Authentication dan Firestore Database di Firebase Console.
            </p>
          </div>
          <pre>{`NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...`}</pre>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-visual" aria-label="Ringkasan fitur MyFinance">
          <div className="brand-row">
            <div className="brand-mark">
              <Wallet size={22} />
            </div>
            <span>MyFinance</span>
          </div>
          <div className="hero-copy">
            <p>Keuangan personal, lebih terarah</p>
            <h1>Uang yang tercatat memberi ruang untuk keputusan yang lebih baik.</h1>
            <span>Pahami arus kas, jaga budget, dan tumbuhkan aset dalam satu tempat.</span>
          </div>
          <div className="hero-stats">
            <div>
              <strong>50/30/20</strong>
              <span>Alokasi yang seimbang</span>
            </div>
            <div>
              <strong>6 bulan</strong>
              <span>Target dana darurat</span>
            </div>
            <div>
              <strong>&lt;30%</strong>
              <span>Rasio cicilan sehat</span>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            <div className="auth-mobile-brand">
              <div className="brand-mark">
                <Wallet size={20} />
              </div>
              <strong>MyFinance</strong>
            </div>
            <div className="auth-heading">
              <p className="eyebrow">{authMode === "login" ? "Selamat datang kembali" : "Mulai sekarang"}</p>
              <h2>{authMode === "login" ? "Masuk ke akun Anda" : "Buat akun MyFinance"}</h2>
              <p>
                {authMode === "login"
                  ? "Lanjutkan pencatatan dan lihat kondisi keuangan terbaru."
                  : "Gunakan email aktif agar akun keuangan Anda tetap aman."}
              </p>
            </div>
            <form onSubmit={handleEmailAuth} className="auth-form">
              <label>
                Email
                <input name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  required
                />
              </label>
              {authError ? <p className="error-text">{authError}</p> : null}
              <button className="primary-button" type="submit" disabled={busy}>
                <Mail size={18} />
                {authMode === "login" ? "Masuk" : "Buat akun"}
                <ChevronRight size={17} />
              </button>
            </form>
            <div className="auth-divider"><span>atau</span></div>
            <button className="secondary-button google-button" type="button" onClick={handleGoogleAuth} disabled={busy}>
              <Globe2 size={18} />
              Lanjut dengan Google
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            >
              {authMode === "login" ? "Belum punya akun? Daftar sekarang" : "Sudah punya akun? Masuk"}
            </button>
            <p className="auth-note"><ShieldCheck size={15} /> Data diamankan oleh Firebase Authentication.</p>
          </div>
        </section>
      </main>
    );
  }

  const firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Anda";
  const userInitial = firstName.slice(0, 1).toUpperCase();
  const monthLabel = monthInputToLocalDate(month).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const pageCopy = viewCopy[view];
  const allocationData = [
    { name: "Kebutuhan", value: stats.needs, color: "#3478bd" },
    { name: "Keinginan", value: stats.wants, color: "#d49a31" },
    { name: "Tabungan & cicilan", value: stats.future, color: "#167a55" },
  ].filter((item) => item.value > 0);
  const visibleTransactions = view === "dashboard"
    ? monthlyTransactions.slice(0, 5)
    : monthlyTransactions;
  const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const totalGoalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
  const totalGoalPercent = totalGoalTarget
    ? Math.min(100, Math.round((totalGoalCurrent / totalGoalTarget) * 100))
    : 0;
  const selectedWishlistGroup = wishlistGroups.find(
    (group) => group.id === selectedWishlistGroupId,
  );
  const completedWishlist = wishlistItems.filter((item) => item.completed).length;
  const pendingWishlistAmount = wishlistItems
    .filter((item) => !item.completed)
    .reduce((sum, item) => sum + item.targetAmount, 0);
  const uniqueWishlistGroupNames = new Set(
    wishlistGroups.map((group) => group.title.trim().toLocaleLowerCase("id-ID")),
  );
  const duplicateWishlistGroupCount = wishlistGroups.length - uniqueWishlistGroupNames.size;
  const demoDataCount =
    transactions.filter(isDemoTransaction).length +
    budgets.filter(isDemoBudget).length +
    goals.filter(isDemoGoal).length;

  return (
    <main className="app-shell">
      {wishlistToast ? (
        <div
          className={`app-toast ${wishlistToast.tone}`}
          role="status"
          aria-live={wishlistToast.tone === "error" ? "assertive" : "polite"}
        >
          <span className="toast-icon">
            {wishlistToast.tone === "success" ? (
              <CheckCircle2 size={19} />
            ) : wishlistToast.tone === "error" ? (
              <CircleAlert size={19} />
            ) : (
              <Info size={19} />
            )}
          </span>
          <p>{wishlistToast.message}</p>
          <button
            type="button"
            onClick={() => setWishlistToast(null)}
            aria-label="Tutup notifikasi"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      <aside className="sidebar">
        <div className="brand-row sidebar-brand">
          <div className="brand-mark">
            <Wallet size={22} />
          </div>
          <div>
            <span>MyFinance</span>
            <small>Personal workspace</small>
          </div>
        </div>
        <p className="nav-label">Menu utama</p>
        <nav className="nav-list" aria-label="Navigasi utama">
          <Link className={view === "dashboard" ? "active" : ""} href="/">
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link className={view === "transactions" ? "active" : ""} href="/transactions">
            <LineChart size={18} />
            Transaksi
          </Link>
          <Link className={view === "budgets" ? "active" : ""} href="/budgets">
            <PieChart size={18} />
            Budget
          </Link>
          <Link className={view === "goals" ? "active" : ""} href="/goals">
            <GoalIcon size={18} />
            Goals
          </Link>
          <Link className={view === "wishlist" ? "active" : ""} href="/wishlist">
            <Heart size={18} />
            Wishlist
          </Link>
        </nav>
        <div className="sidebar-account">
          <div className="user-avatar">{userInitial}</div>
          <div>
            <strong>{firstName}</strong>
            <span>{user.email}</span>
          </div>
          <button className="logout-button" type="button" onClick={handleSignOut} title="Keluar" aria-label="Keluar">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{pageCopy.eyebrow} · {monthLabel}</p>
            <h1>{view === "dashboard" ? `Halo, ${firstName}` : pageCopy.title}</h1>
            <span className="topbar-subtitle">{pageCopy.subtitle}</span>
          </div>
          <div className="top-actions">
            <label className="month-picker">
              <CalendarDays size={18} />
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            {view !== "transactions" ? (
              <Link className="primary-button compact" href="/transactions">
                <Plus size={18} />
                Transaksi
              </Link>
            ) : null}
            {demoDataCount > 0 ? (
              <button
                className="secondary-button compact danger-button"
                type="button"
                onClick={cleanupDemoData}
                disabled={demoCleanupBusy}
              >
                <Trash2 size={17} />
                {demoCleanupBusy ? "Menghapus..." : `Hapus ${demoDataCount} data contoh`}
              </button>
            ) : null}
          </div>
        </header>

        {view === "dashboard" ? (
          <>
          <section className="kpi-grid" aria-label="Statistik utama">
          <Metric icon={<Landmark />} label="Pemasukan" value={currency.format(stats.income)} helper="Total dana masuk" tone="green" />
          <Metric
            icon={<Flame />}
            label="Pengeluaran"
            value={currency.format(stats.spending)}
            helper={stats.income ? `${Math.round((stats.spending / stats.income) * 100)}% dari pemasukan` : "Belum ada pemasukan"}
            tone="red"
          />
          <Metric icon={<TrendingUp />} label="Saving rate" value={`${stats.savingsRate}%`} helper="Target ideal minimal 20%" tone="blue" />
          <Metric icon={<ShieldCheck />} label="Dana darurat" value={`${stats.runway.toFixed(1)} bulan`} helper="Target minimal 6 bulan" tone="gold" />
          </section>

          <section className="insight-band">
          <div className="score-panel">
            <div className="score-ring" style={{ "--score": stats.healthScore } as React.CSSProperties}>
              <span>{stats.healthScore}</span>
            </div>
            <div>
              <p className="eyebrow">Skor kesehatan finansial</p>
              <h2>{stats.healthScore >= 75 ? "Keuangan Anda sehat" : stats.healthScore >= 55 ? "Perlu dijaga" : "Butuh perhatian"}</h2>
              <p>
                Skor dihitung dari cashflow, saving rate, rasio cicilan, dan kesiapan dana darurat.
              </p>
            </div>
          </div>
          <div className="rule-panel">
            <h2>Kompas 50/30/20</h2>
            <Ratio label="Kebutuhan" value={stats.needs} total={stats.income} target="50%" />
            <Ratio label="Keinginan" value={stats.wants} total={stats.income} target="30%" />
            <Ratio label="Tabungan & cicilan" value={stats.future} total={stats.income} target="20%" />
          </div>
          <div className="cash-panel">
            <h2>Cashflow bulan ini</h2>
            <strong className={stats.net >= 0 ? "positive" : "negative"}>{currency.format(stats.net)}</strong>
            <p>
              Cicilan menyerap {stats.debtRatio}% pemasukan. Batas konservatif yang umum dipakai adalah maksimal 30%.
            </p>
          </div>
          </section>
          </>
        ) : null}

        {view === "transactions" ? (
        <section className="workspace-grid">
          <div className="tool-section" id="transaksi">
            <SectionTitle icon={<Plus />} title="Tambah Transaksi" />
            <form className="entry-form" onSubmit={addTransaction}>
              <div className="form-row">
                <label>
                  Arus transaksi
                  <select
                    name="type"
                    value={transactionFormType}
                    onChange={(event) => setTransactionFormType(event.target.value as TransactionType)}
                  >
                    {transactionTypes.map((item) => (
                      <option value={item.value} key={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tanggal
                  <input name="date" type="date" defaultValue={today} required />
                </label>
              </div>
              <label>
                Judul
                <input name="title" placeholder="Contoh: makan siang, gaji, reksa dana" required />
              </label>
              <div className={`form-row ${transactionFormType === "expense" ? "" : "single-field"}`}>
                <label>
                  Kategori
                  <select
                    key={transactionFormType}
                    name="category"
                    defaultValue={transactionCategories[transactionFormType][0]}
                  >
                    {transactionCategories[transactionFormType].map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                {transactionFormType === "expense" ? (
                  <label>
                    Alokasi pengeluaran
                    <select name="mindset" defaultValue="need">
                      {expenseAllocationOptions.map((item) => (
                        <option value={item.value} key={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <label>
                Nominal
                <input name="amount" inputMode="numeric" placeholder="250000" required />
              </label>
              <label>
                Catatan
                <input name="note" placeholder="Opsional" />
              </label>
              <button className="primary-button" type="submit">
                <Plus size={18} />
                Simpan {transactionTypes.find((item) => item.value === transactionFormType)?.label.toLowerCase()}
              </button>
            </form>
          </div>

          <div className="tool-section">
            <SectionTitle icon={<BarChart3 />} title="Pengeluaran per Kategori" />
            <div className="bar-list">
              {stats.categoryRows.length ? (
                stats.categoryRows.map((item) => (
                  <BarRow key={item.category} label={item.category} value={item.amount} max={stats.spending + stats.debt} />
                ))
              ) : (
                <EmptyState text="Belum ada pengeluaran pada periode ini." />
              )}
            </div>
          </div>
        </section>
        ) : null}

        {view === "dashboard" ? (
          <section className="dashboard-chart-grid">
          <div className="chart-card chart-card-wide">
            <div className="section-heading-row">
              <SectionTitle icon={<LineChart />} title="Tren 6 Bulan" />
              <div className="chart-legend" aria-label="Legenda grafik">
                <span><i className="legend-dot income" />Pemasukan</span>
                <span><i className="legend-dot outflow" />Pengeluaran</span>
              </div>
            </div>
            <div className="chart-shell">
              {monthlyTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#167a55" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#167a55" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="outflowFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c04c4c" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#c04c4c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf1ef" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={(value) => String(value).slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => currency.format(Number(value))} labelFormatter={(label) => `Bulan ${label}`} />
                    <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#167a55" strokeWidth={2.5} fill="url(#incomeFill)" />
                    <Area type="monotone" dataKey="outflow" name="Pengeluaran" stroke="#c04c4c" strokeWidth={2.5} fill="url(#outflowFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Tren akan muncul setelah ada transaksi." />
              )}
            </div>
          </div>

          <div className="chart-card">
            <SectionTitle icon={<PieChart />} title="Komposisi Alokasi" />
            <div className="chart-shell">
              {allocationData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                      {allocationData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => currency.format(Number(value))} />
                    <Legend iconType="circle" />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Komposisi muncul setelah transaksi dicatat." />
              )}
            </div>
          </div>
          </section>
        ) : null}

        {view === "budgets" ? (
        <section className="page-detail-grid">
          <div className="tool-section" id="budget">
            <SectionTitle icon={<PieChart />} title="Budget Bulanan" />
            <form className="inline-form" onSubmit={addBudget}>
              <select name="category" defaultValue="Makanan">
                {categories.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select name="mindset" defaultValue="need">
                {expenseAllocationOptions.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input name="limit" inputMode="numeric" placeholder="Limit" required />
              <button className="icon-button" type="submit" aria-label="Tambah budget">
                <Plus size={18} />
              </button>
            </form>
            <div className="budget-list">
              {stats.budgetRows.length ? (
                stats.budgetRows.map((item) => (
                  <div className="budget-row" key={item.id}>
                    <div>
                      <strong>{item.category}</strong>
                      <span>{currency.format(item.used)} dari {currency.format(item.limit)}</span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${item.percent}%` }} />
                    </div>
                    <div className="row-actions">
                      <button className="ghost-icon" type="button" onClick={() => editBudget(item)} aria-label={`Edit budget ${item.category}`}>
                        <Pencil size={16} />
                      </button>
                      <button className="ghost-icon" type="button" onClick={() => removeItem("budgets", item.id)} aria-label={`Hapus budget ${item.category}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="Tambahkan budget untuk memantau batas kategori." />
              )}
            </div>
          </div>

          <div className="rule-panel budget-guide">
            <h2>Kompas 50/30/20</h2>
            <Ratio label="Kebutuhan" value={stats.needs} total={stats.income} target="50%" />
            <Ratio label="Keinginan" value={stats.wants} total={stats.income} target="30%" />
            <Ratio label="Tabungan & cicilan" value={stats.future} total={stats.income} target="20%" />
            <p className="panel-note">Gunakan rasio ini sebagai panduan, lalu sesuaikan dengan kondisi rumah tangga Anda.</p>
          </div>
        </section>
        ) : null}

        {view === "goals" ? (
        <section className="page-detail-grid">
          <div className="tool-section" id="goals">
            <SectionTitle icon={<GoalIcon />} title="Financial Goals" />
            <form className="entry-form compact-form" onSubmit={addGoal}>
              <label>
                Nama goal
                <input name="title" placeholder="Dana darurat, DP rumah, pensiun" required />
              </label>
              <div className="form-row">
                <label>
                  Target
                  <input name="target" inputMode="numeric" placeholder="48000000" required />
                </label>
                <label>
                  Terkumpul
                  <input name="current" inputMode="numeric" placeholder="12500000" required />
                </label>
              </div>
              <label>
                Deadline
                <input name="deadline" type="date" required />
              </label>
              <button className="secondary-button" type="submit">
                <Check size={18} />
                Tambah goal
              </button>
            </form>
            <div className="goal-list">
              {goals.length ? (
                goals.map((goal) => {
                  const percent = goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
                  return (
                    <div className="goal-row" key={goal.id}>
                      <div>
                        <strong>{goal.title}</strong>
                        <span>
                          {currency.format(goal.current)} dari {currency.format(goal.target)}
                          {" · "}{percent}% sampai {formatDateLabel(goal.deadline)}
                        </span>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <div className="goal-actions">
                        <button
                          className="ghost-icon"
                          type="button"
                          onClick={() => editGoal(goal)}
                          aria-label={`Edit goal ${goal.title}`}
                          title="Edit goal"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="ghost-icon"
                          type="button"
                          onClick={() => setEditingGoalId((current) => current === goal.id ? null : goal.id)}
                          aria-label={`Update progres ${goal.title}`}
                          title="Update progres"
                        >
                          <TrendingUp size={16} />
                        </button>
                        <button className="ghost-icon" type="button" onClick={() => removeItem("goals", goal.id)} aria-label={`Hapus goal ${goal.title}`} title="Hapus goal">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {editingGoalId === goal.id ? (
                        <form className="goal-update-form" onSubmit={(event) => updateGoalProgress(event, goal)}>
                          <label>
                            Total dana terkumpul
                            <input
                              name="current"
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max={goal.target}
                              defaultValue={goal.current}
                              required
                            />
                          </label>
                          <button
                            className="primary-button compact"
                            type="submit"
                            disabled={goalUpdatingId === goal.id}
                          >
                            <Check size={16} />
                            {goalUpdatingId === goal.id ? "Menyimpan..." : "Simpan progres"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <EmptyState text="Buat goal agar progress tabungan terlihat jelas." />
              )}
            </div>
          </div>
          <div className="goal-summary-panel">
            <p className="eyebrow">Progress keseluruhan</p>
            <strong>{totalGoalPercent}%</strong>
            <div className="progress-track">
              <span style={{ width: `${totalGoalPercent}%` }} />
            </div>
            <div>
              <span>Terkumpul</span>
              <b>{currency.format(totalGoalCurrent)}</b>
            </div>
            <div>
              <span>Total target</span>
              <b>{currency.format(totalGoalTarget)}</b>
            </div>
          </div>
        </section>
        ) : null}

        {view === "wishlist" ? (
          <>
            <section className="wishlist-groups-section">
              <div className="section-heading-row">
                <SectionTitle icon={<Heart />} title="Grup Wishlist" />
                <div className="wishlist-group-actions">
                  <span className="section-count">{wishlistGroups.length} grup</span>
                  {duplicateWishlistGroupCount > 0 ? (
                    <button
                      className="secondary-button compact"
                      type="button"
                      disabled={wishlistWriteState === "cleanup"}
                      onClick={cleanupDuplicateWishlistGroups}
                    >
                      <Trash2 size={15} />
                      {wishlistWriteState === "cleanup"
                        ? "Merapikan..."
                        : `Rapikan ${duplicateWishlistGroupCount} duplikat`}
                    </button>
                  ) : null}
                </div>
              </div>
              <form className="group-create-form" onSubmit={addWishlistGroup}>
                <label>
                  Nama grup
                  <input name="title" placeholder="Contoh: Nikah, Rumah Tangga, Liburan" maxLength={120} required />
                </label>
                <label>
                  Deskripsi
                  <input name="description" placeholder="Tujuan utama grup ini" maxLength={500} />
                </label>
                <label>
                  Target
                  <input name="deadline" type="date" defaultValue={today} required />
                </label>
                <label className="group-color-field">
                  Warna
                  <input name="color" type="color" defaultValue="#3478bd" aria-label="Warna grup" />
                </label>
                <button className="primary-button" type="submit" disabled={wishlistWriteState === "group"}>
                  <Plus size={18} />
                  {wishlistWriteState === "group" ? "Menyimpan..." : "Buat grup"}
                </button>
              </form>
              {wishlistGroups.length ? (
                <div className="wishlist-group-grid">
                  {wishlistGroups.map((group) => (
                    <button
                      className={`wishlist-group-card ${group.id === selectedWishlistGroupId ? "active" : ""}`}
                      key={group.id}
                      onClick={() => selectWishlistGroup(group.id)}
                      style={{ borderTopColor: group.color }}
                      type="button"
                    >
                      <span className="group-card-heading">
                        <span className="group-swatch" style={{ backgroundColor: group.color }} />
                        <strong>{group.title}</strong>
                      </span>
                      <span>{group.description || "Tanpa deskripsi"}</span>
                      <small>
                        Target {formatDateLabel(group.deadline)}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState text="Buat grup pertama untuk mulai menyusun wishlist apa pun." />
              )}
            </section>

            {selectedWishlistGroup ? (
              <>
                <section className="page-detail-grid">
                  <div className="tool-section">
                    <SectionTitle icon={<Plus />} title={`Tambah item ke ${selectedWishlistGroup.title}`} />
                    <form className="entry-form" onSubmit={addWishlistItem}>
                      <label>
                        Kebutuhan atau keinginan
                        <input name="title" placeholder="Contoh: katering, sofa, tiket pesawat" maxLength={120} required />
                      </label>
                      <div className="form-row">
                        <label>
                          Kategori
                          <select name="category" defaultValue="Pembelian">
                            {wishlistCategories.map((item) => (
                              <option value={item} key={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Prioritas
                          <select name="priority" defaultValue="medium">
                            {wishlistPriorities.map((item) => (
                              <option value={item.value} key={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="form-row">
                        <label>
                          Target dana
                          <input name="targetAmount" inputMode="numeric" placeholder="5000000" required />
                        </label>
                        <label>
                          Target selesai
                          <input name="deadline" type="date" defaultValue={today} required />
                        </label>
                      </div>
                      <label>
                        Catatan
                        <input name="note" placeholder="Detail atau langkah berikutnya" maxLength={500} />
                      </label>
                      <button className="primary-button" type="submit" disabled={wishlistWriteState === "item"}>
                        <Plus size={18} />
                        {wishlistWriteState === "item" ? "Menyimpan..." : "Tambah item"}
                      </button>
                    </form>
                  </div>

                  <div
                    className="wishlist-summary-panel"
                    style={{ borderTopColor: selectedWishlistGroup.color }}
                  >
                    <div className="wishlist-summary-heading">
                      <div>
                        <p className="eyebrow">Grup aktif</p>
                        <h3>{selectedWishlistGroup.title}</h3>
                      </div>
                      <button
                        className="ghost-icon"
                        type="button"
                        onClick={() => editWishlistGroup(selectedWishlistGroup)}
                        aria-label={`Edit grup ${selectedWishlistGroup.title}`}
                        title="Edit grup"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="ghost-icon danger-icon"
                        type="button"
                        onClick={() => removeWishlistGroup(selectedWishlistGroup)}
                        aria-label={`Hapus grup ${selectedWishlistGroup.title}`}
                        title="Hapus grup"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="group-description">
                      {selectedWishlistGroup.description || "Belum ada deskripsi untuk grup ini."}
                    </p>
                    <strong>{completedWishlist}/{wishlistItems.length}</strong>
                    <span>item sudah selesai</span>
                    <div className="progress-track">
                      <span style={{
                        width: `${wishlistItems.length
                          ? Math.round((completedWishlist / wishlistItems.length) * 100)
                          : 0}%`,
                        backgroundColor: selectedWishlistGroup.color,
                      }} />
                    </div>
                    <div className="wishlist-summary-metrics">
                      <span>Target dana tersisa</span>
                      <b>{currency.format(pendingWishlistAmount)}</b>
                      <small>
                        Tenggat {formatDateLabel(selectedWishlistGroup.deadline)}
                      </small>
                    </div>
                  </div>
                </section>

                <section className="table-section">
                  <div className="section-heading-row">
                    <SectionTitle icon={<Check />} title={`Checklist ${selectedWishlistGroup.title}`} />
                    <span className="section-count">{wishlistItems.length - completedWishlist} belum selesai</span>
                  </div>
                  <div className="wishlist-list">
                    {wishlistItems.length ? (
                      wishlistItems.map((item) => (
                        <div className={`wishlist-row ${item.completed ? "completed" : ""}`} key={item.id}>
                          <button
                            className="wishlist-check"
                            type="button"
                            aria-label={item.completed ? `Batalkan ${item.title}` : `Tandai ${item.title} selesai`}
                            aria-pressed={item.completed}
                            onClick={() => toggleWishlistItem(item)}
                          >
                            {item.completed ? <Check size={18} /> : null}
                          </button>
                          <div className="wishlist-main">
                            <strong>{item.title}</strong>
                            <span>{item.category} · target {formatDateLabel(item.deadline)}</span>
                            {item.note ? <small>{item.note}</small> : null}
                          </div>
                          <span className={`priority-pill ${item.priority}`}>
                            {wishlistPriorities.find((priority) => priority.value === item.priority)?.label}
                          </span>
                          <strong className="wishlist-amount">{currency.format(item.targetAmount)}</strong>
                          <div className="row-actions">
                            <button className="ghost-icon" type="button" onClick={() => editWishlistItem(item)} aria-label={`Edit ${item.title}`}>
                              <Pencil size={16} />
                            </button>
                            <button className="ghost-icon" type="button" onClick={() => removeWishlistItem(item.id)} aria-label={`Hapus ${item.title}`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text={`Belum ada item di grup ${selectedWishlistGroup.title}.`} />
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </>
        ) : null}

        {(view === "dashboard" || view === "transactions") ? (
        <section className="table-section">
          <div className="section-heading-row">
            <SectionTitle icon={<Wallet />} title={view === "dashboard" ? "Transaksi Terbaru" : "Riwayat Transaksi"} />
            {view === "dashboard" ? (
              <Link className="section-link" href="/transactions">Lihat semua <ChevronRight size={15} /></Link>
            ) : (
              <span className="section-count">{monthlyTransactions.length} transaksi</span>
            )}
          </div>
          <div className="transaction-table">
            {visibleTransactions.length ? (
              <>
                <div className="transaction-head" aria-hidden="true">
                  <span>Transaksi</span>
                  <span>Alokasi</span>
                  <span>Nominal</span>
                  <span />
                </div>
                {visibleTransactions.map((item) => (
                  <div className="transaction-row" key={item.id}>
                    <div className={`transaction-type-icon ${item.type}`}>
                      {item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="transaction-main">
                      <strong>{item.title}</strong>
                      <span>{item.category} · {item.date}</span>
                    </div>
                    <span className={`pill ${item.mindset}`}>
                      {transactionAllocationLabel(item)}
                    </span>
                    <strong className={`transaction-amount ${item.type === "income" ? "positive" : "negative"}`}>
                      {item.type === "income" ? "+" : "-"}
                      {currency.format(item.amount)}
                    </strong>
                    <div className="row-actions">
                      <button className="ghost-icon" type="button" onClick={() => editTransaction(item)} aria-label={`Edit transaksi ${item.title}`}>
                        <Pencil size={16} />
                      </button>
                      <button className="ghost-icon" type="button" onClick={() => removeItem("transactions", item.id)} aria-label={`Hapus transaksi ${item.title}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <EmptyState text="Belum ada transaksi untuk bulan yang dipilih." />
            )}
          </div>
        </section>
        ) : null}
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "green" | "red" | "blue" | "gold";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-top">
        <div className="metric-icon">{icon}</div>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="section-title">
      <span>{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}

function Ratio({ label, value, total, target }: { label: string; value: number; total: number; target: string }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="ratio-row">
      <div>
        <span>{label}</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <small>Target {target}</small>
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="bar-row">
      <div>
        <span>{label}</span>
        <strong>{currency.format(value)}</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>;
}
