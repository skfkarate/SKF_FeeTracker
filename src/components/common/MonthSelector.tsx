"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { getCurrentFeeYear } from "@/lib/fee-year";

interface MonthSelectorProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  year?: number;
  className?: string;
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
}: MonthSelectorProps) {
  const now = new Date();
  const maxMonth = year === now.getFullYear() ? Math.min(11, now.getMonth() + 1) : 11;

  return (
    <div className={`surface-glass flex items-center justify-between rounded-[var(--radius-card)] p-2 ${className}`}>
      <button
        type="button"
        onClick={() => onMonthChange(selectedMonth - 1)}
        disabled={selectedMonth <= 0}
        className="tap-target grid place-items-center rounded-[var(--radius-row)] text-[color:var(--color-text-dim)] transition-colors hover:bg-[color:var(--color-glass-hover)] hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="h-11 min-w-[112px] flex-1 overflow-hidden px-2">
        <p key={selectedMonth} className="animate-fade-in text-center font-display text-base font-semibold uppercase tracking-[0.02em] text-[color:var(--color-text)]">
          {MONTHS[selectedMonth]} <span className="ml-1.5 font-mono text-xs text-[color:var(--color-text-faint)]">{year}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => onMonthChange(selectedMonth + 1)}
        disabled={selectedMonth >= maxMonth}
        className="tap-target grid place-items-center rounded-[var(--radius-row)] text-[color:var(--color-text-dim)] transition-colors hover:bg-[color:var(--color-glass-hover)] hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
