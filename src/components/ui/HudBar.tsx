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
        "sticky top-[0px] z-40 border-b border-[color:var(--color-hairline)] bg-[color:var(--color-base)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="content-shell flex min-h-[68px] items-center gap-[10px] py-[10px] sm:gap-[12px]">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back to dashboard"
            className="tap-target grid shrink-0 place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)]"
          >
            <ArrowLeft className="h-[16px] w-[16px]" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="min-w-[0px] flex-1">
          <h1 className="font-display truncate text-[clamp(1.1rem,1rem+0.35vw,1.4rem)] leading-tight text-[color:var(--color-text)]">
            {title}
          </h1>
          <div className="mt-[4px] flex min-w-[0px] items-center gap-[8px]">
            {monthLabel ? (
              <span className="font-mono truncate text-[11px] uppercase tracking-[0.1em] text-[color:var(--color-text-faint)]">
                {monthLabel}
              </span>
            ) : null}
            {branchLabel ? (
              onBranchClick ? (
                <button
                  type="button"
                  onClick={onBranchClick}
                  className="tap-target inline-flex shrink-0 items-center gap-[6px] rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] font-mono text-[11px] text-[color:var(--color-text)] transition-colors hover:border-[color:var(--color-accent-border)]"
                >
                  {branchLabel}
                  <ChevronDown className="h-[12px] w-[12px]" aria-hidden="true" />
                </button>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[6px] font-mono text-[11px] text-[color:var(--color-text-dim)]">
                  {branchLabel}
                </span>
              )
            ) : null}
          </div>
        </div>

        <div className="flex min-w-[0px] shrink-0 items-center justify-end gap-[8px] sm:gap-[10px]">
          {actions}
          {onSearchClick ? (
            <button
              type="button"
              onClick={onSearchClick}
              aria-label="Search"
              className="tap-target grid place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)]"
            >
              <Search className="h-[16px] w-[16px]" aria-hidden="true" />
            </button>
          ) : null}
          {bell}
          {account}
        </div>
      </div>
    </header>
  );
}
