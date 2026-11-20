"use client";

import type { ReactNode } from "react";

export function Chip({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${
        selected
          ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
          : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)]"
      }`}
    >
      {children}
    </button>
  );
}
