"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  HandCoins,
  Images,
  MoreHorizontal,
  Settings2,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cx } from "@/lib/cx";
import Sheet from "./Sheet";

type PrimaryTab = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match: string[];
};

type MoreItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const PRIMARY_TABS: PrimaryTab[] = [
  { key: "today", label: "Today", href: "/dashboard", icon: CalendarDays, match: ["/dashboard"] },
  {
    key: "fees",
    label: "Fees",
    href: "/pending-fees",
    icon: HandCoins,
    match: ["/pending-fees", "/students", "/messages", "/referrals"],
  },
  { key: "people", label: "People", href: "/admissions", icon: Users, match: ["/admissions", "/profile-photos"] },
  {
    key: "money",
    label: "Money",
    href: "/finances",
    icon: Wallet,
    match: ["/finances", "/development", "/analytics", "/custom"],
  },
];

const MORE_ITEMS: MoreItem[] = [
  { label: "Events", description: "Workflow, fees and results", href: "/events", icon: CalendarRange },
  { label: "Media", description: "Practice library and gallery", href: "/gallery", icon: Images },
  { label: "Shop", description: "Products and orders", href: "/shop", icon: ShoppingBag },
  { label: "Insights", description: "Website and practice analytics", href: "/website-analytics", icon: BarChart3 },
  { label: "Settings", description: "Timetable and branch config", href: "/timetable", icon: Settings2 },
  { label: "Custom Ops", description: "Year ledger and manual entries", href: "/custom", icon: Wallet },
];

function isActivePath(pathname: string | null, paths: string[]) {
  if (!pathname) return false;
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isActivePath(pathname, [item.href]));

  const renderPrimary = (tab: PrimaryTab, compact: boolean) => {
    const Icon = tab.icon;
    const active = isActivePath(pathname, tab.match);
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
          {PRIMARY_TABS.map((tab) => renderPrimary(tab, false))}
          {renderMore(false)}
        </div>
      </nav>

      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 left-0 top-16 z-40 hidden w-16 flex-col items-center gap-1 border-r border-[color:var(--color-hairline)] bg-black/95 py-4 backdrop-blur md:flex"
      >
        {PRIMARY_TABS.map((tab) => renderPrimary(tab, true))}
        {renderMore(true)}
      </nav>

      <Sheet open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        <div className="grid gap-2">
          {MORE_ITEMS.map((item) => {
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
