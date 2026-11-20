"use client";

import { useToast } from "@/lib/use-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-4 right-4 z-[200] flex flex-col gap-2.5 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px]">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-raised)] px-4 py-3 text-[color:var(--color-text)] shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl"
            style={{ animation: "aurora-toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-accent)]" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="tap-target grid shrink-0 place-items-center rounded-full text-[color:var(--color-text-faint)] transition-colors hover:text-[color:var(--color-text)]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes aurora-toast-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  );
}
