"use client";

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="aurora-panel flex flex-col items-center justify-center rounded-[var(--radius-card)] px-6 py-16 text-center select-none">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
        <Icon className="h-6 w-6 text-[color:var(--color-text-faint)]" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[color:var(--color-text)]">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-[color:var(--color-text-dim)]">{description}</p>
      {action ? (
        <button type="button" onClick={action.onClick} className="btn-primary mt-6 inline-flex items-center gap-2 text-sm">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
