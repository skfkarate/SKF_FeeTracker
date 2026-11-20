"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import {
  clearFeeTrackSessionStorage,
  getStoredFeeTrackUser,
} from "@/lib/client-auth";
import { getDisplayName } from "@/lib/display-name";
import { DESTINATION_GROUPS, type NavigationTile } from "@/lib/navigation";

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DrawerLink({ tile, active, onNavigate }: { tile: NavigationTile; active: boolean; onNavigate: () => void }) {
  const Icon = tile.icon;

  return (
    <Link
      href={tile.href}
      onClick={onNavigate}
      className={`group flex min-h-[60px] items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-colors ${
        active
          ? "border-[color:var(--color-paper)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)]"
          : "border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] text-[color:var(--color-text-dim)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--color-text)]"
      }`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
          active
            ? "border-black/10 bg-black/10 text-[color:var(--color-ink)]"
            : `border-[color:var(--color-hairline)] bg-[color:var(--color-base)] text-[color:var(--color-text-faint)] ${tile.accent || "group-hover:text-[color:var(--color-text)]"}`
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{tile.title}</span>
        <span className={`mt-0.5 block truncate text-xs ${active ? "text-black/60" : "text-[color:var(--color-text-faint)]"}`}>
          {tile.description}
        </span>
      </span>
      <ChevronRight className={`h-4 w-4 flex-shrink-0 ${active ? "text-black/45" : "text-[color:var(--color-text-faint)]"}`} />
    </Link>
  );
}

function DrawerGroup({
  title,
  tiles,
  expanded,
  active,
  onToggle,
  onNavigate,
  pathname,
}: {
  title: string;
  tiles: NavigationTile[];
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  pathname: string | null;
}) {
  const submenuId = `feetrack-menu-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const GroupIcon = tiles[0]?.icon || LayoutDashboard;

  return (
    <section className={`overflow-hidden rounded-2xl border transition-colors ${active ? "border-[color:var(--border-strong)] bg-[color:var(--color-raised)]" : "border-[color:var(--color-hairline)] bg-[color:var(--color-panel)]"}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-[62px] w-full items-center gap-3 px-3 text-left transition-colors ${
          active ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-raised)]"
        }`}
        aria-expanded={expanded}
        aria-controls={submenuId}
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-base)] text-[color:var(--color-text-faint)]">
          <GroupIcon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-[color:var(--color-text-faint)]">
            {tiles.length} destination{tiles.length === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          } text-[color:var(--color-text-faint)]`}
        />
      </button>
      <div
        id={submenuId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="grid gap-2 overflow-hidden px-2 pb-2">
          {tiles.map((tile) => (
            <DrawerLink
              key={tile.href}
              tile={tile}
              active={isActivePath(pathname, tile.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function NavMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [user] = useState<string | null>(() => getStoredFeeTrackUser());
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOpen(false);
      setExpandedGroups(new Set());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = async () => {
    await fetch("/api/feetrack/auth/logout", { method: "POST" }).catch(() => null);
    clearFeeTrackSessionStorage();
    router.replace("/");
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  if (!user) return null;

  const displayName = getDisplayName(user);
  const drawer = open ? (
    <>
      <div
        className="fixed inset-0 z-[100] bg-[rgba(5,8,6,0.8)] backdrop-blur-md"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="feetrack-navigation-drawer"
        className="fixed left-2 right-2 top-2 z-[110] flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--color-hairline)] bg-[color:var(--color-base)] shadow-2xl sm:left-auto sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[min(460px,calc(100vw-2rem))]"
        aria-label="FeeTrack navigation"
      >
        <div className="flex min-h-16 flex-shrink-0 items-center justify-between border-b border-[color:var(--color-hairline)] px-4 py-3">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="group flex min-h-11 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-[color:var(--color-raised)]"
            aria-label="SKF dashboard"
          >
            <Image
              src="/logo.png"
              alt="SKF"
              width={28}
              height={28}
              priority
              className="rounded-full opacity-90"
            />
            <span className="font-display text-[15px] tracking-wide text-[color:var(--color-text)]">
              SKF <span className="text-[color:var(--color-brand)]">Karate</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="tap-target grid flex-shrink-0 place-items-center rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] text-[color:var(--color-text-faint)] transition-colors hover:text-[color:var(--color-text)]"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4" aria-label="FeeTrack sections">
          {DESTINATION_GROUPS.map((group) => {
            const active = group.tiles.some((tile) => isActivePath(pathname, tile.href));
            const expanded = active || expandedGroups.has(group.title);
            return (
              <DrawerGroup
                key={group.title}
                title={group.title}
                tiles={group.tiles}
                active={active}
                expanded={expanded}
                onToggle={() => toggleGroup(group.title)}
                onNavigate={() => setOpen(false)}
                pathname={pathname}
              />
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-[color:var(--color-hairline)] p-3 sm:p-4">
          <p className="mb-2 px-1 text-[11px] text-[color:var(--color-text-faint)]">
            Signed in as <span className="font-semibold text-[color:var(--color-text-dim)]">{displayName}</span>
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-3 text-sm font-semibold text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--color-text)]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  ) : null;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-3 py-2 sm:flex">
        <span className="h-2 w-2 rounded-full bg-[color:var(--color-settled)]" />
        <span className="max-w-[140px] truncate text-xs font-semibold text-[color:var(--color-text-dim)]">{displayName}</span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
          open
            ? "border-[color:var(--color-paper)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)]"
            : "border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] text-[color:var(--color-text-dim)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--color-text)]"
        }`}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="feetrack-navigation-drawer"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-base)]">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </span>
        <span className="hidden sm:inline">Menu</span>
      </button>

      {typeof document !== "undefined" && drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}
