"use client";

import { useEffect, useState } from "react";
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
import { DRAWER_GROUPS, type NavigationTile } from "@/lib/navigation";

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
            className={`group relative flex min-h-[64px] items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-colors ${
                active
                    ? "border-white/25 bg-white text-black"
                    : "border-white/[0.07] bg-[#0b0b0b] text-zinc-300 hover:border-white/15 hover:bg-[#111111] hover:text-white"
            }`}
        >
            <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    active
                        ? "border-black/10 bg-black/10 text-black"
                        : `border-white/[0.07] bg-black text-zinc-500 ${tile.accent || "group-hover:text-white"}`
                }`}
            >
                <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{tile.title}</span>
                <span className={`mt-1 block truncate text-xs ${active ? "text-black/55" : "text-zinc-600"}`}>
                    {tile.description}
                </span>
            </span>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? "text-black/50" : "text-zinc-700 group-hover:text-white"}`} />
        </Link>
    );
}

function DashboardLink({
    active,
    onNavigate,
}: {
    active: boolean;
    onNavigate: () => void;
}) {
    return (
        <Link
            href="/dashboard"
            onClick={onNavigate}
            className={`group flex min-h-[60px] items-center gap-3 rounded-xl border px-3 transition-colors ${
                active
                    ? "border-white/25 bg-white text-black"
                    : "border-white/[0.08] bg-[#0b0b0b] text-zinc-200 hover:border-white/15 hover:bg-[#111111] hover:text-white"
            }`}
        >
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg border ${active ? "border-black/10 bg-black/10" : "border-white/[0.08] bg-black text-zinc-500 group-hover:text-white"}`}>
                <LayoutDashboard className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">Dashboard</span>
                <span className={`mt-1 block truncate text-xs ${active ? "text-black/55" : "text-zinc-600"}`}>
                    Collections, branches and priority work
                </span>
            </span>
            <ChevronRight className={`h-4 w-4 ${active ? "text-black/50" : "text-zinc-700 group-hover:text-white"}`} />
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
        <section className={`overflow-hidden rounded-2xl border transition-colors ${active ? "border-white/20 bg-white/[0.04]" : "border-white/[0.08] bg-[#070707]"}`}>
            <button
                type="button"
                onClick={onToggle}
                className={`flex min-h-[62px] w-full items-center gap-3 px-3 text-left transition-colors ${
                    active ? "text-white" : "text-zinc-200 hover:bg-white/[0.03] hover:text-white"
                }`}
                aria-expanded={expanded}
                aria-controls={submenuId}
            >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${active ? "border-white/20 bg-white/10 text-white" : "border-white/[0.08] bg-black text-zinc-500"}`}>
                    <GroupIcon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{title}</span>
                    <span className={`mt-1 block text-xs ${active ? "text-zinc-400" : "text-zinc-600"}`}>
                        {tiles.length} tool{tiles.length === 1 ? "" : "s"}
                    </span>
                </span>
                <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        expanded ? "rotate-90" : ""
                    } ${active ? "text-zinc-300" : "text-zinc-600"}`}
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

    return (
        <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-black/60 px-3 py-2 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold capitalize text-zinc-300">{user}</span>
            </div>

            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`group flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
                    open
                        ? "border-white/20 bg-white text-black"
                        : "border-white/[0.08] bg-zinc-950 text-zinc-300 hover:border-white/18 hover:bg-zinc-900 hover:text-white"
                }`}
                aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={open}
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black">
                    {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </span>
                <span className="hidden sm:inline">Menu</span>
            </button>

            {open ? (
                <>
                    <div
                        className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                    <aside
                        className="fixed bottom-2 left-2 right-2 top-2 z-[80] flex flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#050505]/98 shadow-2xl backdrop-blur-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:top-4 sm:w-[460px]"
                        aria-label="FeeTrack navigation"
                    >
                        <div className="flex min-h-16 items-center justify-between border-b border-white/[0.08] px-4 py-3">
                            <Link
                                href="/dashboard"
                                onClick={() => setOpen(false)}
                                className="group flex min-h-11 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-white/[0.04]"
                                aria-label="SKF dashboard"
                            >
                                <Image
                                    src="/logo.png"
                                    alt="SKF"
                                    width={28}
                                    height={28}
                                    priority
                                    className="rounded-full grayscale opacity-85 transition-all group-hover:grayscale-0 group-hover:opacity-100"
                                />
                                <span className="font-[family-name:var(--font-space)] text-sm font-semibold tracking-widest text-zinc-200">
                                    SKF<span className="text-zinc-600">.</span>
                                </span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black text-zinc-500 transition-colors hover:border-white/18 hover:text-white"
                                aria-label="Close navigation menu"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4" aria-label="FeeTrack sections">
                            <DashboardLink
                                active={isActivePath(pathname, "/dashboard")}
                                onNavigate={() => setOpen(false)}
                            />

                            {DRAWER_GROUPS.map((group) => {
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

                        <div className="border-t border-white/[0.08] p-3 sm:p-4">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-black px-3 text-sm font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </aside>
                </>
            ) : null}
        </div>
    );
}
