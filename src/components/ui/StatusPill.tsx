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
  | "installment";

const STATUS_COLOR: Record<LedgerStatus, string> = {
  due: "var(--color-action)",
  paid: "var(--color-settled)",
  partial: "var(--color-action)",
  overdue: "var(--color-overdue)",
  break: "#a1a1aa",
  discontinued: "#71717a",
  credit: "var(--color-settled)",
  installment: "var(--color-action)",
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
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  };

  return (
    <span className={cx("inline-flex h-6 items-center rounded-[var(--radius-pill)] border px-2 font-pixel-label whitespace-nowrap", className)} style={style}>
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}