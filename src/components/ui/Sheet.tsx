import { useEffect, useRef, type ReactNode } from "react";
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 60);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-[0px] z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-[0px] bg-[color:var(--color-well)] backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[min(90dvh,780px)] w-full max-w-2xl flex-col rounded-t-[24px] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-raised)] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <div className="mx-auto mt-[10px] h-[4px] w-[40px] rounded-full bg-[color:var(--color-hairline-strong)]" aria-hidden="true" />
        <header className="flex min-h-[64px] items-center justify-between gap-[12px] px-[20px] pb-[8px] pt-[12px]">
          <h2 className="font-display text-[clamp(1.1rem,1rem+0.3vw,1.35rem)] text-[color:var(--color-text)]">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="tap-target grid place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-faint)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)]"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-[0px] flex-1 overflow-y-auto px-[20px] pb-[24px]">{children}</div>
        {footer ? (
          <div className="safe-bottom border-t border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[20px]">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
