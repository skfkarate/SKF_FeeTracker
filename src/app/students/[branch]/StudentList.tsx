"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  Gift,

  IndianRupee,
  Target,
  TrendingDown,
  Search,
  Filter,
  Download,
  ExternalLink,
  Award,

  CheckCircle2,
  Clock,
  AlertCircle,
  Ticket,
  Shirt,
  Phone,
  MessageCircle,
  RotateCcw,
  X,
  ChevronDown,
} from "lucide-react";

import {
  getStudents,
  markPaid,
  markBreak,
  markDiscontinued,
  getStudentAvailableCredits,
  markPaidWithCredit,
  markEventFeePaid,
  approvePaymentVerification,
  Student,
  StudentCredits,
  EventStudentDue,
  markNonRecurringFeePaid,
  resumeStudent,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { normalizeFeeYear } from "@/lib/fee-year";
import { getBlackBeltOverride } from "@/lib/temporary-black-belt-override";
import { useToast } from "@/lib/use-toast";
import { SkeletonTable } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchX } from "lucide-react";

import MonthlyFeeReceipt from "@/components/receipts/MonthlyFeeReceipt";
import AccountMenu from "@/components/common/AccountMenu";
import GlobalSearch from "@/components/common/GlobalSearch";
import MonthSelector from "@/components/common/MonthSelector";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import { avatarTintStyle, initials, normalizeProfilePhotoUrl } from "@/lib/profile-photo";

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

const normalizeStudentStatus = (status?: string | null) =>
  status?.trim().toLowerCase() ?? "";

const isBreakStudent = (student: Student) =>
  normalizeStudentStatus(student.monthStatus) === "break" ||
  normalizeStudentStatus(student.status) === "break";

const isDiscontinuedStudent = (student: Student) =>
  normalizeStudentStatus(student.monthStatus) === "discontinued" ||
  normalizeStudentStatus(student.status) === "discontinued";

const isFeeActiveStudent = (student: Student) =>
  normalizeStudentStatus(student.status) === "active" &&
  !isBreakStudent(student) &&
  !isDiscontinuedStudent(student);

const isUncollectedStudent = (student: Student) => {
  const status = normalizeStudentStatus(student.monthStatus);
  return status === "pending" || status === "pending verification";
};

const isHiddenFromStudentList = (student: Student) =>
  normalizeStudentStatus(student.monthStatus) === "n/a" ||
  normalizeStudentStatus(student.status) === "waived";

const isLocalPublicUrl = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::|\/|$)/i.test(value);

export default function StudentList({ branch }: { branch: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  // branch is passed as prop, so no state needed for it, but we used it in logic.
  // Actually, let's keep it simple. It's passed as prop.

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [confirmStudent, setConfirmStudent] = useState<Student | null>(null);

  // Referral credit state for payment modal
  const [studentCredits, setStudentCredits] = useState<StudentCredits | null>(
    null,
  );
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);

  // Receipt Modal
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [nonRecurringReceipt, setNonRecurringReceipt] = useState<{
    receiptId: string;
    studentName: string;
    type: "Admission" | "Dress";
  } | null>(null);

  // Long-press menu state
  const [longPressStudent, setLongPressStudent] = useState<Student | null>(
    null,
  );
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Break/Discontinued confirmation state
  const [confirmBreakStudent, setConfirmBreakStudent] =
    useState<Student | null>(null);
  const [confirmDiscontinuedStudent, setConfirmDiscontinuedStudent] =
    useState<Student | null>(null);
  const [confirmResumeStudent, setConfirmResumeStudent] =
    useState<Student | null>(null);

  // New Fee Payment Confirmation
  const [confirmFeePayment, setConfirmFeePayment] = useState<{
    student: Student;
    type: "Admission" | "Dress";
  } | null>(null);

  // Belt Exam Approval modal
  const [confirmBeltExam, setConfirmBeltExam] = useState<{
    student: Student;
    due: EventStudentDue;
  } | null>(null);

  const [markingStatus, setMarkingStatus] = useState<string | null>(null);

  // Detail Modal
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const month = parseInt(
    searchParams.get("month") || new Date().getMonth().toString(),
  );
  const selectedYear = normalizeFeeYear(searchParams.get("year"));

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const selectedMonthName = MONTH_NAMES[month] || '';

  // Track previous month to detect actual month changes (for cache invalidation)
  const prevPeriodRef = useRef(`${selectedYear}-${month}`);

  const loadStudents = useCallback(async (forceRefresh = false) => {
    if (!branch || !user || checking) return;
    setLoading(true);
    setError("");
    try {
      const data = await getStudents(branch, month, forceRefresh, selectedYear);
      const overridden = data.map((s) => {
        const override = getBlackBeltOverride(s.id, month, selectedYear);
        if (override) {
          return { ...s, fee: override.fee, isExamInstallment: override.isExamInstallment };
        }
        return s;
      });
      setStudents(overridden);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [branch, checking, month, selectedYear, user]);

  // Force-refresh when month changes to prevent stale data from wrong month
  useEffect(() => {
    if (!user || checking) return;
    let cancelled = false;
    const periodKey = `${selectedYear}-${month}`;
    const periodChanged = prevPeriodRef.current !== periodKey;
    prevPeriodRef.current = periodKey;
    (async () => {
      if (cancelled) return;
      await loadStudents(periodChanged);
    })();
    return () => { cancelled = true; };
  }, [checking, loadStudents, month, selectedYear, user]);

  // Stats calculation - exclude Break and Discontinued from pending
  const stats = useMemo(() => {
    const active = students.filter(isFeeActiveStudent);
    const paid = active.filter((s) => s.monthStatus === "Paid");
    const pending = active.filter(isUncollectedStudent);
    const onBreak = students.filter(isBreakStudent);
    const discontinued = students.filter(isDiscontinuedStudent);
    return {
      totalStudents: active.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      onBreakCount: onBreak.length,
      discontinuedCount: discontinued.length,
      expectedAmount: active.reduce((sum, s) => sum + (s.fee || 0), 0),
      collectedAmount: paid.reduce((sum, s) => sum + (s.fee || 0), 0),
      pendingAmount: pending.reduce((sum, s) => sum + (s.fee || 0), 0),
      collectionRate:
        active.length > 0
          ? Math.round((paid.length / active.length) * 100)
          : 0,
    };
  }, [students]);

  const handleBeltExamClick = (e: React.MouseEvent, student: Student, due: EventStudentDue) => {
    e.stopPropagation();
    setConfirmBeltExam({ student, due });
  };

  const handleApproveBeltExam = async () => {
    if (!confirmBeltExam) return;
    const { student, due } = confirmBeltExam;
    setMarkingPaid(student.id);
    setConfirmBeltExam(null);
    try {
      if (due.status === "pending_verification" && due.proofId) {
        await approvePaymentVerification(due.proofId);
      } else {
        await markEventFeePaid(student.id, branch, due.feeType, due.id, month, selectedYear);
      }
      toast(`${due.label || "Fee"} payment approved`, "success");
      await loadStudents(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to approve payment", "error");
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleMarkPaidClick = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setConfirmStudent(student);
    setStudentCredits(null);
    setSelectedCreditId(null);
    setLoadingCredits(true);
    try {
      const credits = await getStudentAvailableCredits(student.id, branch);
      setStudentCredits(credits);
      // Auto-select first credit if available
      if (credits.credits.length > 0) {
        setSelectedCreditId(credits.credits[0].id);
      }
    } catch {
      // No credits or error - continue without
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!confirmStudent) return;
    setMarkingPaid(confirmStudent.id);
    setConfirmStudent(null);
    try {
      let paymentResult: { receiptId?: string | null } | undefined;
      const appliedCredit =
        selectedCreditId && studentCredits
          ? Math.min(confirmStudent.fee, studentCredits.totalAvailable)
          : 0;
      if (selectedCreditId) {
        paymentResult = await markPaidWithCredit(
          confirmStudent.id,
          branch,
          month,
          selectedCreditId,
          selectedYear,
        );
      } else {
        paymentResult = await markPaid(confirmStudent.id, branch, month, selectedYear);
      }
      const paidStudent = {
        ...confirmStudent,
        paid: true,
        monthStatus: "Paid" as const,
        receiptId: paymentResult?.receiptId || confirmStudent.receiptId || null,
        originalFee:
          appliedCredit > 0
            ? confirmStudent.originalFee ?? confirmStudent.fee
            : confirmStudent.originalFee,
        creditApplied: appliedCredit || confirmStudent.creditApplied,
      };
      setStudents((prev) =>
        prev.map((s) =>
          s.id === confirmStudent.id
            ? paidStudent
            : s,
        ),
      );

      toast(`${confirmStudent.name} marked as paid`, "success");

      // Auto-show receipt if it isn't an exam installment
      if (!paidStudent.isExamInstallment) {
        setReceiptStudent(paidStudent);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to mark as paid", "error");
    } finally {
      setMarkingPaid(null);
      setSelectedCreditId(null);
      setStudentCredits(null);
    }
  };

  // Long-press handlers
  const handleLongPressStart = (student: Student) => {
    isLongPressActive.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setLongPressStudent(student);
      setShowStatusMenu(true);
    }, 600); // 600ms is standard for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => {
      isLongPressActive.current = false;
    }, 100);
  };

  const handleBreakClick = () => {
    setShowStatusMenu(false);
    setConfirmBreakStudent(longPressStudent);
  };

  const handleDiscontinuedClick = () => {
    setShowStatusMenu(false);
    setConfirmDiscontinuedStudent(longPressStudent);
  };

  const handleResumeClick = () => {
    setShowStatusMenu(false);
    setConfirmResumeStudent(longPressStudent);
  };

  const handleConfirmBreak = async () => {
    if (!confirmBreakStudent) return;
    setMarkingStatus(confirmBreakStudent.id);
    setConfirmBreakStudent(null);
    try {
      await markBreak(confirmBreakStudent.id, branch, month, selectedYear);
      toast(`${confirmBreakStudent.name} marked as break`, "success");
      setStudents((prev) =>
        prev.map((s) =>
          s.id === confirmBreakStudent.id
            ? { ...s, paid: false, monthStatus: "Break" as const }
            : s,
        ),
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to mark as break", "error");
    } finally {
      setMarkingStatus(null);
    }
  };

  const handleConfirmDiscontinued = async () => {
    if (!confirmDiscontinuedStudent) return;
    setMarkingStatus(confirmDiscontinuedStudent.id);
    setConfirmDiscontinuedStudent(null);
    try {
      await markDiscontinued(confirmDiscontinuedStudent.id, branch, month, selectedYear);
      toast(`${confirmDiscontinuedStudent.name} marked as discontinued`, "success");
      setStudents((prev) =>
        prev.map((s) =>
          s.id === confirmDiscontinuedStudent.id
            ? { ...s, paid: false, monthStatus: "Discontinued" as const }
            : s,
        ),
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to mark as discontinued", "error");
    } finally {
      setMarkingStatus(null);
    }
  };

  const handleConfirmResume = async () => {
    if (!confirmResumeStudent) return;
    setMarkingStatus(confirmResumeStudent.id);
    setConfirmResumeStudent(null);
    try {
      await resumeStudent(
        confirmResumeStudent.id,
        branch,
        month,
        selectedYear,
        confirmResumeStudent.originalFee || confirmResumeStudent.fee || undefined,
      );
      toast(`${confirmResumeStudent.name} resumed`, "success");
      await loadStudents(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to resume student", "error");
    } finally {
      setMarkingStatus(null);
    }
  };

  const handleMarkNonRecurringPaid = async () => {
    if (!confirmFeePayment) return;
    setMarkingStatus(confirmFeePayment.student.id);
    const { student, type } = confirmFeePayment;
    setConfirmFeePayment(null);

    try {
      const result = await markNonRecurringFeePaid(
        student.id,
        branch,
        type,
        month,
        selectedYear,
      );
      const receiptId = result.receiptId || null;
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === student.id) {
            if (type === "Admission") {
              return {
                ...s,
                admissionStatus: "Paid",
                admissionReceiptId: receiptId || s.admissionReceiptId || null,
              };
            }
            if (type === "Dress") {
              return {
                ...s,
                dressStatus: "Paid",
                dressReceiptId: receiptId || s.dressReceiptId || null,
              };
            }
          }
          return s;
        })
      );
      toast(`${student.name} ${type} fee marked as paid`, "success");
      if (receiptId) {
        setNonRecurringReceipt({
          receiptId,
          studentName: student.name,
          type,
        });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to mark as paid", "error");
    } finally {
      setMarkingStatus(null);
    }
  };



  const filteredStudents = students.filter((s) => {
    if (isHiddenFromStudentList(s)) return false;

    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchesPending =
      !showPendingOnly || (isUncollectedStudent(s) && isFeeActiveStudent(s));
    return matchesSearch && matchesPending;
  });

  // Split active, break, and discontinued students, then sort each group by SKF ID.
  const { activeStudents, breakStudents, discontinuedStudents } = useMemo(() => {
    const active: typeof filteredStudents = [];
    const onBreak: typeof filteredStudents = [];
    const discontinued: typeof filteredStudents = [];
    for (const s of filteredStudents) {
      if (isDiscontinuedStudent(s)) {
        discontinued.push(s);
      } else if (isBreakStudent(s)) {
        onBreak.push(s);
      } else {
        active.push(s);
      }
    }
    const sortById = (a: typeof filteredStudents[0], b: typeof filteredStudents[0]) => {
      const idCompare = a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
      if (idCompare !== 0) return idCompare;
      return a.name.localeCompare(b.name);
    };
    active.sort(sortById);
    onBreak.sort(sortById);
    discontinued.sort(sortById);
    return {
      activeStudents: active,
      breakStudents: onBreak,
      discontinuedStudents: discontinued,
    };
  }, [filteredStudents]);
  const visibleStudentsCount =
    activeStudents.length + breakStudents.length + discontinuedStudents.length;

  const branchName =
    branch === "MPSC" ? "MP SPORTS CLUB" : branch?.toUpperCase();
  const adminStudentsUrl = useMemo(() => {
    const configuredBase = process.env.NEXT_PUBLIC_SKF_KARATE_URL?.trim();
    const base =
      !configuredBase ||
      (process.env.NODE_ENV === "production" && isLocalPublicUrl(configuredBase))
        ? "https://www.skfkarate.org"
        : configuredBase;
    if (!base) return "";
    try {
      return new URL("/admin/students/new", base).toString();
    } catch {
      return "";
    }
  }, []);

  const renderStudentCard = (student: Student, index: number) => {
    const isBreak = isBreakStudent(student);
    const isDiscontinued = isDiscontinuedStudent(student);
    const isInactive = isBreak || isDiscontinued;
    const photoUrl = normalizeProfilePhotoUrl(student.photoUrl);
    const statusStyle = isDiscontinued
      ? {
        background: "var(--color-glass-hover)",
        borderColor: "var(--color-hairline)",
      }
      : {};

    return (
      <div
        key={student.id}
        onClick={() => {
          if (isLongPressActive.current) return;
          router.push(`/students/${branch}/${encodeURIComponent(student.id)}`);
        }}
        onMouseDown={() => handleLongPressStart(student)}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={() => handleLongPressStart(student)}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleLongPressEnd}
        className="card-panel p-[16px] animate-slide-up hover:border-[color:var(--color-hairline)] group cursor-pointer select-none"
        style={{ ...statusStyle, animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: "both", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      >
        <div className="flex items-start justify-between gap-[12px]">
          <div className="flex min-w-[0px] flex-1 items-start gap-[12px]">
            <div className="relative h-[44px] w-[44px] flex-shrink-0 overflow-hidden rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold" style={avatarTintStyle(student.name)}>
                  {initials(student.name)}
                </div>
              )}
            </div>
            <div className="min-w-[0px] flex-1">
            <div className="flex items-center gap-[8px] mb-[4px]">
              <h3 className={`font-sans text-base tracking-wide transition-colors truncate ${
                isBreak
                  ? "text-[color:var(--color-text)] group-hover:text-[color:var(--color-text)]"
                  : "text-[color:var(--color-text)] group-hover:text-[color:var(--color-text-dim)]"
              }`}>
                {student.name}
              </h3>
              {/* Status Tags */}
              {isBreak && (
                <span className="text-[10px] px-[6px] py-[2px] rounded border border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] uppercase tracking-wider">Break</span>
              )}
              {isDiscontinued && (
                <span className="text-[10px] px-[6px] py-[2px] rounded border border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] uppercase tracking-wider">Discontinued</span>
              )}
            </div>

            <div className="flex items-center gap-[8px] text-[color:var(--color-text-dim)] text-xs">
              <span className="font-mono opacity-70">{student.id}</span>
              <span className="flex items-center gap-[4px]">
                <IndianRupee className="w-[12px] h-[12px]" /> {student.fee}
                {student.isExamInstallment && (
                  <span className="ml-[4px] text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-widest border border-[color:var(--color-due-border)] bg-[color:var(--color-well)] px-[6px] py-[2px] rounded">Exam Installment</span>
                )}
              </span>
            </div>

            {(student.creditApplied || 0) > 0 && (
              <div className="mt-[8px] inline-flex items-center gap-[6px] text-[10px] bg-[color:var(--color-well)] text-[color:var(--color-text)] px-[8px] py-[4px] rounded-md border border-[color:var(--color-accent-border)]">
                <Gift className="w-[12px] h-[12px]" />
                <span>Credit Applied: ₹{student.creditApplied}</span>
              </div>
            )}

            {/* Pending Admission/Dress/Event Badges */}
            {(student.admissionStatus === "Pending" || student.dressStatus === "Pending" || (student.eventDues || []).some((due) => due.status !== "paid" && due.status !== "waived")) && (
              <div className="mt-[8px] flex gap-[8px] flex-wrap">
                {student.admissionStatus === "Pending" && (
                  <div className="inline-flex items-center gap-[6px] text-[10px] bg-[color:var(--color-well)] text-[color:var(--color-text)] px-[8px] py-[4px] rounded-md border border-[color:var(--color-accent-border)]">
                    <Ticket className="w-[12px] h-[12px]" />
                    <span>Adm Due</span>
                  </div>
                )}
                {student.dressStatus === "Pending" && (
                  <div className="inline-flex items-center gap-[6px] text-[10px] bg-[color:var(--color-well)] text-[color:var(--color-text)] px-[8px] py-[4px] rounded-md border border-[color:var(--color-accent-border)]">
                    <Shirt className="w-[12px] h-[12px]" />
                    <span>Dress Due</span>
                  </div>
                )}
                {(student.eventDues || [])
                  .filter((due) => due.status !== "paid" && due.status !== "waived")
                  .slice(0, 2)
                  .map((due) => (
                    <div key={due.id || due.label} className="inline-flex items-center gap-[6px] text-[10px] bg-[color:var(--color-well)] text-[color:var(--color-text)] px-[8px] py-[4px] rounded-md border border-[color:var(--color-due-border)]">
                      <Ticket className="w-[12px] h-[12px]" />
                      <span>{due.label || "Event Due"} ₹{due.amount}</span>
                    </div>
                  ))}
              </div>
            )}
            </div>
          </div>
          {/* Action Button */}
          <div className="flex-shrink-0 flex items-center gap-[8px]">
            {(student.eventDues || []).filter(d => d.status !== 'paid' && d.status !== 'waived' && (!d.month || d.month === selectedMonthName)).map((due) => (
              <button
                key={due.id}
                onClick={(e) => handleBeltExamClick(e, student, due)}
                disabled={markingPaid === student.id || markingStatus === student.id}
                className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all shadow-md ${due.status === 'pending_verification' ? 'border border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] shadow-[0_18px_45px_rgba(0,0,0,0.28)]' : 'border border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] shadow-[0_18px_45px_rgba(0,0,0,0.28)]'}`}
                title={due.status === 'pending_verification' ? `Verify ${due.label || 'Payment'}` : `Approve ${due.label || 'Payment'}`}
              >
                {markingPaid === student.id ? (
                  <div className="spinner !w-[16px] !h-[16px]" />
                ) : due.status === 'pending_verification' ? (
                  <Clock className="w-[16px] h-[16px]" />
                ) : due.feeType === 'belt_exam' ? (
                  <Award className="w-[16px] h-[16px]" />
                ) : (
                  <Ticket className="w-[16px] h-[16px]" />
                )}
              </button>
            ))}
            {student.monthStatus === "Paid" ? (
              student.isExamInstallment ? (
                <div
                  className="w-[44px] h-[44px] rounded-full bg-[color:var(--color-well)] flex items-center justify-center shadow-md shadow-[0_18px_45px_rgba(0,0,0,0.28)] cursor-default"
                  title="Installment Paid (No Receipt)"
                >
                  <svg className="w-[16px] h-[16px] text-[color:var(--color-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReceiptStudent(student);
                  }}
                  className="w-[44px] h-[44px] rounded-full bg-[color:var(--color-accent)] flex items-center justify-center text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-accent-strong)] transition-all shadow-md shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
                  title="View Receipt"
                >
                  <svg className="w-[16px] h-[16px] text-[color:var(--color-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )
            ) : student.monthStatus === "Pending Verification" ? (
              <Link href="/pending-fees" className="w-[44px] h-[44px] rounded-full bg-[color:var(--color-well)] border border-[color:var(--color-accent-border)] flex items-center justify-center text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] transition-colors" title="Payment proof waiting in notifications">
                <Clock className="w-[16px] h-[16px] animate-pulse" />
              </Link>
            ) : isInactive ? (
              <div className="w-[44px] h-[44px] rounded-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] flex items-center justify-center text-[color:var(--color-text-dim)]">
                <AlertCircle className="w-[16px] h-[16px]" />
              </div>
            ) : (
              <button
                onClick={(e) => handleMarkPaidClick(e, student)}
                disabled={
                  markingPaid === student.id ||
                  markingStatus === student.id
                }
                className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all select-none ${markingPaid === student.id || markingStatus === student.id
                  ? "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]"
                  : "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-panel-strong)] shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  }`}
                title="Mark Paid"
              >
                {markingPaid === student.id || markingStatus === student.id ? (
                  <div className="spinner !w-[16px] !h-[16px]" />
                ) : (
                  <IndianRupee className="w-[16px] h-[16px]" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Generate and download PDF receipt logic moved to MonthlyFeeReceipt.tsx
  if (checking || !user) return null;

  return (
    <PageShell
      hud={{
        title: branchName,
        monthLabel: `${MONTHS[month]} ${selectedYear}`,
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
      <div className="mb-[20px] flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between md:mb-[24px]">
        <p className="text-[13px] leading-relaxed text-[color:var(--color-text-dim)]">
          {stats.paidCount}/{stats.totalStudents} paid this month
        </p>
        <MonthSelector
          selectedMonth={month}
          year={selectedYear}
          onMonthChange={(m: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("month", m.toString());
            params.set("year", String(selectedYear));
            router.push(`/students/${branch}?${params.toString()}`);
          }}
          className="w-full sm:w-[220px]"
        />
      </div>
        {/* Stats Dashboard */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[24px] animate-fade-in">
            {/* Expected */}
            <div className="card-panel p-[16px] relative overflow-hidden group">
              <div className="absolute top-[0px] right-[0px] p-[8px] opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
              </div>
              <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-[8px] flex items-center gap-[6px] font-semibold">
                <Target className="w-[12px] h-[12px] text-[color:var(--color-text-dim)]" /> Expected
              </p>
              <p className="font-sans text-xl sm:text-2xl text-[color:var(--color-text)] font-medium tracking-tight">
                <span className="text-[color:var(--color-text-dim)] mr-[4px]">₹</span>{stats.expectedAmount.toLocaleString()}
              </p>
            </div>

            {/* Collected */}
            <div className="card-panel p-[16px] relative overflow-hidden group border-[color:var(--color-paid-border)] bg-[color:var(--color-well)]">
              <div className="absolute top-[0px] right-[0px] p-[8px] opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
              </div>
              <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-[8px] flex items-center gap-[6px] font-semibold">
                <CheckCircle2 className="w-[12px] h-[12px]" /> Collected
              </p>
              <p className="font-sans text-xl sm:text-2xl text-[color:var(--color-text-dim)] font-medium tracking-tight">
                <span className="text-[color:var(--color-text-dim)] mr-[4px]">₹</span>{stats.collectedAmount.toLocaleString()}
              </p>
            </div>

            {/* Pending */}
            <div className="card-panel p-[16px] relative overflow-hidden group border-[color:var(--color-due-border)] bg-[color:var(--color-well)]">
              <div className="absolute top-[0px] right-[0px] p-[8px] opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
              </div>
              <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-[8px] flex items-center gap-[6px] font-semibold">
                <Clock className="w-[12px] h-[12px]" /> Pending
              </p>
              <p className="font-sans text-xl sm:text-2xl text-[color:var(--color-text-dim)] font-medium tracking-tight">
                <span className="text-[color:var(--color-text-dim)] mr-[4px]">₹</span>{stats.pendingAmount.toLocaleString()}
              </p>
            </div>

            {/* Rate */}
            <div className="card-panel p-[16px] relative overflow-hidden group">
              <div className="absolute top-[0px] right-[0px] p-[8px] opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingDown className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
              </div>
              <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-[8px] flex items-center gap-[6px] font-semibold">
                <TrendingDown className="w-[12px] h-[12px] text-[color:var(--color-text-dim)]" /> Rate
              </p>
              <p
                className={`font-sans text-xl sm:text-2xl font-medium tracking-tight ${
                  stats.collectionRate >= 80
                    ? "text-[color:var(--color-text)]"
                    : stats.collectionRate >= 50
                    ? "text-[color:var(--color-text-dim)]"
                    : "text-[color:var(--color-text-dim)]"
                }`}
              >
                {stats.collectionRate}<span className="text-[color:var(--color-text-faint)] text-base ml-[2px]">%</span>
              </p>
            </div>
          </div>
        )}

        {!loading && !error && stats.onBreakCount > 0 && (
          <div className="mb-[24px] mt-[-12px] flex flex-wrap gap-[8px] text-[10px] uppercase tracking-wider text-[color:var(--color-text-dim)] animate-fade-in">
            <span className="rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[4px] text-[color:var(--color-text-dim)]">
              {stats.onBreakCount} break excluded
            </span>
          </div>
        )}

        {/* Search & Actions */}
        <div className="mb-[24px] space-y-[12px]">
          <div className="relative">
            <Search className="absolute left-[16px] top-[50%] -translate-y-1/2 w-[16px] h-[16px] text-[color:var(--color-text-dim)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="min-h-[44px] min-w-[0px] w-full max-w-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl py-[12px] pl-[44px] pr-[16px] text-[color:var(--color-text)] text-sm focus:outline-none focus:border-[color:var(--color-hairline)] transition-colors placeholder:text-[color:var(--color-text-dim)]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-[8px]">
            <button
              onClick={() => setShowPendingOnly(!showPendingOnly)}
              className={`flex-1 px-[16px] min-h-[44px] text-sm rounded-lg border transition-all duration-200 font-medium tracking-wide flex items-center justify-center gap-[8px] ${showPendingOnly
                ? "bg-[color:var(--color-well)] border-[color:var(--color-accent-border)] text-[color:var(--color-text-dim)]"
                : "bg-[color:var(--color-well)] border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)]"
                }`}
            >
              <Filter className="w-[12px] h-[12px]" />
              {showPendingOnly ? "Pending View" : "All Students"}
            </button>
            {adminStudentsUrl ? (
              <a
                href={adminStudentsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-[16px] min-h-[44px] text-sm rounded-lg border border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-accent-strong)] hover:text-[color:var(--color-accent-ink)] transition-all duration-200 font-medium tracking-wide flex items-center justify-center gap-[8px]"
              >
                <ExternalLink className="w-[12px] h-[12px]" />
                <span>Add in Admin</span>
              </a>
            ) : (
              <button
                disabled
                className="flex-1 px-[16px] min-h-[44px] text-sm rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] font-medium tracking-wide flex items-center justify-center gap-[8px] cursor-not-allowed"
                title="Student creation is managed in SKF-Karate admin."
              >
                <ExternalLink className="w-[12px] h-[12px]" />
                <span>Add in Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-[32px]">
            <SkeletonTable rows={8} cols={4} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-[64px]">
            <p className="text-[color:var(--color-text-dim)] mb-[16px] text-sm">{error}</p>
            <button
              onClick={() => loadStudents(true)}
              className="btn-primary text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Student List */}
        {!loading && !error && (
          <div className="space-y-[8px]">
            {visibleStudentsCount === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No students found"
                description={search.trim() ? `No results matching "${search}"` : "No students match the current filters"}
              />
            ) : (
              <>
                {activeStudents.map((student, index) => renderStudentCard(student, index))}
                {breakStudents.length > 0 && (
                  <div className={activeStudents.length > 0 ? "pt-[16px] space-y-[8px]" : "space-y-[8px]"}>
                    {breakStudents.map((student, index) =>
                      renderStudentCard(student, activeStudents.length + index),
                    )}
                  </div>
                )}

                {/* Discontinued Students Collapsible */}
                {discontinuedStudents.length > 0 && (
                  <div className="mt-[16px]">
                    <button
                      onClick={() => setShowDiscontinued((v) => !v)}
                      className="w-full flex items-center justify-between px-[16px] py-[12px] rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] hover:bg-[color:var(--color-well)] transition-colors text-sm"
                    >
                      <span className="flex items-center gap-[8px] text-[color:var(--color-text-dim)] font-medium">
                        <AlertCircle className="w-[16px] h-[16px]" />
                        Discontinued ({discontinuedStudents.length})
                      </span>
                      <ChevronDown className={`w-[16px] h-[16px] text-[color:var(--color-text-dim)] transition-transform duration-200 ${showDiscontinued ? "rotate-180" : ""}`} />
                    </button>
                    {showDiscontinued && (
                      <div className="space-y-[8px] mt-[8px]">
                        {discontinuedStudents.map((student, index) =>
                          renderStudentCard(student, activeStudents.length + breakStudents.length + index),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      {/* Confirm Payment Modal (Keep existing logic, just check styles if needed) */}
      {confirmStudent && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]">
          <div className="card-panel max-w-sm w-full p-[24px]">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center">
                CONFIRM PAYMENT
              </h2>
              <div className="surface-glass p-[16px] mb-[16px]">
                <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">Student</p>
                <p className="font-sans text-lg">
                  {confirmStudent.name}
                </p>
                <p className="text-[color:var(--color-text-dim)] text-xs font-mono">
                  {confirmStudent.id}
                </p>
                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">{confirmStudent.isExamInstallment ? "Black Belt Exam Installment" : "Original Fee"}</p>
                  <p className="text-xl font-bold text-[color:var(--color-text)]">
                    ₹{confirmStudent.fee}
                  </p>
                </div>

                {/* Referral Credit Section */}
                {loadingCredits ? (
                  <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                    <p className="text-[color:var(--color-text-dim)] text-sm">
                      Checking for credits...
                    </p>
                  </div>
                ) : studentCredits && studentCredits.credits.length > 0 ? (
                  <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-[8px]">
                      <div className="flex items-center gap-[8px] text-[color:var(--color-text-dim)] text-sm">
                        <Gift className="w-[12px] h-[12px]" /> Referral Credit Available
                      </div>
                      <label className="flex items-center gap-[8px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedCreditId}
                          onChange={(e) =>
                            setSelectedCreditId(
                              e.target.checked
                                ? studentCredits.credits[0].id
                                : null,
                            )
                          }
                          className="w-[16px] h-[16px] accent-[color:var(--color-accent)] rounded"
                        />
                        <span className="text-sm text-[color:var(--color-text-dim)]">Apply</span>
                      </label>
                    </div>
                    <p className="text-[color:var(--color-text-dim)] font-bold">
                      -₹{studentCredits.totalAvailable}
                    </p>
                    {studentCredits.credits[0].reason && (
                      <p className="text-[var(--text-muted)] text-xs mt-[4px]">
                        {studentCredits.credits[0].reason}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">Amount to Collect</p>
                  <p className="text-2xl font-bold text-[color:var(--color-text-dim)]">
                    ₹
                    {selectedCreditId && studentCredits
                      ? Math.max(
                        0,
                        confirmStudent.fee - studentCredits.totalAvailable,
                      )
                      : confirmStudent.fee}
                  </p>
                </div>
                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">Month</p>
                  <p className="text-[color:var(--color-text)]">{MONTHS[month]} {selectedYear}</p>
                </div>
              </div>
              <p className="text-[var(--text-secondary)] text-center text-sm mb-[16px]">
                {selectedCreditId && studentCredits
                  ? `Collect ₹${Math.max(0, confirmStudent.fee - studentCredits.totalAvailable)} (₹${studentCredits.totalAvailable} credit applied)`
                  : `Collect ₹${confirmStudent.fee}?`}
              </p>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => {
                    setConfirmStudent(null);
                    setSelectedCreditId(null);
                    setStudentCredits(null);
                  }}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmPaid}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors"
                >
                  ✓ CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Belt Exam Approval Modal */}
      {confirmBeltExam && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]">
          <div className="card-panel max-w-sm w-full p-[24px]">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center">
                {confirmBeltExam.due.status === 'pending_verification' ? 'VERIFY PAYMENT' : 'APPROVE PAYMENT'}
              </h2>
              <div className="surface-glass p-[16px] mb-[16px] space-y-[12px]">
                <div>
                  <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">Student</p>
                  <p className="font-sans text-lg">{confirmBeltExam.student.name}</p>
                  <p className="text-[color:var(--color-text-dim)] text-xs font-mono">{confirmBeltExam.student.id}</p>
                </div>
                <div className="pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">{confirmBeltExam.due.feeType === 'belt_exam' ? 'Belt Examination' : 'Fee'}</p>
                  <p className="text-[color:var(--color-text)] font-medium">{confirmBeltExam.due.label}</p>
                </div>
                <div className="pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">Amount</p>
                  <p className="text-xl font-bold text-[color:var(--color-text-dim)]">₹{confirmBeltExam.due.amount}</p>
                </div>
                <div className="pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">Status</p>
                  <p className="text-[color:var(--color-text)]">
                    {confirmBeltExam.due.status === 'pending_verification' ? 'Pending Verification (student submitted proof)' : 'Due - Awaiting Payment'}
                  </p>
                </div>
                {confirmBeltExam.due.dueDate && (
                  <div className="pt-[12px] border-t border-[var(--border)]">
                    <p className="text-[color:var(--color-text-dim)] text-xs mb-[4px]">Due Date</p>
                    <p className="text-[color:var(--color-text)]">{confirmBeltExam.due.dueDate}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setConfirmBeltExam(null)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                  disabled={markingPaid === confirmBeltExam.student.id}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleApproveBeltExam}
                  disabled={markingPaid === confirmBeltExam.student.id}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors flex items-center justify-center gap-[8px]"
                >
                  {markingPaid === confirmBeltExam.student.id ? (
                    <><div className="spinner !w-[16px] !h-[16px]" /> Approving...</>
                  ) : (
                    <>{confirmBeltExam.due.feeType === 'belt_exam' ? <Award className="w-[16px] h-[16px]" /> : <Ticket className="w-[16px] h-[16px]" />} APPROVE PAYMENT</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {detailStudent && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]" onClick={() => setDetailStudent(null)}>
          <div className="card-panel max-w-sm w-full p-[24px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-[24px]">
              <div className="flex min-w-[0px] items-center gap-[12px]">
                <div className="relative h-[48px] w-[48px] flex-shrink-0 overflow-hidden rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                  {normalizeProfilePhotoUrl(detailStudent.photoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeProfilePhotoUrl(detailStudent.photoUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold" style={avatarTintStyle(detailStudent.name)}>
                      {initials(detailStudent.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-[0px]">
                  <h2 className="truncate font-sans text-xl tracking-wider text-[color:var(--color-text)]">
                    {detailStudent.name}
                  </h2>
                  <p className="text-[var(--text-muted)] text-sm font-mono mt-[4px]">
                    {detailStudent.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="p-[8px] hover:bg-[color:var(--color-well)] rounded-full transition-colors"
              >
                <X className="w-[20px] h-[20px] text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="space-y-[16px]">
              {/* Contact Actions */}
              <div className="flex gap-[12px] mb-[24px]">
                <a
                  href={`tel:${String(detailStudent.phone || '')}`}
                  className="flex-1 py-[12px] bg-[color:var(--color-well)] border border-[color:var(--color-hairline-strong)] text-[color:var(--color-text-dim)] rounded-lg flex items-center justify-center gap-[8px] hover:bg-[color:var(--color-well)] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-[16px] h-[16px]" /> Call
                </a>
                <a
                  href={`https://wa.me/${String(detailStudent.whatsapp || detailStudent.phone || '').replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-[12px] bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] text-[color:var(--color-text)] rounded-lg flex items-center justify-center gap-[8px] hover:bg-[color:var(--color-well)] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-[16px] h-[16px]" /> WhatsApp
                </a>
              </div>

              <div className="surface-glass p-[16px] space-y-[12px]">
                <div className="flex justify-between border-b border-[color:var(--color-hairline)] pb-[8px]">
                  <span className="text-[var(--text-muted)] text-sm">Parent</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">{detailStudent.parentName || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[color:var(--color-hairline)] pb-[8px]">
                  <span className="text-[var(--text-muted)] text-sm">DOB</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">{detailStudent.dateOfBirth && detailStudent.dateOfBirth !== '' ? (() => { try { const d = new Date(detailStudent.dateOfBirth); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(); } catch { return '-'; } })() : "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[color:var(--color-hairline)] pb-[8px]">
                  <span className="text-[var(--text-muted)] text-sm">Join Month</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">{MONTHS[detailStudent.joinMonth] ?? '-'}</span>
                </div>
                <div className="flex justify-between border-b border-[color:var(--color-hairline)] pb-[8px]">
                  <span className="text-[var(--text-muted)] text-sm">Training Experience</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">{detailStudent.trainingExperience || "0m"}</span>
                </div>
                <div className="flex justify-between border-b border-[color:var(--color-hairline)] pb-[8px]">
                  <span className="text-[var(--text-muted)] text-sm">{detailStudent.isExamInstallment ? "Black Belt Exam Installment" : "Monthly Fee"}</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">₹{detailStudent.fee ?? 0}</span>
                </div>
                {(detailStudent.eventDues || []).length > 0 && (
                  <div className="border-b border-[color:var(--color-hairline)] pb-[8px]">
                    <span className="text-[var(--text-muted)] text-sm">Event Dues</span>
                    <div className="mt-[8px] space-y-[4px]">
                      {(detailStudent.eventDues || []).map((due) => (
                        <div key={due.id || due.label} className="flex justify-between gap-[12px] text-xs">
                          <span className="text-[color:var(--color-text-dim)] truncate">{due.label}</span>
                          <span className={due.status === "paid" ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text-dim)]"}>
                            ₹{due.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)] text-sm">Status</span>
                  <span className={`text-sm font-medium ${isDiscontinuedStudent(detailStudent)
                    ? "text-[color:var(--color-text-dim)]"
                    : isBreakStudent(detailStudent)
                      ? "text-[color:var(--color-text-dim)]"
                      : normalizeStudentStatus(detailStudent.status) === "active"
                        ? "text-[color:var(--color-text-dim)]"
                        : "text-[color:var(--color-text-dim)]"
                    }`}>
                    {isDiscontinuedStudent(detailStudent)
                      ? "Discontinued"
                      : isBreakStudent(detailStudent)
                        ? "Break"
                        : detailStudent.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Long Press Status Menu */}
      {showStatusMenu && longPressStudent && (
        <div
          className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]"
          onClick={() => setShowStatusMenu(false)}
        >
          <div
            className="glass-modal !max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider p-[16px] border-b border-[var(--border)]">
              {longPressStudent.name}
            </p>
            {!isBreakStudent(longPressStudent) && !isDiscontinuedStudent(longPressStudent) && (
              <button
                onClick={handleBreakClick}
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px]"
              >
                <span className="text-xl">⏸</span>
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    MARK AS BREAK
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    Student on leave this month
                  </p>
                </div>
              </button>
            )}

            {(isBreakStudent(longPressStudent) || isDiscontinuedStudent(longPressStudent)) && (
              <button
                onClick={handleResumeClick}
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px] border-t border-[var(--border)]"
              >
                <RotateCcw className="w-[20px] h-[20px]" />
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    RESUME BILLING
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    Rejoin from {MONTHS[month]} {selectedYear}
                  </p>
                </div>
              </button>
            )}

            {longPressStudent.admissionStatus === "Pending" && (
              <button
                onClick={() => {
                  setShowStatusMenu(false);
                  setConfirmFeePayment({ student: longPressStudent, type: "Admission" });
                }}
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px] border-t border-[var(--border)]"
              >
                <Ticket className="w-[20px] h-[20px]" />
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    MARK ADMISSION PAID
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    Collect ₹{longPressStudent.admissionFee || 0}
                  </p>
                </div>
              </button>
            )}

            {longPressStudent.dressStatus === "Pending" && (
              <button
                onClick={() => {
                  setShowStatusMenu(false);
                  setConfirmFeePayment({ student: longPressStudent, type: "Dress" });
                }}
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px] border-t border-[var(--border)]"
              >
                <Shirt className="w-[20px] h-[20px]" />
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    MARK DRESS PAID
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    Collect ₹{longPressStudent.dressFee || 0}
                  </p>
                </div>
              </button>
            )}

            {longPressStudent.admissionStatus === "Paid" && longPressStudent.admissionReceiptId && (
              <a
                href={`/api/feetrack/receipts/${encodeURIComponent(longPressStudent.admissionReceiptId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px] border-t border-[var(--border)]"
                onClick={() => setShowStatusMenu(false)}
              >
                <Download className="w-[20px] h-[20px]" />
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    ADMISSION RECEIPT
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    {longPressStudent.admissionReceiptId}
                  </p>
                </div>
              </a>
            )}

            {longPressStudent.dressStatus === "Paid" && longPressStudent.dressReceiptId && (
              <a
                href={`/api/feetrack/receipts/${encodeURIComponent(longPressStudent.dressReceiptId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px] border-t border-[var(--border)]"
                onClick={() => setShowStatusMenu(false)}
              >
                <Download className="w-[20px] h-[20px]" />
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    DRESS RECEIPT
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    {longPressStudent.dressReceiptId}
                  </p>
                </div>
              </a>
            )}

            {!isDiscontinuedStudent(longPressStudent) && (
              <button
                onClick={handleDiscontinuedClick}
                className="w-full text-left px-[16px] py-[16px] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] transition-colors flex items-center gap-[12px] border-t border-[var(--border)]"
              >
                <span className="text-xl">⛔</span>
                <div>
                  <p className="font-sans tracking-wider text-sm">
                    DISCONTINUED
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    Student left permanently
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Break Modal */}
      {confirmBreakStudent && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]">
          <div className="card-panel max-w-sm w-full p-[24px]">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center text-[color:var(--color-text-dim)]">
                MARK AS BREAK
              </h2>
              <div className="surface-glass p-[16px] mb-[24px]">
                <p className="text-[var(--text-muted)] text-xs mb-[4px]">Student</p>
                <p className="font-sans text-lg">
                  {confirmBreakStudent.name}
                </p>
                <p className="text-[var(--text-muted)] text-xs font-mono">
                  {confirmBreakStudent.id}
                </p>
                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">Month</p>
                  <p className="text-[color:var(--color-text)]">{MONTHS[month]} {selectedYear}</p>
                </div>
              </div>
              <p className="text-[var(--text-secondary)] text-center text-sm mb-[24px]">
                This student will not be counted in pending fees for this month.
              </p>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setConfirmBreakStudent(null)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmBreak}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors"
                >
                  ⏸ CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Discontinued Modal */}
      {confirmDiscontinuedStudent && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]">
          <div className="card-panel max-w-sm w-full p-[24px]">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center text-[color:var(--color-text-dim)]">
                MARK AS DISCONTINUED
              </h2>
              <div className="surface-glass p-[16px] mb-[24px]">
                <p className="text-[var(--text-muted)] text-xs mb-[4px]">Student</p>
                <p className="font-sans text-lg">
                  {confirmDiscontinuedStudent.name}
                </p>
                <p className="text-[var(--text-muted)] text-xs font-mono">
                  {confirmDiscontinuedStudent.id}
                </p>
                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">From Month</p>
                  <p className="text-[color:var(--color-text)]">{MONTHS[month]} {selectedYear}</p>
                </div>
              </div>
              <p className="text-[var(--text-secondary)] text-center text-sm mb-[24px]">
                This student will be marked as discontinued and moved to the
                bottom of the list.
              </p>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setConfirmDiscontinuedStudent(null)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmDiscontinued}
                  className="flex-1 py-[12px] bg-[color:var(--color-panel-strong)] text-[color:var(--color-text)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-panel-strong)] transition-colors"
                >
                  ⛔ CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Resume Modal */}
      {confirmResumeStudent && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]">
          <div className="card-panel max-w-sm w-full p-[24px]">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center text-[color:var(--color-text-dim)]">
                RESUME BILLING
              </h2>
              <div className="surface-glass p-[16px] mb-[24px]">
                <p className="text-[var(--text-muted)] text-xs mb-[4px]">Student</p>
                <p className="font-sans text-lg">
                  {confirmResumeStudent.name}
                </p>
                <p className="text-[var(--text-muted)] text-xs font-mono">
                  {confirmResumeStudent.id}
                </p>
                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">Resume From</p>
                  <p className="text-[color:var(--color-text)]">{MONTHS[month]} {selectedYear}</p>
                </div>
                <div className="mt-[12px] pt-[12px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">{confirmResumeStudent.isExamInstallment ? "Black Belt Exam Installment" : "Monthly Fee"}</p>
                  <p className="text-[color:var(--color-text)]">₹{confirmResumeStudent.originalFee || confirmResumeStudent.fee || 0}</p>
                </div>
              </div>
              <p className="text-[var(--text-secondary)] text-center text-sm mb-[24px]">
                Fee tracking will restart from this month. Earlier break or discontinued months stay excluded.
              </p>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setConfirmResumeStudent(null)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmResume}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors"
                >
                  RESUME
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {receiptStudent && (
        <MonthlyFeeReceipt
          student={receiptStudent}
          month={month}
          year={selectedYear}
          branch={branch}
          onClose={() => {
            setReceiptStudent(null);
          }}
        />
      )}
      {/* Confirm Fee Payment Modal */}
      {confirmFeePayment && (
        <div className="fixed inset-[0px] bg-[color:var(--color-well)] backdrop-blur-sm flex items-center justify-center z-[100] p-[16px]">
          <div className="card-panel max-w-sm w-full p-[24px]">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center">
                CONFIRM {confirmFeePayment.type.toUpperCase()} FEE
              </h2>
              <div className="surface-glass p-[16px] mb-[24px]">
                <p className="text-[var(--text-muted)] text-xs mb-[4px]">Student</p>
                <p className="font-sans text-lg">
                  {confirmFeePayment.student.name}
                </p>
                <div className="mt-[16px] pt-[16px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">Amount to Collect</p>
                  <p className="text-2xl font-bold text-[color:var(--color-text-dim)]">
                    ₹{confirmFeePayment.type === "Admission" ? confirmFeePayment.student.admissionFee : confirmFeePayment.student.dressFee}
                  </p>
                </div>
              </div>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setConfirmFeePayment(null)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleMarkNonRecurringPaid}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors"
                >
                  ✓ CONFIRM PAID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {nonRecurringReceipt && (
        <div className="glass-modal-overlay">
          <div className="glass-modal !max-w-sm">
            <div className="p-[24px]">
              <h2 className="font-sans text-xl tracking-wider mb-[16px] text-center text-[color:var(--color-text-dim)]">
                {nonRecurringReceipt.type.toUpperCase()} PAID
              </h2>
              <div className="glass-surface p-[16px] mb-[24px]">
                <p className="text-[var(--text-muted)] text-xs mb-[4px]">Student</p>
                <p className="font-sans text-lg">
                  {nonRecurringReceipt.studentName}
                </p>
                <div className="mt-[16px] pt-[16px] border-t border-[var(--border)]">
                  <p className="text-[var(--text-muted)] text-xs mb-[4px]">Receipt</p>
                  <p className="text-[color:var(--color-text)] text-sm font-mono break-all">
                    {nonRecurringReceipt.receiptId}
                  </p>
                </div>
              </div>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setNonRecurringReceipt(null)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CLOSE
                </button>
                <a
                  href={`/api/feetrack/receipts/${encodeURIComponent(nonRecurringReceipt.receiptId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors flex items-center justify-center gap-[8px]"
                >
                  <Download className="w-[16px] h-[16px]" />
                  RECEIPT
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageShell>
  );
}
