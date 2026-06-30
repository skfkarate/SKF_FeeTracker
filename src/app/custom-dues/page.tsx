"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HandCoins,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { PageTransition } from "@/components/common/PageTransition";
import {
  createManualStudentFee,
  getStudents,
  type Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import { useToast } from "@/lib/use-toast";

const BRANCHES = [
  { key: "MPSC", label: "MP" },
  { key: "Herohalli", label: "Herohalli" },
] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type BranchKey = (typeof BRANCHES)[number]["key"];
type SearchableStudent = Student & {
  branch: BranchKey;
  branchLabel: string;
};

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

export default function CustomDuesPage() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  const currentMonth = new Date().getMonth();
  const feeYear = getCurrentFeeYear();

  const [students, setStudents] = useState<SearchableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SearchableStudent | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayInputDate);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdMessage, setCreatedMessage] = useState("");

  const loadStudents = useCallback(async () => {
    if (!user || checking) return;
    setLoading(true);
    setError("");
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [checking, currentMonth, feeYear, user]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      void loadStudents();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [loadStudents]);

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

  const canSubmit =
    selectedStudent &&
    title.trim().length > 0 &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    !submitting;

  const handleSelect = (student: SearchableStudent) => {
    setSelectedStudent(student);
    setSearch(student.id);
    setCreatedMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudent || submitting) return;

    const trimmedTitle = title.trim();
    const parsedAmount = Number(amount);
    if (!trimmedTitle) {
      toast("Enter the display title", "error");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }

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

  if (checking || !user) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-zinc-300">
        <Navbar title="Custom Dues" showBack rightContent={<NavMenu />} />

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">
                FeeTrack Office
              </p>
              <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Create Custom Due
              </h1>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-semibold text-zinc-400">
              <HandCoins className="h-3.5 w-3.5 text-amber-300" />
              {MONTHS[currentMonth]} {feeYear}
            </div>
          </header>

          {error ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Could not load students.</p>
                <p className="mt-1 text-red-100/75">{error}</p>
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
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-500"
                  autoCapitalize="characters"
                />
              </div>

              <div className="mt-4 min-h-[260px]">
                {loading ? (
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
                            <span className="block truncate text-sm font-semibold text-white">
                              {student.name}
                            </span>
                            <span className="mt-1 block font-mono text-xs text-zinc-500">
                              {student.id} · {student.branchLabel}
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
                    <span className="rounded-md border border-zinc-800 bg-black px-2 py-1 font-mono text-zinc-400">
                      {selectedStudent.id}
                    </span>
                    <span className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-zinc-400">
                      {selectedStudent.branchLabel}
                    </span>
                    <span className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-zinc-400">
                      {selectedStudent.monthStatus}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
                  Select a student before creating the due.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="custom-due-title" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Title Shown To Student
                  </label>
                  <input
                    id="custom-due-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={120}
                    placeholder="Nunchaku"
                    className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label htmlFor="custom-due-amount" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Amount
                    </label>
                    <input
                      id="custom-due-amount"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="1000000"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="1500"
                      className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-due-date" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Due Date
                    </label>
                    <input
                      id="custom-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-amber-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="custom-due-note" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Internal Note
                  </label>
                  <textarea
                    id="custom-due-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Optional"
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500/60"
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
                      Creating
                    </>
                  ) : (
                    <>
                      <HandCoins className="h-4 w-4" />
                      Create Pending Due
                    </>
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
        </main>
      </div>
    </PageTransition>
  );
}
