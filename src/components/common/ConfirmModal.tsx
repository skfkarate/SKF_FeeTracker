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
    const timer = setTimeout(() => confirmRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  const confirmStyles =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white"
      : "bg-white hover:opacity-90 text-black";

  return (
    <Sheet
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost text-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`btn-primary text-sm ${confirmStyles} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 pt-1">
        {variant === "danger" ? (
          <span className="shrink-0 rounded-full bg-red-500/10 p-2">
            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </span>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
          {message}
        </p>
      </div>
    </Sheet>
  );
}