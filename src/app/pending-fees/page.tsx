"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { getStudents, type Student } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import {
  cleanIndianPhone,
  feeReminderWhatsAppUrl,
  MONTHS,
  MONTHS_SHORT,
  phoneValue,
  readFeeReminderTemplate,
  replaceFeeReminderPlaceholders,
  studentName,
  unresolvedPlaceholders,
} from "@/lib/fee-reminder-message";
import { getCurrentFeeYear } from "@/lib/fee-year";

type BranchFilter = "Overall" | "MPSC" | "Herohalli";
type PendingMonthDue = {
  monthIndex: number;
  year: number;
  label: string;
  shortLabel: string;
  amount: number;
};
type PendingStudent = Student & {
  branch: "MPSC" | "Herohalli";
  pendingMonths: PendingMonthDue[];
  totalPending: number;
};

const BRANCH_OPTIONS: Array<{ value: BranchFilter; label: string }> = [
  { value: "Overall", label: "All Branches" },
  { value: "MPSC", label: "MP" },
  { value: "Herohalli", label: "Herohalli" },
];

function activeStudent(student: Student) {
  return String(student.status || "").toLowerCase() === "active";
}

function telHref(student: Student) {
  const phone = cleanIndianPhone(phoneValue(student));
  return phone ? `tel:+${phone}` : "";
}

function monthRangeLabel(monthIndex: number, year: number) {
  if (monthIndex <= 0) return `${MONTHS[0]} ${year}`;
  return `${MONTHS_SHORT[0]} - ${MONTHS_SHORT[monthIndex]} ${year}`;
}

function dueForStudent(student: PendingStudent, due: PendingMonthDue): Student {
  return {
    ...student,
    fee: due.amount,
  };
}

export default function PendingFeesPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [branch, setBranch] = useState<BranchFilter>("Overall");
  const [month, setMonth] = useState(new Date().getMonth());
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [previewStudent, setPreviewStudent] = useState<PendingStudent | null>(null);
  const [previewMonthIndex, setPreviewMonthIndex] = useState<number | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<string>(() => readFeeReminderTemplate());

  const loadPendingStudents = useCallback(async (forceRefresh = false) => {
    if (checking || !user) return;
    setError("");
    setNotice("");
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const branches: Array<"MPSC" | "Herohalli"> = branch === "Overall" ? ["MPSC", "Herohalli"] : [branch];
      const monthIndexes = Array.from({ length: month + 1 }, (_, index) => index);
      const rows = await Promise.all(
        branches.flatMap((branchName) =>
          monthIndexes.map(async (monthIndex) => ({
            branchName,
            monthIndex,
            students: await getStudents(branchName, monthIndex, forceRefresh, feeYear),
          })),
        ),
      );
      const pendingByStudent = new Map<string, {
        branch: "MPSC" | "Herohalli";
        student: Student;
        pendingMonths: PendingMonthDue[];
      }>();

      rows.forEach(({ branchName, monthIndex, students: branchStudents }) => {
        branchStudents
          .filter((student) => activeStudent(student) && student.monthStatus === "Pending")
          .forEach((student) => {
            const key = `${branchName}-${student.id}`;
            const entry = pendingByStudent.get(key) || {
              branch: branchName,
              student,
              pendingMonths: [],
            };

            entry.student = student;
            entry.pendingMonths.push({
              monthIndex,
              year: feeYear,
              label: `${MONTHS[monthIndex]} ${feeYear}`,
              shortLabel: `${MONTHS_SHORT[monthIndex]} ${feeYear}`,
              amount: Number(student.fee || 0),
            });
            pendingByStudent.set(key, entry);
          });
      });

      setStudents(
        Array.from(pendingByStudent.values())
          .map((entry) => {
            const pendingMonths = entry.pendingMonths.sort((a, b) => a.monthIndex - b.monthIndex);
            return {
              ...entry.student,
              branch: entry.branch,
              pendingMonths,
              totalPending: pendingMonths.reduce((sum, due) => sum + due.amount, 0),
            };
          })
          .sort((a, b) =>
            b.pendingMonths.length - a.pendingMonths.length ||
            a.pendingMonths[0].monthIndex - b.pendingMonths[0].monthIndex ||
            b.totalPending - a.totalPending ||
            studentName(a).localeCompare(studentName(b)),
          ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending fees.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branch, checking, feeYear, month, user]);

  useEffect(() => {
    if (checking || !user) return;
    const timeoutId = window.setTimeout(() => {
      void loadPendingStudents(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [checking, loadPendingStudents, user]);

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [
        student.name,
        student.parentName,
        student.id,
        student.branch,
        student.phone,
        student.whatsapp,
        student.pendingMonths.map((due) => due.label).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, students]);

  const totalPending = filteredStudents.reduce((sum, student) => sum + student.totalPending, 0);
  const missingPhone = filteredStudents.filter((student) => !cleanIndianPhone(phoneValue(student))).length;
  const selectedMonthLabel = monthRangeLabel(month, feeYear);

  const openPreview = (student: PendingStudent) => {
    setMessageTemplate(readFeeReminderTemplate());
    setPreviewMonthIndex(student.pendingMonths[0]?.monthIndex ?? month);
    setPreviewStudent(student);
  };

  const previewDue = previewStudent
    ? previewStudent.pendingMonths.find((due) => due.monthIndex === previewMonthIndex) || previewStudent.pendingMonths[0] || null
    : null;
  const previewMessageStudent = previewStudent && previewDue ? dueForStudent(previewStudent, previewDue) : null;
  const previewMessage = previewStudent
    ? replaceFeeReminderPlaceholders(messageTemplate, previewMessageStudent || previewStudent, {
        branch: previewStudent.branch,
        monthIndex: previewDue?.monthIndex ?? month,
      })
    : "";
  const previewIssues = unresolvedPlaceholders(previewMessage);

  async function copyMessage() {
    if (!previewStudent) return;
    try {
      await navigator.clipboard.writeText(previewMessage);
      setNotice(`${studentName(previewStudent)} ${previewDue?.shortLabel || ""} reminder copied.`);
    } catch {
      setError("Clipboard access failed. Select and copy the message manually.");
    }
  }

  function openWhatsApp() {
    if (!previewStudent || !previewDue) return;
    const url = feeReminderWhatsAppUrl(messageTemplate, dueForStudent(previewStudent, previewDue), {
      branch: previewStudent.branch,
      monthIndex: previewDue.monthIndex,
    });
    if (!url) {
      setError(`${studentName(previewStudent)} does not have a WhatsApp number.`);
      return;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.open(url, "_self");
  }

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-black text-zinc-300">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Pending Fees" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Wallet className="h-4 w-4 text-amber-300" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Fee Follow-ups</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Pending Fees
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Review monthly dues, call parents, or send the current WhatsApp reminder template from Messages.
            </p>
          </div>
          <Link
            href="/messages"
            className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2 px-4"
          >
            <MessageCircle className="h-4 w-4" />
            Edit Message
          </Link>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Pending Students" value={String(filteredStudents.length)} />
          <Metric label="Pending Amount" value={`₹${totalPending.toLocaleString("en-IN")}`} />
          <Metric label="Missing Phone" value={String(missingPhone)} />
        </section>

        <section className="card-panel mb-5 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-minimal min-h-11 pl-11"
                placeholder="Search name, SKF ID, parent or phone"
              />
            </div>
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value as BranchFilter)}
              className="input-minimal min-h-11"
            >
              {BRANCH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(event) => setMonth(Number.parseInt(event.target.value, 10))}
              className="input-minimal min-h-11"
            >
              {MONTHS_SHORT.map((label, index) => (
                <option key={label} value={index}>{label} {feeYear}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadPendingStudents(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-zinc-400 hover:border-zinc-600 hover:text-white disabled:opacity-60"
              title="Refresh pending fees"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        <section className="card-panel overflow-hidden p-0">
          <div className="border-b border-zinc-800 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">{selectedMonthLabel}</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {branch === "Overall" ? "All Branches" : BRANCH_OPTIONS.find((option) => option.value === branch)?.label} Pending List
              </h2>
              <p className="mt-1 text-xs text-zinc-600">Sorted by students with the highest overdue month count first.</p>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              <p className="text-sm font-semibold text-white">No pending fees found</p>
              <p className="text-sm text-zinc-500">Change the branch or month filter if you need another period.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredStudents.map((student) => {
                const phone = phoneValue(student);
                const callUrl = telHref(student);
                return (
                  <div key={`${student.branch}-${student.id}`} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-white">{studentName(student)}</h3>
                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                          {student.branch}
                        </span>
                        <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                          ₹{student.totalPending.toLocaleString("en-IN")}
                        </span>
                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                          {student.pendingMonths.length} month{student.pendingMonths.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="font-mono">{student.id}</span>
                        <span>{student.parentName || "Parent not set"}</span>
                        <span className={phone ? "text-zinc-500" : "text-amber-300"}>{phone || "No phone number"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {student.pendingMonths.map((due) => (
                          <span
                            key={`${student.branch}-${student.id}-${due.monthIndex}`}
                            className="rounded-md border border-amber-500/15 bg-amber-500/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
                          >
                            {due.shortLabel} • ₹{due.amount.toLocaleString("en-IN")}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => openPreview(student)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                      <a
                        href={callUrl || undefined}
                        aria-disabled={!callUrl}
                        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
                          callUrl
                            ? "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white"
                            : "pointer-events-none border-zinc-900 bg-zinc-950 text-zinc-700"
                        }`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Call</span>
                      </a>
                      <Link
                        href={`/students/${student.branch}/${encodeURIComponent(student.id)}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Profile</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {previewStudent ? (
        <div className="glass-modal-overlay" onClick={(event) => event.target === event.currentTarget && setPreviewStudent(null)}>
          <div className="glass-modal !max-w-lg p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Reminder Preview</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{studentName(previewStudent)}</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {previewStudent.id} • {previewStudent.branch} • {previewStudent.pendingMonths.length} pending month{previewStudent.pendingMonths.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white"
                aria-label="Close reminder preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Select Pending Month</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {previewStudent.pendingMonths.map((due) => {
                  const selected = due.monthIndex === previewDue?.monthIndex;
                  return (
                    <button
                      key={`${previewStudent.branch}-${previewStudent.id}-${due.monthIndex}`}
                      type="button"
                      onClick={() => setPreviewMonthIndex(due.monthIndex)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-white/20 bg-white text-black"
                          : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600 hover:text-white"
                      }`}
                    >
                      <span className="block text-xs font-semibold">{due.shortLabel}</span>
                      <span className={`mt-1 block text-[10px] ${selected ? "text-black/60" : "text-zinc-600"}`}>
                        ₹{due.amount.toLocaleString("en-IN")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {previewIssues.length ? (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                Unknown placeholders: {previewIssues.join(", ")}
              </div>
            ) : null}

            <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-300">
              {previewMessage}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={copyMessage}
                className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-panel p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
