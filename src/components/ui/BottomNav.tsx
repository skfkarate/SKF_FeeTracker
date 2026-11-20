"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { cx } from "@/lib/cx";
import { MORE_TILES, PRIMARY_TILES } from "@/lib/navigation";
import type { NavigationTile } from "@/lib/navigation";
import Sheet from "./Sheet";

function isActivePath(pathname: string | null, paths: string[]) {
  if (!pathname) return false;
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_TILES.some((item) => isActivePath(pathname, [item.href]));

  const renderPrimary = (tab: NavigationTile, compact: boolean) => {
    const Icon = tab.icon;
    const active = isActivePath(pathname, tab.match || [tab.href]);
    return (
      <Link
        key={tab.key}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "group relative flex flex-col items-center justify-center gap-[6px] transition-colors",
          compact ? "min-h-[64px] w-[56px] px-[2px]" : "min-h-[72px] flex-1 px-[2px]",
          active
            ? "text-[color:var(--accent-text)]"
            : "text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text-dim)]",
        )}
      >
        {active ? (
          <span aria-hidden="true" className="absolute top-[8px] h-[3px] w-[28px] rounded-full bg-[color:var(--accent-text)] shadow-[0_0_14px_rgba(79,227,182,0.35)]" />
        ) : null}
        <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
        <span className="text-[11px] font-semibold leading-none tracking-[0.01em]">{tab.label}</span>
      </Link>
    );
  };

  const renderMore = (compact: boolean) => (
    <button
      key="more"
      type="button"
      onClick={() => setMoreOpen(true)}
      aria-label="Open more destinations"
      aria-expanded={moreOpen}
      className={cx(
        "group relative flex flex-col items-center justify-center gap-[6px] transition-colors",
        compact ? "min-h-[64px] w-[56px] px-[2px]" : "min-h-[72px] flex-1 px-[2px]",
        moreActive || moreOpen
          ? "text-[color:var(--accent-text)]"
          : "text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text-dim)]",
      )}
    >
      {moreActive || moreOpen ? (
        <span aria-hidden="true" className="absolute top-[8px] h-[3px] w-[28px] rounded-full bg-[color:var(--accent-text)] shadow-[0_0_14px_rgba(79,227,182,0.35)]" />
      ) : null}
      <MoreHorizontal className="h-[19px] w-[19px]" aria-hidden="true" />
      <span className="text-[11px] font-semibold leading-none tracking-[0.01em]">More</span>
    </button>
  );

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="safe-bottom fixed inset-x-[0px] bottom-[0px] z-40 border-t border-[color:var(--color-hairline)] bg-[color:var(--color-base)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {PRIMARY_TILES.map((tab) => renderPrimary(tab, false))}
          {renderMore(false)}
        </div>
      </nav>

      <nav
        aria-label="Primary navigation"
        className="fixed bottom-[0px] left-[0px] top-[68px] z-40 hidden w-[72px] flex-col items-center gap-[8px] border-r border-[color:var(--color-hairline)] bg-[color:var(--color-base)] py-[16px] backdrop-blur-xl md:flex"
      >
        {PRIMARY_TILES.map((tab) => renderPrimary(tab, true))}
        {renderMore(true)}
      </nav>

      <Sheet open={moreOpen} title="More destinations" onClose={() => setMoreOpen(false)}>
        <div className="grid gap-[8px]">
          {MORE_TILES.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, [item.href]);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cx(
                  "hud-row flex min-h-[64px] items-center gap-[12px] px-[16px] text-left transition-colors hover:bg-[color:var(--color-panel-strong)]",
                  active && "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)]",
                )}
              >
                <span
                  className={cx(
                    "grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[var(--radius-row)] border",
                    active
                      ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] text-[color:var(--color-accent)]"
                      : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-faint)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-[0px] flex-1">
                  <span className="block truncate text-sm font-semibold text-[color:var(--color-text)]">{item.label}</span>
                  <span className="mt-[2px] block truncate text-xs text-[color:var(--color-text-faint)]">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
