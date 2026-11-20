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
import AccountMenu from "@/components/common/AccountMenu";
import NotificationBell from "@/components/common/NotificationBell";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
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
      <div className="min-h-screen text-[color:var(--color-text)]">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
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
        account: <AccountMenu />,
      }}
    >
      <div className="mb-[20px] flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[13px] leading-relaxed text-[color:var(--color-text-dim)]">
          Review monthly dues, call parents, or send the current WhatsApp reminder template from Messages.
        </p>
        <Link
          href="/messages"
          className="btn-ghost inline-flex min-h-[44px] shrink-0 items-center justify-center gap-[8px] px-[16px]"
        >
          <MessageCircle className="h-[16px] w-[16px]" />
          Edit Message
        </Link>
      </div>

      <div className="mb-[20px] grid grid-cols-2 gap-[12px] sm:grid-cols-3">
        <StatTile label="Pending Students" value={num(filteredStudents.length)} tone="action" />
        <StatTile label="Pending Amount" value={num(totalPending)} tone="neutral" />
        <StatTile label="Missing Phone" value={num(missingPhone)} />
      </div>

      <SegmentedTabs
        options={FEE_SCOPES}
        value={scope}
        onChange={setScope}
        ariaLabel="Fee ledger scope"
        className="mb-[20px]"
      />

      <section className="hud-panel mb-[20px] p-[12px] sm:p-[16px]">
        <div className="grid gap-[12px] md:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-[16px] top-[50%] h-[16px] w-[16px] -translate-y-1/2 text-[color:var(--color-text-faint)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-minimal min-h-[44px] pl-[44px]"
              placeholder="Search name, SKF ID, parent or phone"
            />
          </div>
          <select
            value={branch}
            onChange={(event) => setBranch(event.target.value as BranchFilter)}
            className="input-minimal min-h-[44px]"
            aria-label="Branch filter"
          >
            {BRANCH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(event) => setMonth(Number.parseInt(event.target.value, 10))}
            className="input-minimal min-h-[44px]"
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
            className="tap-target grid place-items-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-text)] disabled:opacity-50"
            title="Refresh pending fees"
            aria-label="Refresh pending fees"
          >
            <RefreshCw className={`h-[16px] w-[16px] ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </section>

      {error ? (
        <div className="mb-[20px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
          <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {notice ? (
        <div className="mb-[20px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
          <CheckCircle2 className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="hud-panel overflow-hidden">
        <div className="border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
          <p className="eyebrow text-[color:var(--color-text-dim)]">{selectedMonthLabel}</p>
          <h2 className="mt-[4px] text-[15px] font-semibold text-[color:var(--color-text)]">
            {scope === "month" ? "Monthly ledger" : scope === "overdue" ? "Overdue ledger" : "Missing phone ledger"}
          </h2>
          <p className="mt-[4px] text-xs text-[color:var(--color-text-faint)]">Sorted by students with the highest overdue month count first.</p>
        </div>

        {loading ? (
          <div className="flex min-h-[288px] items-center justify-center">
            <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="flex min-h-[288px] flex-col items-center justify-center gap-[12px] p-[32px] text-center">
            <CheckCircle2 className="h-[44px] w-[44px] text-[color:var(--color-text-dim)]" />
            <p className="text-sm font-semibold text-[color:var(--color-text)]">No students in this ledger</p>
            <p className="text-sm text-[color:var(--color-text-dim)]">Change the scope, branch, or month filter to see another list.</p>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--color-hairline)]">
            {visibleStudents.map((student, index) => {
              const phone = phoneValue(student);
              const overdue = student.pendingMonths.some((due) => due.monthIndex < month);
              const noPhone = !cleanIndianPhone(phone);
              const dueAmount = scopeAmount(student, scope, month);
              const status: LedgerStatus = noPhone ? "neutral" : overdue ? "overdue" : "due";
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
                    <div className="flex items-center gap-[8px]">
                      <MessageCircle className="h-[16px] w-[16px] text-[color:var(--color-text-dim)]" aria-hidden="true" />
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
          <div className="grid gap-[8px] sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyMessage()}
              className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-sm text-[color:var(--color-text)]"
            >
              <Copy className="h-[16px] w-[16px]" />
              Copy
            </button>
            <button
              type="button"
              onClick={openWhatsApp}
              className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)]"
            >
              <MessageCircle className="h-[16px] w-[16px]" />
              Open WhatsApp
            </button>
          </div>
        }
      >
        {previewStudent ? (
          <div className="space-y-[16px] pt-[4px]">
            <div>
              <p className="text-[15px] font-semibold text-[color:var(--color-text)]">{studentName(previewStudent)}</p>
              <p className="font-mono text-[11px] text-[color:var(--color-text-dim)]">
                {previewStudent.id} · {previewStudent.branch} · {previewStudent.pendingMonths.length} pending month{previewStudent.pendingMonths.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap gap-[8px]">
              {telHref(previewStudent) ? (
                <a
                  href={telHref(previewStudent)}
                  className="tap-target inline-flex items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-xs text-[color:var(--color-text)]"
                >
                  <Phone className="h-[16px] w-[16px]" />
                  Call
                </a>
              ) : null}
              <Link
                href={`/students/${previewStudent.branch}/${encodeURIComponent(previewStudent.id)}`}
                className="tap-target inline-flex items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-xs text-[color:var(--color-text)]"
              >
                <ArrowRight className="h-[16px] w-[16px]" />
                Profile
              </Link>
            </div>

            <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
              <p className="mb-[8px] eyebrow text-[color:var(--color-text-dim)]">Select pending month</p>
              <div className="grid gap-[8px] sm:grid-cols-2">
                {previewStudent.pendingMonths.map((due) => {
                  const selected = due.monthIndex === previewDue?.monthIndex;
                  return (
                    <button
                      key={`${previewStudent.branch}-${previewStudent.id}-${due.monthIndex}`}
                      type="button"
                      onClick={() => setPreviewMonthIndex(due.monthIndex)}
                      className={`tap-target rounded-[var(--radius-row)] border px-[12px] py-[8px] text-left transition-colors ${
                        selected
                          ? "border-[color:var(--color-hairline)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
                          : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"
                      }`}
                    >
                      <span className="block text-xs font-semibold">{due.shortLabel}</span>
                      <span className={`mt-[4px] block numeric text-[14px] ${selected ? "text-[color:var(--color-accent-ink)]" : "text-[color:var(--color-text-dim)]"}`}>
                        {num(due.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {previewIssues.length ? (
              <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[12px] text-sm text-[color:var(--color-text)]">
                Unknown placeholders: {previewIssues.join(", ")}
              </div>
            ) : null}

            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[16px] text-sm leading-relaxed text-[color:var(--color-text)]">
              {previewMessage}
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
