"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HandCoins,
  Loader2,
  MinusCircle,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { PageTransition } from "@/components/common/PageTransition";
import {
  createManualStudentFee,
  getFinanceCommandCenter,
  getStudents,
  addRemoval,
  deleteRemoval,
  type FinanceCommandCenterData,
  type Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import { useToast } from "@/lib/use-toast";

const BRANCHES = [
  { key: "MPSC" as const, label: "MP" },
  { key: "Herohalli" as const, label: "Herohalli" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type BranchKey = (typeof BRANCHES)[number]["key"];
type SearchableStudent = Student & { branch: BranchKey; branchLabel: string };
type CustomTab = "dues" | "removals";

const BRANCH_OPTIONS = [
  { value: "", label: "Overall" },
  { value: "MPSC", label: "MP" },
  { value: "Herohalli", label: "Herohalli" },
];

const SCOPE_OPTIONS = [
  { value: "MPSC", label: "MP Sports Club" },
  { value: "Herohalli", label: "Herohalli" },
  { value: "Both", label: "Both Branches" },
  { value: "Others", label: "Others" },
];

function todayInputDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function money(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatCurrency(amount: number) {
  const rounded = Math.round(Number(amount) || 0);
  const prefix = rounded < 0 ? "-₹" : "₹";
  return `${prefix}${Math.abs(rounded).toLocaleString("en-IN")}`;
}

interface RemovalRow {
  id: string;
  date: string;
  label: string;
  amount: number;
  branch: string;
}

export default function CustomPageClient() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const feeYear = getCurrentFeeYear();
  const currentMonth = new Date().getMonth();

  const activeTab: CustomTab = searchParams.get("tab") === "removals" ? "removals" : "dues";

  const switchTab = (tab: CustomTab) => {
    router.replace(`/custom?tab=${tab}`, { scroll: false });
  };

  // === Dues state ===
  const [students, setStudents] = useState<SearchableStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentError, setStudentError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SearchableStudent | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayInputDate);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdMessage, setCreatedMessage] = useState("");

  // === Removals state ===
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [branch, setBranch] = useState("");
  const [removalData, setRemovalData] = useState<FinanceCommandCenterData | null>(null);
  const [loadingRemovals, setLoadingRemovals] = useState(true);
  const [removalError, setRemovalError] = useState("");
  const [removalTitle, setRemovalTitle] = useState("");
  const [removalDescription, setRemovalDescription] = useState("");
  const [scope, setScope] = useState("Both");
  const [removalAmount, setRemovalAmount] = useState("");
  const [submittingRemoval, setSubmittingRemoval] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!user || checking) return;
    setLoadingStudents(true);
    setStudentError("");
    try {
      const rows = await Promise.all(
        BRANCHES.map(async (branch) => {
          const branchStudents = await getStudents(branch.key, currentMonth, false, feeYear);
          return branchStudents.map((student) => ({
            ...student,
            branch: branch.key,
            branchLabel: branch.label,
          }));
        }),
      );
      const bySkfId = new Map<string, SearchableStudent>();
      for (const student of rows.flat()) {
        if (!bySkfId.has(student.id)) bySkfId.set(student.id, student);
      }
      setStudents(
        Array.from(bySkfId.values()).sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }),
        ),
      );
    } catch (loadError) {
      setStudentError(loadError instanceof Error ? loadError.message : "Unable to load students.");
    } finally {
      setLoadingStudents(false);
    }
  }, [checking, currentMonth, feeYear, user]);

  const fetchRemovals = useCallback(async () => {
    if (!user || checking) return;
    setLoadingRemovals(true);
    setRemovalError("");
    try {
      const result = await getFinanceCommandCenter(branch, selectedMonth, true, feeYear);
      setRemovalData(result);
    } catch (err) {
      setRemovalError(err instanceof Error ? err.message : "Failed to load removal data");
    } finally {
      setLoadingRemovals(false);
    }
  }, [user, checking, branch, selectedMonth, feeYear]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      void loadStudents();
    }, 0);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [loadStudents]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      void fetchRemovals();
    }, 0);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [fetchRemovals]);

  const results = useMemo(() => {
    const query = normalize(search);
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
  }, [search, students]);

  const removals: RemovalRow[] = (removalData?.ledgerRows || [])
    .filter((row) => row.category === "custom_removal")
    .map((row) => ({
      id: row.id,
      date: row.date,
      label: row.label,
      amount: Math.abs(row.amount),
      branch: row.branch,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.label.localeCompare(b.label));

  const handleSelect = (student: SearchableStudent) => {
    setSelectedStudent(student);
    setSearch(student.id);
    setCreatedMessage("");
  };

  const canSubmitDue =
    selectedStudent &&
    title.trim().length > 0 &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    !submitting;

  const handleSubmitDue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudent || submitting) return;
    const trimmedTitle = title.trim();
    const parsedAmount = Number(amount);
    if (!trimmedTitle) { toast("Enter the display title", "error"); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { toast("Enter a valid amount", "error"); return; }

    setSubmitting(true);
    setCreatedMessage("");
    try {
      await createManualStudentFee({
        studentId: selectedStudent.id,
        branch: selectedStudent.branch,
        month: currentMonth,
        year: feeYear,
        title: trimmedTitle,
        amount: parsedAmount,
        dueDate: dueDate || undefined,
        description: note.trim() || undefined,
      });
      const message = `${trimmedTitle} for ${selectedStudent.name} is now pending for ${money(parsedAmount)}.`;
      setCreatedMessage(message);
      toast(message, "success");
      setTitle("");
      setAmount("");
      setNote("");
      setDueDate(todayInputDate());
    } catch (submitError) {
      toast(submitError instanceof Error ? submitError.message : "Failed to create custom due", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitRemoval =
    removalTitle.trim().length > 0 &&
    Number.isFinite(Number(removalAmount)) &&
    Number(removalAmount) > 0 &&
    !submittingRemoval;

  const handleSubmitRemoval = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRemoval) return;
    const trimmedTitle = removalTitle.trim();
    const parsedAmount = Number(removalAmount);
    if (!trimmedTitle) { toast("Enter a title", "error"); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { toast("Enter a valid amount", "error"); return; }

    setSubmittingRemoval(true);
    setSuccessMessage("");
    try {
      const effectiveBranch = branch || "MPSC";
      await addRemoval(effectiveBranch, selectedMonth, trimmedTitle, parsedAmount, removalDescription.trim() || undefined, feeYear);
      const msg = `Removed ${formatCurrency(parsedAmount)} for "${trimmedTitle}"`;
      setSuccessMessage(msg);
      toast(msg, "success");
      setRemovalTitle("");
      setRemovalDescription("");
      setRemovalAmount("");
      await fetchRemovals();
    } catch (submitError) {
      toast(submitError instanceof Error ? submitError.message : "Failed to add removal", "error");
    } finally {
      setSubmittingRemoval(false);
    }
  };

  const handleDeleteRemoval = async (removalId: string) => {
    if (deletingId) return;
    setDeletingId(removalId);
    try {
      const effectiveBranch = branch || "MPSC";
      await deleteRemoval(effectiveBranch, selectedMonth, removalId, feeYear);
      toast("Removal deleted", "success");
      await fetchRemovals();
    } catch (deleteError) {
      toast(deleteError instanceof Error ? deleteError.message : "Failed to delete removal", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (checking || !user) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-zinc-300">
        <Navbar title="Custom Operations" showBack rightContent={<NavMenu />} />

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">FeeTrack Office</p>
              <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Custom Operations
              </h1>
              <p className="mt-2 max-w-lg text-sm text-zinc-500">
                {activeTab === "dues"
                  ? "Create one-off custom dues for individual students by SKF ID."
                  : "Record money withdrawn from the master ledger as custom removals."}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-semibold text-zinc-400">
              {activeTab === "dues" ? (
                <HandCoins className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <MinusCircle className="h-3.5 w-3.5 text-red-300" />
              )}
              {MONTHS[currentMonth]} {feeYear}
            </div>
          </header>

          <div className="mb-6 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => switchTab("dues")}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                activeTab === "dues"
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <HandCoins className="h-4 w-4" />
              Custom Dues
            </button>
            <button
              type="button"
              onClick={() => switchTab("removals")}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                activeTab === "removals"
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <MinusCircle className="h-4 w-4" />
              Custom Removals
            </button>
          </div>

          {activeTab === "dues" && (
            <>
              {studentError ? (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Could not load students.</p>
                    <p className="mt-1 text-red-100/75">{studentError}</p>
                    <button
                      type="button"
                      onClick={() => void loadStudents()}
                      className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                <section className="card-panel p-5 sm:p-6">
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Student Search</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Find by SKF ID</h2>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setSelectedStudent(null);
                        setCreatedMessage("");
                      }}
                      placeholder="SKF ID or student name"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60"
                      autoCapitalize="characters"
                    />
                  </div>

                  <div className="mt-4 min-h-[260px]">
                    {loadingStudents ? (
                      <div className="flex h-52 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading students
                      </div>
                    ) : !search.trim() ? (
                      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 text-center">
                        <Search className="mb-3 h-6 w-6 text-zinc-600" />
                        <p className="text-sm font-medium text-zinc-400">Search SKF ID to begin</p>
                      </div>
                    ) : results.length === 0 ? (
                      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 text-center">
                        <AlertCircle className="mb-3 h-6 w-6 text-zinc-600" />
                        <p className="text-sm font-medium text-zinc-400">No matching student found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {results.map((student) => {
                          const selected = selectedStudent?.id === student.id;
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => handleSelect(student)}
                              className={`flex min-h-20 w-full items-center gap-3 rounded-xl border px-4 text-left transition-all ${
                                selected
                                  ? "border-amber-400/60 bg-amber-500/10"
                                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900/70"
                              }`}
                            >
                              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-black text-zinc-500">
                                <UserRound className="h-5 w-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-white">{student.name}</span>
                                <span className="mt-1 block font-mono text-xs text-zinc-500">
                                  {student.id} {student.branchLabel}
                                </span>
                              </span>
                              {selected ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-amber-300" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="card-panel p-5 sm:p-6">
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Due Details</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Create Pending Item</h2>
                  </div>

                  {selectedStudent ? (
                    <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-xs uppercase tracking-widest text-zinc-600">Selected Student</p>
                      <p className="mt-2 truncate text-base font-semibold text-white">{selectedStudent.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md border border-zinc-800 bg-black px-2 py-1 font-mono text-zinc-400">{selectedStudent.id}</span>
                        <span className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-zinc-400">{selectedStudent.branchLabel}</span>
                        <span className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-zinc-400">{selectedStudent.monthStatus}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
                      Select a student before creating the due.
                    </div>
                  )}

                  <form onSubmit={handleSubmitDue} className="space-y-4">
                    <div>
                      <label htmlFor="custom-due-title" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Title Shown To Student</label>
                      <input id="custom-due-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Nunchaku" className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="custom-due-amount" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Amount</label>
                        <input id="custom-due-amount" type="number" inputMode="numeric" min="1" max="1000000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60" />
                      </div>
                      <div>
                        <label htmlFor="custom-due-date" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Due Date</label>
                        <input id="custom-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-amber-500/60" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="custom-due-note" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Internal Note</label>
                      <textarea id="custom-due-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Optional" className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60" />
                    </div>
                    <button type="submit" disabled={!canSubmitDue} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Creating</>
                      ) : (
                        <><HandCoins className="h-4 w-4" /> Create Pending Due</>
                      )}
                    </button>
                  </form>

                  {createdMessage ? (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p>{createdMessage}</p>
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}

          {activeTab === "removals" && (
            <>
              {removalError ? (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Could not load data.</p>
                    <p className="mt-1 text-red-100/75">{removalError}</p>
                    <button type="button" onClick={() => void fetchRemovals()} className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20">Retry</button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                <section className="card-panel p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-zinc-500">Recorded Removals</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">{MONTHS[selectedMonth]} {feeYear}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-zinc-600">
                        {MONTHS.map((label, idx) => (<option key={label} value={idx}>{label}</option>))}
                      </select>
                      <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-zinc-600">
                        {BRANCH_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                  </div>

                  {loadingRemovals ? (
                    <div className="flex h-52 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                    </div>
                  ) : removals.length === 0 ? (
                    <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 text-center">
                      <MinusCircle className="mb-3 h-6 w-6 text-zinc-600" />
                      <p className="text-sm font-medium text-zinc-400">No removals recorded for this period</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {removals.map((removal) => (
                        <div key={removal.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-red-900/30 bg-red-900/10">
                            <MinusCircle className="h-5 w-5 text-red-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{removal.label}</p>
                            <p className="mt-0.5 font-mono text-xs text-zinc-500">{removal.date} {removal.branch}</p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-red-400">-{formatCurrency(removal.amount)}</span>
                          <button type="button" onClick={() => handleDeleteRemoval(removal.id)} disabled={deletingId === removal.id} className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50" title="Delete removal">
                            {deletingId === removal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="card-panel p-5 sm:p-6">
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">New Removal</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Record Withdrawal</h2>
                  </div>

                  <form onSubmit={handleSubmitRemoval} className="space-y-4">
                    <div>
                      <label htmlFor="removal-title" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Title</label>
                      <input id="removal-title" value={removalTitle} onChange={(e) => setRemovalTitle(e.target.value)} maxLength={120} placeholder="Equipment purchase" className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/60" />
                    </div>
                    <div>
                      <label htmlFor="removal-amount" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Amount</label>
                      <input id="removal-amount" type="number" inputMode="numeric" min="1" max="10000000" value={removalAmount} onChange={(e) => setRemovalAmount(e.target.value)} placeholder="5000" className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/60" />
                    </div>
                    <div>
                      <label htmlFor="removal-scope" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Scope</label>
                      <select id="removal-scope" value={scope} onChange={(e) => setScope(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-red-500/60">
                        {SCOPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="removal-desc" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Description</label>
                      <textarea id="removal-desc" value={removalDescription} onChange={(e) => setRemovalDescription(e.target.value)} maxLength={500} rows={3} placeholder="Optional details about this withdrawal" className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/60" />
                    </div>
                    <button type="submit" disabled={!canSubmitRemoval} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                      {submittingRemoval ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Recording</>
                      ) : (
                        <><Plus className="h-4 w-4" /> Record Removal</>
                      )}
                    </button>
                  </form>

                  {successMessage ? (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p>{successMessage}</p>
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
