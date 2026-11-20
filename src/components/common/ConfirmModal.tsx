"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

import Sheet from "@/components/ui/Sheet";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <Sheet
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-ghost text-sm">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 pt-1">
        {variant === "danger" ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--color-text-dim)]">{message}</p>
      </div>
    </Sheet>
  );
}
