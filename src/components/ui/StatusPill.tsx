import type { CSSProperties } from "react";
import { AlertCircle, CheckCircle2, Clock, Contrast, MinusCircle } from "lucide-react";

import { cx } from "@/lib/cx";

export type LedgerStatus =
  | "due"
  | "paid"
  | "partial"
  | "overdue"
  | "break"
  | "neutral"
  | "discontinued"
  | "credit"
  | "installment"
  | "rejected"
  | "verifying";

const PAYMENT_STATUSES = new Set<LedgerStatus>([
  "due",
  "paid",
  "partial",
  "overdue",
  "credit",
  "installment",
]);

const STATUS_COLOR: Record<LedgerStatus, string> = {
  due: "var(--status-pending-text)",
  paid: "var(--status-paid-text)",
  partial: "var(--status-partial-text)",
  overdue: "var(--status-overdue-text)",
  break: "var(--status-neutral-text)",
  neutral: "var(--status-neutral-text)",
  discontinued: "var(--status-neutral-text)",
  credit: "var(--status-paid-text)",
  installment: "var(--status-pending-text)",
  rejected: "var(--status-overdue-text)",
  verifying: "var(--status-pending-text)",
};

const STATUS_BACKGROUND: Record<LedgerStatus, string> = {
  due: "var(--status-pending-fill)",
  paid: "var(--status-paid-fill)",
  partial: "var(--status-partial-fill)",
  overdue: "var(--status-overdue-fill)",
  break: "var(--status-neutral-fill)",
  neutral: "var(--status-neutral-fill)",
  discontinued: "var(--status-neutral-fill)",
  credit: "var(--status-paid-fill)",
  installment: "var(--status-pending-fill)",
  rejected: "var(--status-overdue-fill)",
  verifying: "var(--status-pending-fill)",
};

const STATUS_BORDER: Record<LedgerStatus, string> = {
  due: "var(--status-pending-outline)",
  paid: "var(--status-paid-outline)",
  partial: "var(--status-partial-outline)",
  overdue: "var(--status-overdue-outline)",
  break: "var(--status-neutral-outline)",
  neutral: "var(--status-neutral-outline)",
  discontinued: "var(--status-neutral-outline)",
  credit: "var(--status-paid-outline)",
  installment: "var(--status-pending-outline)",
  rejected: "var(--status-overdue-outline)",
  verifying: "var(--status-pending-outline)",
};

const STATUS_SOLID: Record<LedgerStatus, string> = {
  due: "var(--status-pending-solid)",
  paid: "var(--status-paid-solid)",
  partial: "var(--status-partial-solid)",
  overdue: "var(--status-overdue-solid)",
  break: "var(--status-neutral-solid)",
  neutral: "var(--status-neutral-solid)",
  discontinued: "var(--status-neutral-solid)",
  credit: "var(--status-paid-solid)",
  installment: "var(--status-pending-solid)",
  rejected: "var(--status-overdue-solid)",
  verifying: "var(--status-pending-solid)",
};

const STATUS_ICON = {
  due: Clock,
  paid: CheckCircle2,
  partial: Contrast,
  overdue: AlertCircle,
  credit: CheckCircle2,
  installment: Contrast,
  break: MinusCircle,
  neutral: MinusCircle,
  discontinued: MinusCircle,
  rejected: AlertCircle,
  verifying: Clock,
} as const;

const STATUS_LABEL: Record<LedgerStatus, string> = {
  due: "Due",
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  break: "Break",
  neutral: "Status",
  discontinued: "Stopped",
  credit: "Credit",
  installment: "Installment",
  rejected: "Rejected",
  verifying: "Verifying",
};

export function statusLabel(status: LedgerStatus): string {
  return STATUS_LABEL[status];
}

export function statusColor(status: LedgerStatus): string {
  return STATUS_COLOR[status];
}

export default function StatusPill({
  status,
  label,
  className,
  ariaLabel,
}: {
  status: LedgerStatus;
  label?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const style: CSSProperties = {
    color: STATUS_COLOR[status],
    borderColor: STATUS_BORDER[status],
    backgroundColor: STATUS_BACKGROUND[status],
  };
  const Icon = STATUS_ICON[status];
  const text = label ?? STATUS_LABEL[status];
  const kind = PAYMENT_STATUSES.has(status) ? "payment status" : "status";

  return (
    <span
      className={cx(
        "inline-flex h-[24px] items-center gap-[6px] rounded-[var(--radius-pill)] border px-[10px] text-[12px] font-medium leading-[16px] whitespace-nowrap",
        className,
      )}
      style={style}
      aria-label={ariaLabel ?? `${text} ${kind}`}
    >
      <span
        aria-hidden="true"
        className="hidden h-[6px] w-[6px] shrink-0 rounded-full min-[481px]:inline-block"
        style={{ backgroundColor: STATUS_SOLID[status] }}
      />
      <Icon
        aria-hidden="true"
        className="h-[13px] w-[13px] shrink-0 min-[481px]:hidden"
        style={{ color: STATUS_SOLID[status] }}
      />
      {text}
    </span>
  );
}
