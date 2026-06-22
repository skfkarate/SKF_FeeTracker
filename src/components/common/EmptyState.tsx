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
    <div className="flex flex-col items-center justify-center py-20 px-6 select-none">
      <div className="mb-6 rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/[0.05]">
        <Icon className="h-10 w-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 text-center max-w-xs leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
