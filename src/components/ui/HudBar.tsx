import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";

import { cx } from "@/lib/cx";

export default function HudBar({
  title,
  monthLabel,
  branchLabel,
  backHref,
  onBranchClick,
  onSearchClick,
  actions,
  bell,
  account,
  className,
}: {
  title: string;
  monthLabel?: string;
  branchLabel?: string;
  backHref?: string;
  onBranchClick?: () => void;
  onSearchClick?: () => void;
  actions?: ReactNode;
  bell?: ReactNode;
  account?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cx(
        "sticky top-0 z-40 border-b border-[color:var(--color-hairline)] bg-[color:var(--color-base)]/92 backdrop-blur-xl",
        className,
      )}
    >
      <div className="content-shell flex min-h-16 items-center gap-2 py-2 sm:gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back to dashboard"
            className="tap-target grid shrink-0 place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] text-[color:var(--color-text-dim)] transition-colors hover:text-[color:var(--color-text)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-[clamp(1.05rem,0.98rem+0.35vw,1.35rem)] font-medium leading-tight text-[color:var(--color-text)]">
            {title}
          </h1>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {monthLabel ? (
              <span className="font-mono truncate text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-text-faint)] sm:text-[11px]">
                {monthLabel}
              </span>
            ) : null}
            {branchLabel ? (
              onBranchClick ? (
                <button
                  type="button"
                  onClick={onBranchClick}
                  className="tap-target inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-2.5 font-mono text-[10px] text-[color:var(--color-text)] sm:px-3 sm:text-[11px]"
                >
                  {branchLabel}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-2.5 py-1.5 font-mono text-[10px] text-[color:var(--color-text-dim)] sm:px-3 sm:text-[11px]">
                  {branchLabel}
                </span>
              )
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actions}
          {onSearchClick ? (
            <button
              type="button"
              onClick={onSearchClick}
              aria-label="Search"
              className="tap-target grid place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] text-[color:var(--color-text-dim)] transition-colors hover:text-[color:var(--color-text)]"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          {bell}
          {account}
        </div>
      </div>
    </header>
  );
}
