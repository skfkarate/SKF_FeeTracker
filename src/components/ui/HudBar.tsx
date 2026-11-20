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
        "sticky top-0 z-40 border-b border-[color:var(--color-hairline)] bg-black/90 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back to dashboard"
            className="tap-target grid shrink-0 place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[#0a0a0a] text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold text-white">{title}</h1>
          <div className="mt-1 flex items-center gap-2">
            {monthLabel ? <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400">{monthLabel}</span> : null}
            {branchLabel ? (
              onBranchClick ? (
                <button
                  type="button"
                  onClick={onBranchClick}
                  className="tap-target inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 font-pixel-label text-white"
                >
                  {branchLabel}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : (
                <span className="inline-flex items-center rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 py-2 font-pixel-label text-zinc-300">
                  {branchLabel}
                </span>
              )
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onSearchClick ? (
            <button
              type="button"
              onClick={onSearchClick}
              aria-label="Search"
              className="tap-target grid place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[#0a0a0a] text-zinc-300 transition-colors hover:text-white"
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