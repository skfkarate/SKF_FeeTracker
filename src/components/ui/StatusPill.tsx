import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

export type LedgerStatus =
  | "due"
  | "paid"
  | "partial"
  | "overdue"
  | "break"
  | "discontinued"
  | "credit"
  | "installment"
  | "rejected"
  | "verifying";

const STATUS_COLOR: Record<LedgerStatus, string> = {
  due: "var(--color-action)",
  paid: "var(--color-settled)",
  partial: "var(--color-action)",
  overdue: "var(--color-overdue)",
  break: "var(--color-text-dim)",
  discontinued: "var(--color-text-faint)",
  credit: "var(--color-settled)",
  installment: "var(--color-action)",
  rejected: "var(--color-overdue)",
  verifying: "var(--color-action)",
};

const STATUS_LABEL: Record<LedgerStatus, string> = {
  due: "Due",
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  break: "Break",
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
}: {
  status: LedgerStatus;
  label?: string;
  className?: string;
}) {
  const tint = STATUS_COLOR[status];
  const style: CSSProperties = {
    color: tint,
    borderColor: "var(--color-hairline)",
    backgroundColor: "rgba(244, 239, 227, 0.035)",
  };

  return (
    <span
      className={cx(
        "inline-flex h-6 items-center rounded-[var(--radius-pill)] border px-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap",
        className,
      )}
      style={style}
    >
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
