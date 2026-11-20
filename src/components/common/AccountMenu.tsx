"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

import {
  clearFeeTrackSessionStorage,
  getStoredFeeTrackUser,
} from "@/lib/client-auth";
import { getDisplayName } from "@/lib/display-name";

export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(() => getStoredFeeTrackUser());
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!user) return null;

  const displayName = getDisplayName(user);
  const initial = displayName.trim().charAt(0).toUpperCase() || "K";

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/feetrack/auth/logout", { method: "POST" }).catch(() => null);
    clearFeeTrackSessionStorage();
    setUser(null);
    router.replace("/");
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Account: ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="tap-target flex items-center gap-2 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-1.5 text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)] sm:px-2.5"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--color-accent)] font-semibold text-[13px] text-[color:var(--color-accent-ink)]">
          {initial}
        </span>
        <span className="hidden max-w-[96px] truncate text-xs font-semibold sm:block">{displayName}</span>
        <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(224px,calc(100vw-1.5rem))] rounded-[var(--radius-card)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-raised)] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl animate-slide-up"
        >
          <p className="eyebrow text-[color:var(--color-text-faint)]">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold text-[color:var(--color-text)]">{displayName}</p>
          <div className="my-3 h-px bg-[color:var(--color-hairline)]" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="tap-target flex w-full items-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-3 text-xs font-semibold text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)] disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {loggingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
