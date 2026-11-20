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
        className="absolute inset-0 bg-black/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-2xl rounded-t-[18px] border-t border-[color:var(--color-hairline)] bg-[#0a0a0a] shadow-[0_-12px_40px_rgba(0,0,0,0.5)]"
      >
        <header className="flex h-14 items-center justify-between px-4">
          <h2 className="font-pixel-label text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="tap-target grid place-items-center rounded-full text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">{children}</div>
        {footer ? <div className="border-t border-[color:var(--color-hairline)] p-4">{footer}</div> : null}
      </div>
      <div className="safe-bottom absolute inset-x-0 bottom-0 pointer-events-none" />
    </div>,
    document.body,
  );
}