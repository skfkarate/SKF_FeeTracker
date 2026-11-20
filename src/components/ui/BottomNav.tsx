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
          "relative flex flex-col items-center justify-center gap-1 transition-colors",
          compact ? "min-h-16 px-1" : "min-h-14 flex-1 px-1",
          active ? "text-white" : "text-zinc-500 hover:text-white",
        )}
      >
        {active ? <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-[color:var(--color-brand)]" /> : null}
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="font-pixel-label text-[9px]">{tab.label}</span>
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
        "relative flex flex-col items-center justify-center gap-1 transition-colors",
        compact ? "min-h-16 px-1" : "min-h-14 flex-1 px-1",
        moreActive || moreOpen ? "text-white" : "text-zinc-500 hover:text-white",
      )}
    >
      {moreActive || moreOpen ? <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-[color:var(--color-brand)]" /> : null}
      <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      <span className="font-pixel-label text-[9px]">More</span>
    </button>
  );

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-hairline)] bg-black/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          {PRIMARY_TILES.map((tab) => renderPrimary(tab, false))}
          {renderMore(false)}
        </div>
      </nav>

      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 left-0 top-16 z-40 hidden w-16 flex-col items-center gap-1 border-r border-[color:var(--color-hairline)] bg-black/95 py-4 backdrop-blur md:flex"
      >
        {PRIMARY_TILES.map((tab) => renderPrimary(tab, true))}
        {renderMore(true)}
      </nav>

      <Sheet open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        <div className="grid gap-2">
          {MORE_TILES.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, [item.href]);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cx(
                  "hud-row flex min-h-14 items-center gap-3 px-3 text-left transition-colors hover:bg-[#141414]",
                  active ? "border-white/25" : "",
                )}
              >
                <Icon className={cx("h-5 w-5 shrink-0", active ? "text-white" : "text-zinc-500")} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{item.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
