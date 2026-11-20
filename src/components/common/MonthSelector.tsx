"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { getCurrentFeeYear } from "@/lib/fee-year";

interface MonthSelectorProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  year?: number;
  className?: string;
  compact?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthSelector({
  selectedMonth,
  onMonthChange,
  year = getCurrentFeeYear(),
  className = "",
  compact = false,
}: MonthSelectorProps) {
  const now = new Date();
  const maxMonth = year === now.getFullYear() ? Math.min(11, now.getMonth() + 1) : 11;

  return (
    <div className={`surface-glass flex items-center justify-between rounded-[var(--radius-card)] ${compact ? "p-[4px]" : "p-[8px]"} ${className}`}>
      <button
        type="button"
        onClick={() => onMonthChange(selectedMonth - 1)}
        disabled={selectedMonth <= 0}
        className="tap-target grid place-items-center rounded-[var(--radius-row)] text-[color:var(--color-text-dim)] transition-colors hover:bg-[color:var(--color-glass-hover)] hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-[20px] w-[20px]" aria-hidden="true" />
      </button>

      <div className={`flex h-[44px] flex-1 items-center justify-center overflow-hidden px-[8px] ${compact ? "min-w-[72px]" : "min-w-[112px]"}`}>
        <p key={selectedMonth} className={`animate-fade-in text-center font-display font-semibold uppercase leading-snug tracking-[0.02em] text-[color:var(--color-text)] ${compact ? "text-[13px]" : "text-base"}`}>
          {compact ? `${MONTHS[selectedMonth].slice(0, 3)} ${String(year).slice(-2)}` : MONTHS[selectedMonth]} {!compact ? <span className="ml-[6px] font-mono text-xs text-[color:var(--color-text-faint)]">{year}</span> : null}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onMonthChange(selectedMonth + 1)}
        disabled={selectedMonth >= maxMonth}
        className="tap-target grid place-items-center rounded-[var(--radius-row)] text-[color:var(--color-text-dim)] transition-colors hover:bg-[color:var(--color-glass-hover)] hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next month"
      >
        <ChevronRight className="h-[20px] w-[20px]" aria-hidden="true" />
      </button>
    </div>
  );
}
