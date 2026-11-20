import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(6,9,7,0.76)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col rounded-t-[20px] border border-[color:var(--color-hairline)] bg-[color:var(--color-raised)] shadow-[0_-16px_48px_rgba(0,0,0,0.5)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[color:var(--color-hairline)]" aria-hidden="true" />
        <header className="flex min-h-14 items-center justify-between gap-3 px-4 pb-2 pt-3 sm:px-5">
          <h2 className="font-display text-[clamp(1.05rem,0.98rem+0.3vw,1.3rem)] text-[color:var(--color-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="tap-target grid place-items-center rounded-full text-[color:var(--color-text-faint)] transition-colors hover:text-[color:var(--color-text)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">{children}</div>
        {footer ? (
          <div className="border-t border-[color:var(--color-hairline)] p-4 sm:p-5 safe-bottom">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
