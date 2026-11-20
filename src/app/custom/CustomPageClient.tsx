"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  Clock,
  HandCoins,
  Loader2,
  MinusCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PageTransition } from "@/components/common/PageTransition";
import Sheet from "@/components/ui/Sheet";
import {
  addRemoval,
  createManualStudentFee,
  deleteRemoval,
  getCustomOperations,
  getStudents,
  type CustomOperationRemoval,
  type CustomOperationsData,
  type Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import { amountToIndianWords } from "@/lib/receipts/monthly";
import { useToast } from "@/lib/use-toast";

const BRANCHES = [
  { key: "MPSC" as const, label: "MP" },
  { key: "Herohalli" as const, label: "Herohalli" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SCOPE_OPTIONS = [
  { value: "Both", label: "Both branches" },
  { value: "MPSC", label: "MP Sports Club" },
  { value: "Herohalli", label: "Herohalli" },
  { value: "Others", label: "Others" },
];

const PENDING_STATUSES = new Set(["due", "overdue", "rejected", "pending_verification"]);

type BranchKey = (typeof BRANCHES)[number]["key"];
type SearchableStudent = Student & { branch: BranchKey; branchLabel: string };
type ActivityFilter = "all" | "out" | "dues";
type Sheet = "due" | "out" | null;

type ActivityItem = {
  key: string;
  kind: "removal" | "due";
  month: number;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  sortDate: string;
  removal?: CustomOperationRemoval;
};

type ActivityGroup = {
  month: number;
  items: ActivityItem[];
  moneyOut: number;
  pendingDues: number;
  paidDues: number;
};

function todayInputDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  const rounded = Math.round(Number(amount) || 0);
  const prefix = rounded < 0 ? "-₹" : "₹";
  return `${prefix}${Math.abs(rounded).toLocaleString("en-IN")}`;
}

function parseAmountInput(value: string) {
  const normalized = value.toLowerCase().replace(/[₹,\s]/g, "");
  if (!normalized) return Number.NaN;
  const match = normalized.match(/^(\d+(?:\.\d+)?)(k|l|lakh|lac|m)?$/);
  if (!match) return Number.NaN;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return Number.NaN;
  const unit = match[2];
  const multiplier =
    unit === "k" ? 1_000 :
    unit === "l" || unit === "lakh" || unit === "lac" ? 1_00_000 :
    unit === "m" ? 10_00_000 : 1;
  return Math.round(base * multiplier);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function displayDate(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(`${raw.slice(0, 10)}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

function statusLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "pending_verification") return "Verifying";
  if (status === "rejected") return "Rejected";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

function statusClass(status: string) {
  if (status === "paid") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "rejected") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "pending_verification") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function balanceClass(amount: number | null) {
  if (amount === null) return "text-zinc-300";
  return amount < 0 ? "text-red-400" : "text-emerald-400";
}

export default function CustomPageClient() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  const currentFeeYear = getCurrentFeeYear();
  const currentMonth = new Date().getMonth();

  const [year, setYear] = useState(currentFeeYear);
  const [data, setData] = useState<CustomOperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomOperationRemoval | null>(null);
  const [deleting, setDeleting] = useState(false);

  // === Custom due form ===
  const [students, setStudents] = useState<SearchableStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SearchableStudent | null>(null);
  const [dueTitle, setDueTitle] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [dueMonth, setDueMonth] = useState(currentMonth);
  const [dueDate, setDueDate] = useState(todayInputDate);
  const [dueNote, setDueNote] = useState("");
  const [submittingDue, setSubmittingDue] = useState(false);

  // === Money out form ===
  const [outTitle, setOutTitle] = useState("");
  const [outAmount, setOutAmount] = useState("");
  const [outScope, setOutScope] = useState("Both");
  const [outMonth, setOutMonth] = useState(currentMonth);
  const [outDescription, setOutDescription] = useState("");
  const [submittingOut, setSubmittingOut] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!user || checking) return;
    setError("");
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await getCustomOperations(forceRefresh, year);
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load custom operations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checking, user, year]);

  const loadStudents = useCallback(async () => {
    if (!user || checking || students.length > 0 || loadingStudents) return;
    setLoadingStudents(true);
    try {
      const rows = await Promise.all(
        BRANCHES.map(async (branch) => {
          const branchStudents = await getStudents(branch.key, currentMonth, false, year);
          return branchStudents.map((student) => ({
            ...student,
            branch: branch.key,
            branchLabel: branch.label,
          }));
        }),
      );
      const bySkfId = new Map<string, SearchableStudent>();
      for (const student of rows.flat()) {
        if (student.status === "Discontinued") continue;
        if (!bySkfId.has(student.id)) bySkfId.set(student.id, student);
      }
      setStudents(
        Array.from(bySkfId.values()).sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }),
        ),
      );
    } catch (studentError) {
      toast(studentError instanceof Error ? studentError.message : "Unable to load students.", "error");
    } finally {
      setLoadingStudents(false);
    }
  }, [checking, currentMonth, loadingStudents, students.length, toast, user, year]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      setData(null);
      void loadData(false);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [loadData]);

  const openDueSheet = () => {
    setSheet("due");
    if (students.length === 0 && !loadingStudents) {
      window.setTimeout(() => {
        void loadStudents();
      }, 0);
    }
  };

  const studentResults = useMemo(() => {
    const query = normalize(studentSearch);
    if (!query) return [];
    return students
      .filter((student) => {
        const id = normalize(student.id);
        const name = normalize(student.name);
        return id.includes(query) || name.includes(query);
      })
      .sort((a, b) => {
        const aExact = normalize(a.id) === query ? 0 : 1;
        const bExact = normalize(b.id) === query ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
      })
      .slice(0, 8);
  }, [studentSearch, students]);

  const activityGroups = useMemo<ActivityGroup[]>(() => {
    if (!data) return [];
    const allItems: ActivityItem[] = [];

    for (const removal of data.removals) {
      allItems.push({
        key: `removal:${removal.id}`,
        kind: "removal",
        month: removal.month,
        title: removal.title || "Custom removal",
        subtitle: [
          removal.scope && removal.scope !== "Both" ? removal.scope : "Overall",
          removal.description,
        ].filter(Boolean).join(" • "),
        amount: Math.abs(removal.amount),
        status: "recorded",
        sortDate: removal.dateAdded || "",
        removal,
      });
    }

    for (const due of data.dues) {
      allItems.push({
        key: `due:${due.id}`,
        kind: "due",
        month: due.month,
        title: due.title || "Custom due",
        subtitle: [due.studentName, due.skfId, due.description].filter(Boolean).join(" • "),
        amount: Math.abs(due.amount),
        status: due.status,
        sortDate: due.paidDate || due.dueDate || "",
      });
    }

    const query = normalize(search);
    const matching = allItems.filter((item) => {
      if (filter === "out" && item.kind !== "removal") return false;
      if (filter === "dues" && item.kind !== "due") return false;
      if (!query) return true;
      return `${item.title} ${item.subtitle} ${item.status}`.toLowerCase().includes(query);
    });

    const groups = new Map<number, ActivityGroup>();
    for (const item of allItems) {
      const group = groups.get(item.month) || {
        month: item.month,
        items: [],
        moneyOut: 0,
        pendingDues: 0,
        paidDues: 0,
      };
      if (item.kind === "removal") {
        group.moneyOut += item.amount;
      } else if (item.status === "paid") {
        group.paidDues += item.amount;
      } else if (PENDING_STATUSES.has(item.status)) {
        group.pendingDues += item.amount;
      }
      groups.set(item.month, group);
    }

    for (const item of matching) {
      const group = groups.get(item.month);
      if (group) group.items.push(item);
    }

    return Array.from(groups.values())
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === "removal" ? -1 : 1;
          return b.sortDate.localeCompare(a.sortDate);
        }),
      }))
      .sort((a, b) => b.month - a.month);
  }, [data, filter, search]);

  const parsedDueAmount = parseAmountInput(dueAmount);
  const parsedOutAmount = parseAmountInput(outAmount);
  const monthBalanceByIndex = useMemo(
    () => new Map((data?.monthly || []).map((row) => [row.month, row])),
    [data],
  );
  const projectedPendingDues =
    data && Number.isFinite(parsedDueAmount) && parsedDueAmount > 0
      ? data.totals.pendingDues + parsedDueAmount
      : null;
  const canSubmitDue =
    Boolean(selectedStudent) &&
    dueTitle.trim().length > 0 &&
    Number.isFinite(parsedDueAmount) &&
    parsedDueAmount > 0 &&
    !submittingDue;
  const canSubmitOut =
    outTitle.trim().length > 0 &&
    Number.isFinite(parsedOutAmount) &&
    parsedOutAmount > 0 &&
    !submittingOut;

  const availableBalance = data?.balance.availableBalance ?? null;
  const projectedBalance =
    availableBalance !== null && Number.isFinite(parsedOutAmount)
      ? availableBalance - parsedOutAmount
      : null;
  const balanceMath = useMemo(() => {
    if (!data || data.balance.restricted) return null;
    const income = data.monthly.reduce((sum, row) => sum + row.income, 0);
    const allExpenses = data.monthly.reduce((sum, row) => sum + row.expenses, 0);
    const otherExpenses = Math.max(0, allExpenses - data.totals.moneyOut);
    return {
      income,
      otherExpenses,
      computed: data.balance.reserveAmount + income - otherExpenses - data.totals.moneyOut,
    };
  }, [data]);

  const resetDueForm = () => {
    setStudentSearch("");
    setSelectedStudent(null);
    setDueTitle("");
    setDueAmount("");
    setDueMonth(currentMonth);
    setDueDate(todayInputDate());
    setDueNote("");
  };

  const resetOutForm = () => {
    setOutTitle("");
    setOutAmount("");
    setOutScope("Both");
    setOutMonth(currentMonth);
    setOutDescription("");
  };

  const handleSubmitDue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudent || submittingDue) return;
    const trimmedTitle = dueTitle.trim();
    if (!trimmedTitle) {
      toast("Enter the due title", "error");
      return;
    }
    if (!Number.isFinite(parsedDueAmount) || parsedDueAmount <= 0) {
      toast("Enter a valid amount like 1500 or 1.5k", "error");
      return;
    }

    setSubmittingDue(true);
    try {
      await createManualStudentFee({
        studentId: selectedStudent.id,
        branch: selectedStudent.branch,
        month: dueMonth,
        year,
        title: trimmedTitle,
        amount: parsedDueAmount,
        dueDate: dueDate || undefined,
        description: dueNote.trim() || undefined,
      });
      toast(
        `${trimmedTitle} for ${selectedStudent.name} is pending for ${formatCurrency(parsedDueAmount)}.`,
        "success",
      );
      setSheet(null);
      resetDueForm();
      await loadData(true);
    } catch (submitError) {
      toast(submitError instanceof Error ? submitError.message : "Failed to create custom due", "error");
    } finally {
      setSubmittingDue(false);
    }
  };

  const handleSubmitOut = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingOut) return;
    const trimmedTitle = outTitle.trim();
    if (!trimmedTitle) {
      toast("Enter a title", "error");
      return;
    }
    if (!Number.isFinite(parsedOutAmount) || parsedOutAmount <= 0) {
      toast("Enter a valid amount like 1500 or 1.5k", "error");
      return;
    }

    setSubmittingOut(true);
    try {
      await addRemoval(
        outScope,
        outMonth,
        trimmedTitle,
        parsedOutAmount,
        outDescription.trim() || undefined,
        year,
      );
      toast(`Recorded ${formatCurrency(parsedOutAmount)} out for "${trimmedTitle}".`, "success");
      setSheet(null);
      resetOutForm();
      await loadData(true);
    } catch (submitError) {
      toast(submitError instanceof Error ? submitError.message : "Failed to record money out", "error");
    } finally {
      setSubmittingOut(false);
    }
  };

  const handleDeleteRemoval = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteRemoval(deleteTarget.scope, deleteTarget.month, deleteTarget.id, year);
      toast("Custom removal deleted and audited.", "success");
      setDeleteTarget(null);
      await loadData(true);
    } catch (deleteError) {
      toast(deleteError instanceof Error ? deleteError.message : "Failed to delete removal", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (checking || !user) return null;

  const yearOptions = [currentFeeYear + 1, currentFeeYear, currentFeeYear - 1, currentFeeYear - 2];

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-zinc-300">
        <Navbar title="Custom Operations" showBack rightContent={<NavMenu />} />

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 sm:px-6 sm:pt-32">
          <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">FeeTrack Office</p>
              <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Custom Operations
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-500">
                Every custom due and money-out entry for the year on one screen. No month switching.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={year}
                  onChange={(event) => {
                    setYear(Number(event.target.value));
                    setStudents([]);
                    setSelectedStudent(null);
                  }}
                  className="min-h-11 appearance-none rounded-lg border border-zinc-800 bg-zinc-950 pl-4 pr-9 text-sm font-semibold text-white outline-none transition-colors focus:border-zinc-600"
                  aria-label="Fee year"
                >
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
              <button
                type="button"
                onClick={() => void loadData(true)}
                disabled={refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </header>

          {error ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load custom operations.</p>
                <p className="mt-1 text-red-100/75">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadData(false)}
                className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20"
              >
                Retry
              </button>
            </div>
          ) : null}

          {loading && !data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="card-panel h-28 animate-pulse bg-zinc-900/80" />
                ))}
              </div>
              <div className="card-panel h-72 animate-pulse bg-zinc-900/80" />
            </div>
          ) : data ? (
            <>
              <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="card-panel col-span-2 overflow-hidden p-5 lg:col-span-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    <Wallet className="h-4 w-4 text-zinc-400" />
                    Available balance
                  </div>
                  <p className={`mt-3 font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight ${balanceClass(availableBalance)}`}>
                    {availableBalance === null ? "—" : formatCurrency(availableBalance)}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {data.balance.restricted
                      ? data.balance.restrictedReason || "Balance is restricted for this account."
                      : `Opening reserve ${formatCurrency(data.balance.reserveAmount)} included. Custom removals are cash-basis.`}
                  </p>
                </div>

                <div className="card-panel p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                    Money out
                  </div>
                  <p className="mt-3 font-[family-name:var(--font-space)] text-2xl font-semibold tracking-tight text-red-300">
                    {formatCurrency(data.totals.moneyOut)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">{data.totals.removalCount} removal{data.totals.removalCount === 1 ? "" : "s"} in {year}</p>
                </div>

                <div className="card-panel p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    <Clock className="h-4 w-4 text-amber-300" />
                    Pending dues
                  </div>
                  <p className="mt-3 font-[family-name:var(--font-space)] text-2xl font-semibold tracking-tight text-amber-200">
                    {formatCurrency(data.totals.pendingDues)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">{data.totals.pendingDueCount} awaiting payment</p>
                </div>

                <div className="card-panel col-span-2 p-5 lg:col-span-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    <BadgeCheck className="h-4 w-4 text-emerald-300" />
                    Paid dues
                  </div>
                  <p className="mt-3 font-[family-name:var(--font-space)] text-2xl font-semibold tracking-tight text-emerald-300">
                    {formatCurrency(data.totals.paidDues)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">{data.totals.paidDueCount} collected</p>
                </div>
              </section>

              {data.permissions.canWrite ? (
              <section className="mb-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openDueSheet}
                  className="group flex min-h-16 items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-5 text-left transition-colors hover:border-amber-400/50 hover:bg-amber-500/10"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                      <HandCoins className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">Add student due</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">One-off fee for a student</span>
                    </span>
                  </span>
                  <Plus className="h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
                </button>

                <button
                  type="button"
                  onClick={() => setSheet("out")}
                  className="group flex min-h-16 items-center justify-between rounded-xl border border-red-500/25 bg-red-500/[0.07] px-5 text-left transition-colors hover:border-red-400/50 hover:bg-red-500/10"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                      <MinusCircle className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">Record money out</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">Withdrawal from master ledger</span>
                    </span>
                  </span>
                  <Plus className="h-5 w-5 text-red-300 transition-transform group-hover:scale-110" />
                </button>
              </section>
              ) : (
                <div className="mb-7 flex items-center gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Read-only access. Ask an admin to add dues or record money out.
                </div>
              )}

              {balanceMath ? (
                <section className="card-panel mb-7 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Balance math</p>
                      <h2 className="mt-1 text-sm font-semibold text-white">January–December {year}</h2>
                    </div>
                    <span className="font-mono text-xs text-zinc-500">
                      {formatCurrency(balanceMath.computed)} = ledger balance
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Opening reserve</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-zinc-200">{formatCurrency(data.balance.reserveAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/70">+ Income</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-emerald-300">{formatCurrency(balanceMath.income)}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">− Other expenses</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-zinc-200">{formatCurrency(balanceMath.otherExpenses)}</p>
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300/70">− Money out</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-red-300">{formatCurrency(data.totals.moneyOut)}</p>
                    </div>
                    <div className="col-span-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2.5 sm:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">= Available</p>
                      <p className={`mt-1 font-mono text-sm font-semibold ${balanceClass(availableBalance)}`}>{formatCurrency(balanceMath.computed)}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                    Money out includes transfers to savings, FDs, and investments. It is still cash leaving the master ledger, so it reduces the available balance.
                  </p>
                </section>
              ) : null}

              <section className="card-panel overflow-hidden">
                <div className="border-b border-zinc-800 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Year activity</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">{year} at a glance</h2>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
                        {([
                          ["all", "All"],
                          ["out", "Money out"],
                          ["dues", "Dues"],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
                              filter === value
                                ? "bg-white text-black"
                                : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="relative min-w-0 sm:w-56">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search activity"
                          className="input-minimal min-h-11 pl-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {activityGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-black text-zinc-500">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Nothing recorded yet</h3>
                    <p className="mt-2 max-w-xs text-sm text-zinc-500">
                      Add a student due or record money out to start the year ledger.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/80">
                    {activityGroups.map((group) => (
                      <div key={group.month}>
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-950/60 px-4 py-3 sm:px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{MONTHS_FULL[group.month]}</span>
                            <span className="rounded-md border border-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              {group.items.length} entr{group.items.length === 1 ? "y" : "ies"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {monthBalanceByIndex.get(group.month) ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/70 bg-zinc-900/60 px-2 py-1 font-mono text-[11px] font-semibold text-zinc-300">
                                <Wallet className="h-3 w-3 text-zinc-500" />
                                Close {formatCurrency(monthBalanceByIndex.get(group.month)?.balance ?? 0)}
                              </span>
                            ) : null}
                            {group.moneyOut > 0 ? (
                              <span className="text-red-300">Out {formatCurrency(group.moneyOut)}</span>
                            ) : null}
                            {group.pendingDues > 0 ? (
                              <span className="text-amber-300">Pending {formatCurrency(group.pendingDues)}</span>
                            ) : null}
                            {group.paidDues > 0 ? (
                              <span className="text-emerald-300">Paid {formatCurrency(group.paidDues)}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="divide-y divide-zinc-800/60">
                          {group.items.map((item) => {
                            const canDelete = item.removal && data.permissions.canWrite && (
                              data.permissions.canDeleteAnyRemoval ||
                              item.removal.dateAdded === todayInputDate()
                            );
                            return (
                              <div key={item.key} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${
                                  item.kind === "removal"
                                    ? "border-red-900/40 bg-red-950/30 text-red-400"
                                    : "border-amber-900/40 bg-amber-950/20 text-amber-300"
                                }`}>
                                  {item.kind === "removal" ? <MinusCircle className="h-5 w-5" /> : <HandCoins className="h-5 w-5" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                                    {item.kind === "due" ? (
                                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(item.status)}`}>
                                        {statusLabel(item.status)}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-0.5 truncate text-xs text-zinc-500">{item.subtitle || "—"}</p>
                                  {item.sortDate ? (
                                    <p className="mt-1 font-mono text-[11px] text-zinc-600">{displayDate(item.sortDate)}</p>
                                  ) : null}
                                </div>

                                <span className={`whitespace-nowrap font-mono text-sm font-semibold ${
                                  item.kind === "removal"
                                    ? "text-red-400"
                                    : item.status === "paid"
                                      ? "text-emerald-400"
                                      : "text-amber-300"
                                }`}>
                                  {item.kind === "removal" ? "-" : item.status === "paid" ? "+" : ""}
                                  {formatCurrency(item.amount)}
                                </span>

                                {item.removal ? (
                                  canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget(item.removal || null)}
                                      className="ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-600 transition-colors hover:border-red-500/30 hover:text-red-400"
                                      title="Delete removal"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <span className="ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center text-zinc-700" title="Removals older than 24 hours need an admin">
                                      <Clock className="h-4 w-4" />
                                    </span>
                                  )
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <p className="mt-4 text-xs leading-relaxed text-zinc-600">
                Balance rule: opening reserve + fee cash + other income − development expenses − event expenses − custom removals.
                Moving money to savings or investments is still recorded as money out, so it reduces available cash.
              </p>
            </>
          ) : null}
        </main>

        <Sheet
          open={Boolean(sheet)}
          title={sheet === "due" ? "Custom due" : "Money out"}
          onClose={() => setSheet(null)}
        >
              {sheet === "out" ? (
                <form onSubmit={handleSubmitOut} className="space-y-4">
                  <div className={`rounded-xl border p-4 ${projectedBalance !== null && projectedBalance < 0 ? "border-red-500/30 bg-red-500/10" : "border-zinc-800 bg-zinc-950"}`}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-zinc-400">Available now</span>
                      <span className="font-mono font-semibold text-white">
                        {availableBalance === null ? "—" : formatCurrency(availableBalance)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-zinc-400">After this entry</span>
                      <span className={`font-mono font-semibold ${balanceClass(projectedBalance)}`}>
                        {projectedBalance === null ? "—" : formatCurrency(projectedBalance)}
                      </span>
                    </div>
                    {projectedBalance !== null && projectedBalance < 0 ? (
                      <p className="mt-2 text-xs text-red-200">This entry pushes the ledger below zero.</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="out-title" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Title
                    </label>
                    <input
                      id="out-title"
                      value={outTitle}
                      onChange={(event) => setOutTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Sent to akka"
                      className="input-minimal min-h-12"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="out-amount" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Amount
                      </label>
                      <input
                        id="out-amount"
                        value={outAmount}
                        onChange={(event) => setOutAmount(event.target.value)}
                        inputMode="text"
                        placeholder="1.5k or 1,50,000"
                        className="input-minimal min-h-12 font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="out-month" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Month
                      </label>
                      <select
                        id="out-month"
                        value={outMonth}
                        onChange={(event) => setOutMonth(Number(event.target.value))}
                        className="input-minimal min-h-12"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index}>{month} {year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {Number.isFinite(parsedOutAmount) && parsedOutAmount > 0 ? (
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(parsedOutAmount)} — {amountToIndianWords(parsedOutAmount)}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600">Smart amounts: 1.5k, 15k, 1.5l, 1,50,000.</p>
                  )}

                  <div>
                    <label htmlFor="out-scope" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Scope
                    </label>
                    <select
                      id="out-scope"
                      value={outScope}
                      onChange={(event) => setOutScope(event.target.value)}
                      className="input-minimal min-h-12"
                    >
                      {SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="out-description" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Note
                    </label>
                    <textarea
                      id="out-description"
                      value={outDescription}
                      onChange={(event) => setOutDescription(event.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Optional details"
                      className="input-minimal resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmitOut}
                    className="btn-primary min-h-12 w-full"
                  >
                    {submittingOut ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Recording</>
                    ) : (
                      <><MinusCircle className="h-4 w-4" /> Record money out</>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmitDue} className="space-y-4">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-amber-100/70">Pending dues now</span>
                      <span className="font-mono font-semibold text-amber-100">
                        {formatCurrency(data?.totals.pendingDues ?? 0)}
                      </span>
                    </div>
                    {projectedPendingDues !== null ? (
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="text-amber-100/70">After this due</span>
                        <span className="font-mono font-semibold text-amber-200">
                          {formatCurrency(projectedPendingDues)}
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs leading-relaxed text-amber-100/60">
                      A custom due changes the available balance only after it is marked paid.
                    </p>
                  </div>

                  {selectedStudent ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{selectedStudent.name}</p>
                          <p className="mt-1 font-mono text-xs text-zinc-500">
                            {selectedStudent.id} • {selectedStudent.branchLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(null);
                            setStudentSearch("");
                          }}
                          className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="due-student" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Student
                      </label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                        <input
                          id="due-student"
                          value={studentSearch}
                          onChange={(event) => setStudentSearch(event.target.value)}
                          placeholder="Search SKF ID or name"
                          className="input-minimal min-h-12 pl-9"
                          autoCapitalize="characters"
                        />
                      </div>

                      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                        {loadingStudents ? (
                          <div className="flex h-20 items-center justify-center text-sm text-zinc-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading students
                          </div>
                        ) : studentSearch.trim() && studentResults.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                            No student found.
                          </div>
                        ) : !studentSearch.trim() ? (
                          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                            Type an SKF ID or student name.
                          </div>
                        ) : (
                          studentResults.map((student) => (
                            <button
                              key={`${student.branch}:${student.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedStudent(student);
                                setStudentSearch(student.id);
                              }}
                              className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900"
                            >
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-zinc-800 text-zinc-500">
                                <UserRound className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-white">{student.name}</span>
                                <span className="mt-0.5 block font-mono text-xs text-zinc-500">{student.id} • {student.branchLabel}</span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="due-title" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Title shown to student
                    </label>
                    <input
                      id="due-title"
                      value={dueTitle}
                      onChange={(event) => setDueTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Nunchaku"
                      className="input-minimal min-h-12"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="due-amount" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Amount
                      </label>
                      <input
                        id="due-amount"
                        value={dueAmount}
                        onChange={(event) => setDueAmount(event.target.value)}
                        inputMode="text"
                        placeholder="1.5k"
                        className="input-minimal min-h-12 font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="due-month" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Month
                      </label>
                      <select
                        id="due-month"
                        value={dueMonth}
                        onChange={(event) => setDueMonth(Number(event.target.value))}
                        className="input-minimal min-h-12"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index}>{month} {year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {Number.isFinite(parsedDueAmount) && parsedDueAmount > 0 ? (
                    <p className="text-xs text-zinc-500">{formatCurrency(parsedDueAmount)} — {amountToIndianWords(parsedDueAmount)}</p>
                  ) : null}

                  <div>
                    <label htmlFor="due-date" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Due date
                    </label>
                    <input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="input-minimal min-h-12"
                    />
                  </div>

                  <div>
                    <label htmlFor="due-note" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Internal note
                    </label>
                    <textarea
                      id="due-note"
                      value={dueNote}
                      onChange={(event) => setDueNote(event.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Optional"
                      className="input-minimal resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmitDue}
                    className="btn-primary min-h-12 w-full"
                  >
                    {submittingDue ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creating</>
                    ) : (
                      <><HandCoins className="h-4 w-4" /> Create pending due</>
                    )}
                  </button>
                </form>
              )}
        </Sheet>

        <ConfirmModal
          open={Boolean(deleteTarget)}
          title="Delete custom removal?"
          message={
            deleteTarget
              ? `${deleteTarget.title} for ${formatCurrency(deleteTarget.amount)} will be removed from the ledger. The record and audit trail are kept.`
              : ""
          }
          confirmLabel="Delete removal"
          variant="danger"
          loading={deleting}
          onConfirm={() => void handleDeleteRemoval()}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      </div>
    </PageTransition>
  );
}
