import type { CSSProperties } from "react";

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

const STATUS_COLOR: Record<LedgerStatus, string> = {
  due: "var(--color-due)",
  paid: "var(--color-paid)",
  partial: "var(--color-due)",
  overdue: "var(--color-overdue)",
  break: "var(--color-text-dim)",
  neutral: "var(--color-text-dim)",
  discontinued: "var(--color-text-faint)",
  credit: "var(--color-paid)",
  installment: "var(--color-due)",
  rejected: "var(--color-overdue)",
  verifying: "var(--color-due)",
};

const STATUS_BACKGROUND: Record<LedgerStatus, string> = {
  due: "var(--color-due-dim)",
  paid: "var(--color-paid-dim)",
  partial: "var(--color-due-dim)",
  overdue: "var(--color-overdue-dim)",
  break: "var(--color-glass-hover)",
  neutral: "var(--color-glass-hover)",
  discontinued: "var(--color-glass-hover)",
  credit: "var(--color-paid-dim)",
  installment: "var(--color-due-dim)",
  rejected: "var(--color-overdue-dim)",
  verifying: "var(--color-due-dim)",
};

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
    borderColor: "var(--color-hairline)",
    backgroundColor: STATUS_BACKGROUND[status],
  };

  return (
    <span
      className={cx(
        "inline-flex h-[24px] items-center rounded-[var(--radius-pill)] border px-[10px] text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap",
        className,
      )}
      style={style}
      aria-label={ariaLabel ?? `${label ?? STATUS_LABEL[status]} ${status === "neutral" ? "status" : "payment status"}`}
    >
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
