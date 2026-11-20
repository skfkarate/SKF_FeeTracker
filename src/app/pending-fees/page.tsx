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
} from "lucide-react";

import GlobalSearch from "@/components/common/GlobalSearch";
import NavMenu from "@/components/common/NavMenu";
import NotificationBell from "@/components/common/NotificationBell";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill from "@/components/ui/StatusPill";
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

type FeeScope = "month" | "overdue" | "no_phone";

const BRANCH_OPTIONS: Array<{ value: BranchFilter; label: string }> = [
  { value: "Overall", label: "All Branches" },
  { value: "MPSC", label: "MP" },
  { value: "Herohalli", label: "Herohalli" },
];

const FEE_SCOPES: SegmentOption<FeeScope>[] = [
  { value: "month", label: "Month" },
  { value: "overdue", label: "Overdue" },
  { value: "no_phone", label: "No phone" },
];

function scopeAmount(student: PendingStudent, scope: FeeScope, monthIndex: number) {
  if (scope === "month") {
    return student.pendingMonths
      .filter((due) => due.monthIndex === monthIndex)
      .reduce((sum, due) => sum + due.amount, 0);
  }
  if (scope === "overdue") {
    return student.pendingMonths
      .filter((due) => due.monthIndex < monthIndex)
      .reduce((sum, due) => sum + due.amount, 0);
  }
  return student.totalPending;
}

function num(amount: number) {
  return Math.round(Number(amount) || 0).toLocaleString("en-IN");
}

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
  const [scope, setScope] = useState<FeeScope>("month");
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

  const visibleStudents = useMemo(() => {
    if (scope === "no_phone") {
      return filteredStudents.filter((student) => !cleanIndianPhone(phoneValue(student)));
    }
    return filteredStudents.filter((student) =>
      student.pendingMonths.some((due) =>
        scope === "month" ? due.monthIndex === month : due.monthIndex < month,
      ),
    );
  }, [filteredStudents, month, scope]);

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
    <>
    <PageShell
      hud={{
        title: "Fees",
        monthLabel: `${MONTHS_SHORT[month]} ${feeYear}`,
        branchLabel: branch === "Overall" ? "All branches" : branch,
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <NavMenu />,
      }}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[13px] leading-relaxed text-zinc-500">
          Review monthly dues, call parents, or send the current WhatsApp reminder template from Messages.
        </p>
        <Link
          href="/messages"
          className="btn-ghost inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4"
        >
          <MessageCircle className="h-4 w-4" />
          Edit Message
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Pending Students" value={num(filteredStudents.length)} tone="action" />
        <StatTile label="Pending Amount" value={num(totalPending)} tone="overdue" />
        <StatTile label="Missing Phone" value={num(missingPhone)} />
      </div>

      <SegmentedTabs
        options={FEE_SCOPES}
        value={scope}
        onChange={setScope}
        ariaLabel="Fee ledger scope"
        className="mb-5"
      />

      <section className="hud-panel mb-5 p-3 sm:p-4">
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
            aria-label="Branch filter"
          >
            {BRANCH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(event) => setMonth(Number.parseInt(event.target.value, 10))}
            className="input-minimal min-h-11"
            aria-label="Month filter"
          >
            {MONTHS_SHORT.map((label, index) => (
              <option key={label} value={index}>{label} {feeYear}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadPendingStudents(true)}
            disabled={refreshing}
            className="tap-target grid place-items-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] text-zinc-300 transition-colors hover:text-white disabled:opacity-50"
            title="Refresh pending fees"
            aria-label="Refresh pending fees"
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

      <section className="hud-panel overflow-hidden">
        <div className="border-b border-[color:var(--color-hairline)] p-4 sm:p-5">
          <p className="font-pixel-label text-zinc-500">{selectedMonthLabel}</p>
          <h2 className="mt-1 text-[15px] font-semibold text-white">
            {scope === "month" ? "Monthly ledger" : scope === "overdue" ? "Overdue ledger" : "Missing phone ledger"}
          </h2>
          <p className="mt-1 text-xs text-zinc-600">Sorted by students with the highest overdue month count first.</p>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            <p className="text-sm font-semibold text-white">No students in this ledger</p>
            <p className="text-sm text-zinc-500">Change the scope, branch, or month filter to see another list.</p>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--color-hairline)]">
            {visibleStudents.map((student, index) => {
              const phone = phoneValue(student);
              const overdue = student.pendingMonths.some((due) => due.monthIndex < month);
              const noPhone = !cleanIndianPhone(phone);
              const dueAmount = scopeAmount(student, scope, month);
              const status = noPhone ? "overdue" : overdue ? "overdue" : "due";
              return (
                <LedgerRow
                  key={`${student.branch}-${student.id}`}
                  index={index}
                  status={status}
                  title={studentName(student)}
                  subtitle={`${student.parentName || "Parent not set"} · ${phone || "No phone number"}`}
                  idLabel={`${student.id} · ${student.branch} · ${student.pendingMonths.length} MONTH${student.pendingMonths.length === 1 ? "" : "S"}`}
                  amount={num(dueAmount)}
                  amountLabel="due"
                  trailing={
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                      <StatusPill status={status} label={noPhone ? "No phone" : overdue ? "Overdue" : "Message"} />
                    </div>
                  }
                  onClick={() => openPreview(student)}
                />
              );
            })}
          </div>
        )}
      </section>
      </PageShell>

      <Sheet
        open={Boolean(previewStudent)}
        title="Reminder preview"
        onClose={() => {
          setPreviewStudent(null);
          setPreviewMonthIndex(null);
        }}
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyMessage()}
              className="tap-target inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] text-sm text-zinc-200"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button
              type="button"
              onClick={openWhatsApp}
              className="tap-target inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] bg-[color:var(--color-brand)] font-pixel-label text-black"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp
            </button>
          </div>
        }
      >
        {previewStudent ? (
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-[15px] font-semibold text-white">{studentName(previewStudent)}</p>
              <p className="font-mono text-[11px] text-zinc-500">
                {previewStudent.id} · {previewStudent.branch} · {previewStudent.pendingMonths.length} pending month{previewStudent.pendingMonths.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {telHref(previewStudent) ? (
                <a
                  href={telHref(previewStudent)}
                  className="tap-target inline-flex items-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 text-xs text-zinc-200"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              ) : null}
              <Link
                href={`/students/${previewStudent.branch}/${encodeURIComponent(previewStudent.id)}`}
                className="tap-target inline-flex items-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 text-xs text-zinc-200"
              >
                <ArrowRight className="h-4 w-4" />
                Profile
              </Link>
            </div>

            <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] p-3">
              <p className="mb-2 font-pixel-label text-zinc-500">Select pending month</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {previewStudent.pendingMonths.map((due) => {
                  const selected = due.monthIndex === previewDue?.monthIndex;
                  return (
                    <button
                      key={`${previewStudent.branch}-${previewStudent.id}-${due.monthIndex}`}
                      type="button"
                      onClick={() => setPreviewMonthIndex(due.monthIndex)}
                      className={`tap-target rounded-[var(--radius-row)] border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-white/30 bg-white text-black"
                          : "border-[color:var(--color-hairline)] bg-black text-zinc-300 hover:text-white"
                      }`}
                    >
                      <span className="block text-xs font-semibold">{due.shortLabel}</span>
                      <span className={`mt-1 block font-pixel text-[14px] ${selected ? "text-black/70" : "text-zinc-400"}`}>
                        {num(due.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {previewIssues.length ? (
              <div className="rounded-[var(--radius-row)] border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                Unknown placeholders: {previewIssues.join(", ")}
              </div>
            ) : null}

            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] p-4 text-sm leading-relaxed text-zinc-300">
              {previewMessage}
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
