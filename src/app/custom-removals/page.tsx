"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Plus,
  Trash2,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { PageTransition } from "@/components/common/PageTransition";
import {
  getFinanceCommandCenter,
  addRemoval,
  deleteRemoval,
  type FinanceCommandCenterData,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import { useToast } from "@/lib/use-toast";

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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

export default function CustomRemovalsPage() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  const feeYear = getCurrentFeeYear();
  const currentMonth = new Date().getMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [branch, setBranch] = useState("");
  const [data, setData] = useState<FinanceCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("Both");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || checking) return;
    setLoading(true);
    setError("");
    try {
      const result = await getFinanceCommandCenter(branch, selectedMonth, true, feeYear);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load removal data");
    } finally {
      setLoading(false);
    }
  }, [user, checking, branch, selectedMonth, feeYear]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      void fetchData();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [fetchData]);

  const removals: RemovalRow[] = (data?.ledgerRows || [])
    .filter((row) => row.category === "custom_removal")
    .map((row) => ({
      id: row.id,
      date: row.date,
      label: row.label,
      amount: Math.abs(row.amount),
      branch: row.branch,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.label.localeCompare(b.label));

  const canSubmit =
    title.trim().length > 0 &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedTitle = title.trim();
    const parsedAmount = Number(amount);
    if (!trimmedTitle) {
      toast("Enter a title", "error");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }

    setSubmitting(true);
    setSuccessMessage("");
    try {
      const effectiveBranch = branch || "MPSC";
      await addRemoval(effectiveBranch, selectedMonth, trimmedTitle, parsedAmount, description.trim() || undefined, feeYear);
      const msg = `Removed ${formatCurrency(parsedAmount)} for "${trimmedTitle}"`;
      setSuccessMessage(msg);
      toast(msg, "success");
      setTitle("");
      setDescription("");
      setAmount("");
      await fetchData();
    } catch (submitError) {
      toast(submitError instanceof Error ? submitError.message : "Failed to add removal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (removalId: string) => {
    if (deletingId) return;
    setDeletingId(removalId);
    try {
      const effectiveBranch = branch || "MPSC";
      await deleteRemoval(effectiveBranch, selectedMonth, removalId, feeYear);
      toast("Removal deleted", "success");
      await fetchData();
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
        <Navbar title="Custom Removals" showBack rightContent={<NavMenu />} />

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">
                Fee Collection
              </p>
              <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Custom Removals
              </h1>
              <p className="mt-2 max-w-lg text-sm text-zinc-500">
                Record money withdrawn from the master ledger. Removals appear as expenses on the finances page.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-semibold text-zinc-400">
              <MinusCircle className="h-3.5 w-3.5 text-red-300" />
              {MONTHS[selectedMonth]} {feeYear}
            </div>
          </header>

          {error ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Could not load data.</p>
                <p className="mt-1 text-red-100/75">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchData()}
                  className="mt-3 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <section className="card-panel p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Recorded Removals</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {MONTHS[selectedMonth]} {feeYear}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-zinc-600"
                  >
                    {MONTHS.map((label, idx) => (
                      <option key={label} value={idx}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-zinc-600"
                  >
                    {BRANCH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex h-52 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </div>
              ) : removals.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 text-center">
                  <MinusCircle className="mb-3 h-6 w-6 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">No removals recorded for this period</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {removals.map((removal) => (
                    <div
                      key={removal.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-red-900/30 bg-red-900/10">
                        <MinusCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{removal.label}</p>
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">
                          {removal.date} · {removal.branch}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-red-400">
                        -{formatCurrency(removal.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(removal.id)}
                        disabled={deletingId === removal.id}
                        className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                        title="Delete removal"
                      >
                        {deletingId === removal.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="removal-title" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Title
                  </label>
                  <input
                    id="removal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    placeholder="Equipment purchase"
                    className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/60"
                  />
                </div>

                <div>
                  <label htmlFor="removal-amount" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Amount
                  </label>
                  <input
                    id="removal-amount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10000000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/60"
                  />
                </div>

                <div>
                  <label htmlFor="removal-scope" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Scope
                  </label>
                  <select
                    id="removal-scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-red-500/60"
                  >
                    {SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="removal-desc" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Description
                  </label>
                  <textarea
                    id="removal-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Optional details about this withdrawal"
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Record Removal
                    </>
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
        </main>
      </div>
    </PageTransition>
  );
}
