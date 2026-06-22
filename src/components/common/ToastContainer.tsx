"use client";

import { useToast } from "@/lib/use-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-300",
};

const ICON_COLORS = {
  success: "text-emerald-400",
  error: "text-red-400",
  info: "text-blue-400",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${COLORS[t.type]}`}
            style={{ animation: "toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          >
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${ICON_COLORS[t.type]}`} />
            <p className="text-sm font-medium leading-snug flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateX(24px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }`}</style>
    </div>
  );
}
