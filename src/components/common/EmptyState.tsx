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
    <div className="aurora-panel flex flex-col items-center justify-center rounded-[var(--radius-card)] px-[24px] py-[64px] text-center select-none">
      <div className="mb-[20px] grid h-[56px] w-[56px] place-items-center rounded-2xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
        <Icon className="h-[24px] w-[24px] text-[color:var(--color-text-faint)]" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[color:var(--color-text)]">{title}</h3>
      <p className="mt-[8px] max-w-xs text-sm leading-relaxed text-[color:var(--color-text-dim)]">{description}</p>
      {action ? (
        <button type="button" onClick={action.onClick} className="btn-primary mt-[24px] inline-flex items-center gap-[8px] text-sm">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
