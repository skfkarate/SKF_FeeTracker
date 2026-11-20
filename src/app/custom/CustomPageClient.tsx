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

import GlobalSearch from "@/components/common/GlobalSearch";
import AccountMenu from "@/components/common/AccountMenu";
import NotificationBell from "@/components/common/NotificationBell";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PageTransition } from "@/components/common/PageTransition";
import PageShell from "@/components/ui/PageShell";
import Sheet from "@/components/ui/Sheet";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import StatTile from "@/components/ui/StatTile";
import LedgerRow from "@/components/ui/LedgerRow";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
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
type CustomSheet = "due" | "out" | null;

const ACTIVITY_FILTERS: SegmentOption<ActivityFilter>[] = [
  { value: "all", label: "All" },
  { value: "out", label: "Money out" },
  { value: "dues", label: "Dues" },
];

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

function balanceClass(amount: number | null) {
  if (amount === null) return "text-[color:var(--color-text)]";
  return amount < 0 ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text-dim)]";
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
  const [sheet, setSheet] = useState<CustomSheet>(null);
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
      <PageShell
        hud={{
          title: "Custom Operations",
          monthLabel: `FY ${year}`,
          backHref: "/dashboard",
          actions: <GlobalSearch />,
          bell: <NotificationBell />,
          account: <AccountMenu />,
        }}
      >
        <div className="mb-[24px] flex flex-wrap items-center justify-between gap-[12px]">
          <div className="relative">
            <select
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setStudents([]);
                setSelectedStudent(null);
              }}
              className="tap-target appearance-none rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] pl-[12px] pr-[32px] font-mono text-[11px] text-[color:var(--color-text)] outline-none transition-colors focus:border-[color:var(--color-hairline)]"
              aria-label="Fee year"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-[8px] top-[50%] h-[12px] w-[12px] -translate-y-1/2 text-[color:var(--color-text-dim)]" />
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            aria-label="Refresh custom operations"
            className="tap-target inline-flex min-w-[44px] items-center justify-center gap-[8px] rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-xs font-semibold text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-text)] disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <RefreshCw className="h-[16px] w-[16px]" />}
            Refresh
          </button>
        </div>
        <p className="mb-[24px] max-w-xl text-[13px] leading-relaxed text-[color:var(--color-text-dim)]">
          Every custom due and money-out entry for the year on one screen. No month switching.
        </p>

          {error ? (
            <div className="mb-[24px] flex items-start gap-[12px] rounded-xl border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
              <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load custom operations.</p>
                <p className="mt-[4px] text-[color:var(--color-text)]">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadData(false)}
                className="rounded-lg border border-[color:var(--color-hairline-strong)] px-[12px] py-[8px] text-xs font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-glass-hover)]"
              >
                Retry
              </button>
            </div>
          ) : null}

          {loading && !data ? (
            <div className="space-y-[16px]">
              <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="card-panel h-[112px] animate-pulse bg-[color:var(--color-well)]" />
                ))}
              </div>
              <div className="card-panel h-[288px] animate-pulse bg-[color:var(--color-well)]" />
            </div>
          ) : data ? (
            <>
              <section className="mb-[24px] grid grid-cols-2 gap-[12px] lg:grid-cols-4">
                <StatTile
                  className="col-span-2 lg:col-span-1"
                  size="lg"
                  label="Available balance"
                  tone="neutral"
                  icon={<Wallet className="h-[16px] w-[16px]" />}
                  value={availableBalance === null ? "—" : formatCurrency(availableBalance)}
                  hint={
                    data.balance.restricted
                      ? data.balance.restrictedReason || "Balance is restricted for this account."
                      : `Opening reserve ${formatCurrency(data.balance.reserveAmount)} included.`
                  }
                />

                <StatTile
                  label="Money out"
                  tone="neutral"
                  icon={<ArrowDownRight className="h-[16px] w-[16px]" />}
                  value={formatCurrency(data.totals.moneyOut)}
                  hint={`${data.totals.removalCount} removal${data.totals.removalCount === 1 ? "" : "s"} in ${year}`}
                />

                <StatTile
                  label="Pending dues"
                  tone="action"
                  icon={<Clock className="h-[16px] w-[16px]" />}
                  value={formatCurrency(data.totals.pendingDues)}
                  hint={`${data.totals.pendingDueCount} awaiting payment`}
                />

                <StatTile
                  className="col-span-2 lg:col-span-1"
                  label="Paid dues"
                  tone="settled"
                  icon={<BadgeCheck className="h-[16px] w-[16px]" />}
                  value={formatCurrency(data.totals.paidDues)}
                  hint={`${data.totals.paidDueCount} collected`}
                />
              </section>

              {data.permissions.canWrite ? (
              <section className="mb-[28px] grid gap-[12px] sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openDueSheet}
                  className="group flex min-h-[64px] items-center justify-between rounded-xl border border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] px-[20px] text-left transition-colors hover:border-[color:var(--color-accent-border)] hover:bg-[color:var(--color-well)]"
                >
                  <span className="flex items-center gap-[12px]">
                    <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[color:var(--color-well)] text-[color:var(--color-text)]">
                      <HandCoins className="h-[20px] w-[20px]" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[color:var(--color-text)]">Add student due</span>
                      <span className="mt-[2px] block text-xs text-[color:var(--color-text-dim)]">One-off fee for a student</span>
                    </span>
                  </span>
                  <Plus className="h-[20px] w-[20px] text-[color:var(--color-text)] transition-transform group-hover:scale-110" />
                </button>

                <button
                  type="button"
                  onClick={() => setSheet("out")}
                  className="group flex min-h-[64px] items-center justify-between rounded-xl border border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] px-[20px] text-left transition-colors hover:border-[color:var(--color-accent-border)] hover:bg-[color:var(--color-well)]"
                >
                  <span className="flex items-center gap-[12px]">
                    <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[color:var(--color-well)] text-[color:var(--color-text)]">
                      <MinusCircle className="h-[20px] w-[20px]" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[color:var(--color-text)]">Record money out</span>
                      <span className="mt-[2px] block text-xs text-[color:var(--color-text-dim)]">Withdrawal from master ledger</span>
                    </span>
                  </span>
                  <Plus className="h-[20px] w-[20px] text-[color:var(--color-text)] transition-transform group-hover:scale-110" />
                </button>
              </section>
              ) : (
                <div className="mb-[28px] flex items-center gap-[12px] rounded-xl border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text-dim)]">
                  <AlertCircle className="h-[16px] w-[16px] flex-shrink-0" />
                  Read-only access. Ask an admin to add dues or record money out.
                </div>
              )}

              {balanceMath ? (
                <section className="card-panel mb-[28px] p-[16px] sm:p-[20px]">
                  <div className="flex flex-wrap items-center justify-between gap-[8px]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">Balance math</p>
                      <h2 className="mt-[4px] text-sm font-semibold text-[color:var(--color-text)]">January–December {year}</h2>
                    </div>
                    <span className="font-mono text-xs text-[color:var(--color-text-dim)]">
                      {formatCurrency(balanceMath.computed)} = ledger balance
                    </span>
                  </div>

                  <div className="mt-[16px] grid grid-cols-2 gap-[10px] sm:grid-cols-5">
                    <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[10px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-dim)]">Opening reserve</p>
                      <p className="mt-[4px] font-mono text-sm font-semibold text-[color:var(--color-text)]">{formatCurrency(data.balance.reserveAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-glass-hover)] px-[12px] py-[10px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text)]">+ Income</p>
                      <p className="mt-[4px] font-mono text-sm font-semibold text-[color:var(--color-text)]">{formatCurrency(balanceMath.income)}</p>
                    </div>
                    <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[10px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-dim)]">− Other expenses</p>
                      <p className="mt-[4px] font-mono text-sm font-semibold text-[color:var(--color-text)]">{formatCurrency(balanceMath.otherExpenses)}</p>
                    </div>
                    <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-glass-hover)] px-[12px] py-[10px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text)]">− Money out</p>
                      <p className="mt-[4px] font-mono text-sm font-semibold text-[color:var(--color-text)]">{formatCurrency(data.totals.moneyOut)}</p>
                    </div>
                    <div className="col-span-2 rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-accent-dim)] px-[12px] py-[10px] sm:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-dim)]">= Available</p>
                      <p className={`mt-[4px] font-mono text-sm font-semibold ${balanceClass(availableBalance)}`}>{formatCurrency(balanceMath.computed)}</p>
                    </div>
                  </div>

                  <p className="mt-[12px] text-xs leading-relaxed text-[color:var(--color-text-faint)]">
                    Money out includes transfers to savings, FDs, and investments. It is still cash leaving the master ledger, so it reduces the available balance.
                  </p>
                </section>
              ) : null}

              <section className="card-panel overflow-hidden">
                <div className="border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
                  <div className="flex flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">Year activity</p>
                      <h2 className="mt-[4px] text-lg font-semibold text-[color:var(--color-text)]">{year} at a glance</h2>
                    </div>

                    <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center">
                      <SegmentedTabs
                        options={ACTIVITY_FILTERS}
                        value={filter}
                        onChange={setFilter}
                        ariaLabel="Activity filter"
                        className="w-full sm:w-[288px]"
                      />

                      <div className="relative min-w-[0px] sm:w-[224px]">
                        <Search className="pointer-events-none absolute left-[12px] top-[50%] h-[16px] w-[16px] -translate-y-1/2 text-[color:var(--color-text-faint)]" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search activity"
                          className="input-minimal min-h-[44px] pl-[36px] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {activityGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-[24px] py-[80px] text-center">
                    <div className="mb-[16px] flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
                      <CalendarDays className="h-[20px] w-[20px]" />
                    </div>
                    <h3 className="text-base font-semibold text-[color:var(--color-text)]">Nothing recorded yet</h3>
                    <p className="mt-[8px] max-w-xs text-sm text-[color:var(--color-text-dim)]">
                      Add a student due or record money out to start the year ledger.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[color:var(--color-hairline)]">
                    {activityGroups.map((group) => (
                      <div key={group.month}>
                        <div className="flex flex-wrap items-center justify-between gap-[8px] bg-[color:var(--color-well)] px-[16px] py-[12px] sm:px-[20px]">
                          <div className="flex items-center gap-[8px]">
                            <span className="text-sm font-semibold text-[color:var(--color-text)]">{MONTHS_FULL[group.month]}</span>
                            <span className="rounded-md border border-[color:var(--color-hairline)] px-[6px] py-[2px] text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-text-dim)]">
                              {group.items.length} entr{group.items.length === 1 ? "y" : "ies"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px] text-xs">
                            {monthBalanceByIndex.get(group.month) ? (
                              <span className="inline-flex items-center gap-[4px] rounded-md border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[8px] py-[4px] font-mono text-[11px] font-semibold text-[color:var(--color-text)]">
                                <Wallet className="h-[12px] w-[12px] text-[color:var(--color-text-dim)]" />
                                Close {formatCurrency(monthBalanceByIndex.get(group.month)?.balance ?? 0)}
                              </span>
                            ) : null}
                            {group.moneyOut > 0 ? (
                              <span className="text-[color:var(--color-text)]">Out {formatCurrency(group.moneyOut)}</span>
                            ) : null}
                            {group.pendingDues > 0 ? (
                              <span className="text-[color:var(--color-text)]">Pending {formatCurrency(group.pendingDues)}</span>
                            ) : null}
                            {group.paidDues > 0 ? (
                              <span className="text-[color:var(--color-text)]">Paid {formatCurrency(group.paidDues)}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-[8px] px-[16px] py-[12px] sm:px-[20px]">
                          {group.items.map((item, itemIndex) => {
                            const canDelete = item.removal && data.permissions.canWrite && (
                              data.permissions.canDeleteAnyRemoval ||
                              item.removal.dateAdded === todayInputDate()
                            );
                            const rowStatus: LedgerStatus =
                              item.kind === "removal"
                                ? "neutral"
                                : item.status === "paid"
                                  ? "paid"
                                  : item.status === "overdue"
                                    ? "overdue"
                                    : item.status === "rejected"
                                      ? "rejected"
                                      : item.status === "pending_verification"
                                        ? "verifying"
                                        : "due";
                            const amountColor =
                              item.kind === "removal"
                                ? "text-[color:var(--color-text-dim)]"
                                : item.status === "paid"
                                  ? "text-[color:var(--color-text-dim)]"
                                  : "text-[color:var(--color-text)]";
                            const amountPrefix = item.kind === "removal" ? "-" : item.status === "paid" ? "+" : "";

                            return (
                              <LedgerRow
                                key={item.key}
                                index={itemIndex}
                                status={rowStatus}
                                title={item.title}
                                subtitle={item.subtitle || "—"}
                                idLabel={item.sortDate ? displayDate(item.sortDate) : undefined}
                                amount={
                                  <span className={amountColor}>
                                    {amountPrefix}
                                    {formatCurrency(item.amount)}
                                  </span>
                                }
                                trailing={
                                  <div className="flex items-center gap-[8px]">
                                    {item.kind === "due" ? (
                                      <StatusPill status={rowStatus} label={statusLabel(item.status)} />
                                    ) : null}
                                    {item.removal ? (
                                      canDelete ? (
                                        <button
                                          type="button"
                                          onClick={() => setDeleteTarget(item.removal || null)}
                                          aria-label="Delete removal"
                                          className="tap-target grid place-items-center rounded-lg border border-[color:var(--color-hairline)] text-[color:var(--color-text-faint)] transition-colors hover:border-[color:var(--color-hairline-strong)] hover:text-[color:var(--color-text-dim)]"
                                        >
                                          <Trash2 className="h-[16px] w-[16px]" />
                                        </button>
                                      ) : (
                                        <span
                                          className="tap-target grid place-items-center text-[color:var(--color-text-faint)]"
                                          title="Removals older than 24 hours need an admin"
                                        >
                                          <Clock className="h-[16px] w-[16px]" />
                                        </span>
                                      )
                                    ) : null}
                                  </div>
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <p className="mt-[16px] text-xs leading-relaxed text-[color:var(--color-text-faint)]">
                Balance rule: opening reserve + fee cash + other income − development expenses − event expenses − custom removals.
                Moving money to savings or investments is still recorded as money out, so it reduces available cash.
              </p>
            </>
          ) : null}
      </PageShell>

        <Sheet
          open={Boolean(sheet)}
          title={sheet === "due" ? "Custom due" : "Money out"}
          onClose={() => setSheet(null)}
        >
              {sheet === "out" ? (
                <form onSubmit={handleSubmitOut} className="space-y-[16px]">
                  <div className={`rounded-xl border p-[16px] ${projectedBalance !== null && projectedBalance < 0 ? "border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)]" : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)]"}`}>
                    <div className="flex items-center justify-between gap-[12px] text-sm">
                      <span className="text-[color:var(--color-text-dim)]">Available now</span>
                      <span className="font-mono font-semibold text-[color:var(--color-text)]">
                        {availableBalance === null ? "—" : formatCurrency(availableBalance)}
                      </span>
                    </div>
                    <div className="mt-[8px] flex items-center justify-between gap-[12px] text-sm">
                      <span className="text-[color:var(--color-text-dim)]">After this entry</span>
                      <span className={`font-mono font-semibold ${balanceClass(projectedBalance)}`}>
                        {projectedBalance === null ? "—" : formatCurrency(projectedBalance)}
                      </span>
                    </div>
                    {projectedBalance !== null && projectedBalance < 0 ? (
                      <p className="mt-[8px] text-xs text-[color:var(--color-text)]">This entry pushes the ledger below zero.</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="out-title" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                      Title
                    </label>
                    <input
                      id="out-title"
                      value={outTitle}
                      onChange={(event) => setOutTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Sent to akka"
                      className="input-minimal min-h-[48px]"
                    />
                  </div>

                  <div className="grid gap-[16px] sm:grid-cols-2">
                    <div>
                      <label htmlFor="out-amount" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                        Amount
                      </label>
                      <input
                        id="out-amount"
                        value={outAmount}
                        onChange={(event) => setOutAmount(event.target.value)}
                        inputMode="text"
                        placeholder="1.5k or 1,50,000"
                        className="input-minimal min-h-[48px] font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="out-month" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                        Month
                      </label>
                      <select
                        id="out-month"
                        value={outMonth}
                        onChange={(event) => setOutMonth(Number(event.target.value))}
                        className="input-minimal min-h-[48px]"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index}>{month} {year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {Number.isFinite(parsedOutAmount) && parsedOutAmount > 0 ? (
                    <p className="text-xs text-[color:var(--color-text-dim)]">
                      {formatCurrency(parsedOutAmount)} — {amountToIndianWords(parsedOutAmount)}
                    </p>
                  ) : (
                    <p className="text-xs text-[color:var(--color-text-faint)]">Smart amounts: 1.5k, 15k, 1.5l, 1,50,000.</p>
                  )}

                  <div>
                    <label htmlFor="out-scope" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                      Scope
                    </label>
                    <select
                      id="out-scope"
                      value={outScope}
                      onChange={(event) => setOutScope(event.target.value)}
                      className="input-minimal min-h-[48px]"
                    >
                      {SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="out-description" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
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
                    className="btn-primary min-h-[48px] w-full"
                  >
                    {submittingOut ? (
                      <><Loader2 className="h-[16px] w-[16px] animate-spin" /> Recording</>
                    ) : (
                      <><MinusCircle className="h-[16px] w-[16px]" /> Record money out</>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmitDue} className="space-y-[16px]">
                  <div className="rounded-xl border border-[color:var(--color-due-border)] bg-[color:var(--color-due-dim)] p-[16px]">
                    <div className="flex items-center justify-between gap-[12px] text-sm">
                      <span className="text-[color:var(--color-text)]">Pending dues now</span>
                      <span className="font-mono font-semibold text-[color:var(--color-text)]">
                        {formatCurrency(data?.totals.pendingDues ?? 0)}
                      </span>
                    </div>
                    {projectedPendingDues !== null ? (
                      <div className="mt-[8px] flex items-center justify-between gap-[12px] text-sm">
                        <span className="text-[color:var(--color-text)]">After this due</span>
                        <span className="font-mono font-semibold text-[color:var(--color-text)]">
                          {formatCurrency(projectedPendingDues)}
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-[8px] text-xs leading-relaxed text-[color:var(--color-text)]">
                      A custom due changes the available balance only after it is marked paid.
                    </p>
                  </div>

                  {selectedStudent ? (
                    <div className="rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[16px]">
                      <div className="flex items-center justify-between gap-[12px]">
                        <div className="min-w-[0px]">
                          <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">{selectedStudent.name}</p>
                          <p className="mt-[4px] font-mono text-xs text-[color:var(--color-text-dim)]">
                            {selectedStudent.id} • {selectedStudent.branchLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(null);
                            setStudentSearch("");
                          }}
                          className="rounded-lg border border-[color:var(--color-hairline)] px-[12px] py-[8px] text-xs font-semibold text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)]"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="due-student" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                        Student
                      </label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-[12px] top-[50%] h-[16px] w-[16px] -translate-y-1/2 text-[color:var(--color-text-faint)]" />
                        <input
                          id="due-student"
                          value={studentSearch}
                          onChange={(event) => setStudentSearch(event.target.value)}
                          placeholder="Search SKF ID or name"
                          className="input-minimal min-h-[48px] pl-[36px]"
                          autoCapitalize="characters"
                        />
                      </div>

                      <div className="mt-[12px] max-h-[224px] space-y-[8px] overflow-y-auto">
                        {loadingStudents ? (
                          <div className="flex h-[80px] items-center justify-center text-sm text-[color:var(--color-text-dim)]">
                            <Loader2 className="mr-[8px] h-[16px] w-[16px] animate-spin" /> Loading students
                          </div>
                        ) : studentSearch.trim() && studentResults.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[color:var(--color-hairline)] px-[16px] py-[24px] text-center text-sm text-[color:var(--color-text-dim)]">
                            No student found.
                          </div>
                        ) : !studentSearch.trim() ? (
                          <div className="rounded-lg border border-dashed border-[color:var(--color-hairline)] px-[16px] py-[24px] text-center text-sm text-[color:var(--color-text-dim)]">
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
                              className="flex w-full items-center gap-[12px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[10px] text-left transition-colors hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
                            >
                              <span className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)]">
                                <UserRound className="h-[16px] w-[16px]" />
                              </span>
                              <span className="min-w-[0px] flex-1">
                                <span className="block truncate text-sm font-semibold text-[color:var(--color-text)]">{student.name}</span>
                                <span className="mt-[2px] block font-mono text-xs text-[color:var(--color-text-dim)]">{student.id} • {student.branchLabel}</span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="due-title" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                      Title shown to student
                    </label>
                    <input
                      id="due-title"
                      value={dueTitle}
                      onChange={(event) => setDueTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Nunchaku"
                      className="input-minimal min-h-[48px]"
                    />
                  </div>

                  <div className="grid gap-[16px] sm:grid-cols-2">
                    <div>
                      <label htmlFor="due-amount" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                        Amount
                      </label>
                      <input
                        id="due-amount"
                        value={dueAmount}
                        onChange={(event) => setDueAmount(event.target.value)}
                        inputMode="text"
                        placeholder="1.5k"
                        className="input-minimal min-h-[48px] font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="due-month" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                        Month
                      </label>
                      <select
                        id="due-month"
                        value={dueMonth}
                        onChange={(event) => setDueMonth(Number(event.target.value))}
                        className="input-minimal min-h-[48px]"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index}>{month} {year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {Number.isFinite(parsedDueAmount) && parsedDueAmount > 0 ? (
                    <p className="text-xs text-[color:var(--color-text-dim)]">{formatCurrency(parsedDueAmount)} — {amountToIndianWords(parsedDueAmount)}</p>
                  ) : null}

                  <div>
                    <label htmlFor="due-date" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
                      Due date
                    </label>
                    <input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="input-minimal min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="due-note" className="mb-[8px] block text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">
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
                    className="btn-primary min-h-[48px] w-full"
                  >
                    {submittingDue ? (
                      <><Loader2 className="h-[16px] w-[16px] animate-spin" /> Creating</>
                    ) : (
                      <><HandCoins className="h-[16px] w-[16px]" /> Create pending due</>
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
    </PageTransition>
  );
}
