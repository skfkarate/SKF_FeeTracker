"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Gift,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Trophy,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  getEventCollections,
  getStudents,
  type EventCollectionItem,
  type Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import { POSTER_EVENTS } from "@/lib/reminder-calendar";

type TimelineKind = "event" | "birthday" | "poster";
type TimelineFilter = "upcoming" | "all" | TimelineKind;

type TimelineItem = {
  id: string;
  kind: TimelineKind;
  title: string;
  date: Date;
  dateKey: string;
  category: string;
  meta: string;
  detail: string;
  status: string;
  href?: string;
};

const FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
  { value: "event", label: "Website Events" },
  { value: "birthday", label: "Birthdays" },
  { value: "poster", label: "Poster Days" },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntil(date: Date) {
  return Math.round((date.getTime() - startOfToday().getTime()) / 86_400_000);
}

function makeDate(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function parseEventDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function eventTypeLabel(value?: string | null) {
  const text = String(value || "event").replace(/[-_]+/g, " ").trim();
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ") || "Event";
}

function branchLabel(value?: string | null) {
  const branch = String(value || "").trim();
  const normalized = branch.toLowerCase();
  if (!branch || ["overall", "all", "all branch", "all branches", "both"].includes(normalized)) return "All Branch";
  if (["m p sports club", "mp sports club", "mpsc"].includes(normalized)) return "MPSC";
  return branch;
}

function studentName(student: Student) {
  return String(student.name || student.id || "SKF Athlete").trim();
}

function stylesForKind(kind: TimelineKind) {
  if (kind === "event") {
    return {
      card: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
      rail: "bg-cyan-300",
      icon: "border-cyan-300/20 bg-cyan-300 text-black",
      badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
      status: "text-cyan-200/70",
    };
  }

  if (kind === "birthday") {
    return {
      card: "border-rose-400/25 bg-rose-500/[0.08] text-rose-100",
      rail: "bg-rose-300",
      icon: "border-rose-300/20 bg-rose-300 text-black",
      badge: "border-rose-300/20 bg-rose-300/10 text-rose-100",
      status: "text-rose-200/70",
    };
  }

  return {
    card: "border-violet-400/25 bg-violet-500/[0.08] text-violet-100",
    rail: "bg-violet-300",
    icon: "border-violet-300/20 bg-violet-300 text-black",
    badge: "border-violet-300/20 bg-violet-300/10 text-violet-100",
    status: "text-violet-200/70",
  };
}

function buildEventItems(events: EventCollectionItem[]): TimelineItem[] {
  return events
    .flatMap((item): TimelineItem[] => {
      const date = parseEventDate(item.event.date);
      if (!date) return [];
      const resultsText = item.event.isResultsPublished
        ? "Results published"
        : item.event.results?.length
          ? `${item.event.results.length} result entries saved`
          : "Results pending";

      return [{
        id: `event:${item.event.id}`,
        kind: "event" as const,
        title: item.event.name,
        date,
        dateKey: dateKey(date),
        category: eventTypeLabel(item.event.type),
        meta: `${branchLabel(item.event.hostingBranch)} • ${item.event.status || "upcoming"}`,
        detail: `${item.event.participants.length} assigned • ${resultsText} • Pending ₹${Number(item.collection.pending || 0).toLocaleString("en-IN")}`,
        status: item.event.isPublished ? "Published" : "Draft",
        href: "/events",
      }];
    });
}

function buildPosterItems(year: number): TimelineItem[] {
  return POSTER_EVENTS
    .flatMap((event): TimelineItem[] => {
      const date = makeDate(year, event.month, event.day);
      if (!date) return [];
      return [{
        id: `poster:${event.id}:${year}`,
        kind: "poster" as const,
        title: event.name,
        date,
        dateKey: dateKey(date),
        category: event.category,
        meta: event.category,
        detail: event.notes,
        status: daysUntil(date) === 0 ? "Today" : daysUntil(date) === 1 ? "Tomorrow" : "Scheduled",
      }];
    });
}

function buildBirthdayItems(year: number, branch: "MPSC" | "Herohalli", students: Student[]): TimelineItem[] {
  return students
    .filter((student) => String(student.status || "").toLowerCase() !== "discontinued")
    .flatMap((student): TimelineItem[] => {
      if (!student.dateOfBirth) return [];
      const birthDate = new Date(student.dateOfBirth);
      if (!Number.isFinite(birthDate.getTime())) return [];
      const date = makeDate(year, birthDate.getMonth(), birthDate.getDate());
      if (!date) return [];

      return [{
        id: `birthday:${branch}:${student.id}:${year}`,
        kind: "birthday" as const,
        title: studentName(student),
        date,
        dateKey: dateKey(date),
        category: "Birthday",
        meta: `${branch} • ${student.id}`,
        detail: student.phone ? `Parent contact ${student.phone}` : "Birthday wish reminder",
        status: daysUntil(date) === 0 ? "Today" : daysUntil(date) === 1 ? "Tomorrow" : "Scheduled",
        href: `/students/${branch}`,
      }];
    });
}

function notificationCapability() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!(window.isSecureContext || window.location.hostname === "localhost")) return "needs-secure-context";
  return window.Notification.permission;
}

export default function NotificationTimelinePage() {
  const { user, checking } = useFeeTrackAuth();
  const [year, setYear] = useState(getCurrentFeeYear());
  const [filter, setFilter] = useState<TimelineFilter>("upcoming");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<string>(() => notificationCapability());
  const [events, setEvents] = useState<EventCollectionItem[]>([]);
  const [mpscStudents, setMpscStudents] = useState<Student[]>([]);
  const [herohalliStudents, setHerohalliStudents] = useState<Student[]>([]);

  const loadTimeline = useCallback(async (force = false) => {
    if (!user) return;
    if (force) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const currentMonth = new Date().getMonth();
      const [eventData, mpsc, herohalli] = await Promise.all([
        getEventCollections("Overall", year, force),
        getStudents("MPSC", currentMonth, force),
        getStudents("Herohalli", currentMonth, force),
      ]);
      setEvents(eventData.events || []);
      setMpscStudents(mpsc);
      setHerohalliStudents(herohalli);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Timeline could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, year]);

  useEffect(() => {
    if (checking || !user) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      void loadTimeline(false);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checking, loadTimeline, user]);

  const allItems = useMemo(() => {
    return [
      ...buildEventItems(events),
      ...buildBirthdayItems(year, "MPSC", mpscStudents),
      ...buildBirthdayItems(year, "Herohalli", herohalliStudents),
      ...buildPosterItems(year),
    ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.title.localeCompare(b.title));
  }, [events, herohalliStudents, mpscStudents, year]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesFilter = filter === "all"
        || (filter === "upcoming" ? item.date >= startOfToday() : item.kind === filter);
      if (!matchesFilter) return false;
      if (!term) return true;
      return [item.title, item.category, item.meta, item.detail, item.status].join(" ").toLowerCase().includes(term);
    });
  }, [allItems, filter, query]);

  const groups = useMemo(() => {
    const grouped = new Map<string, TimelineItem[]>();
    for (const item of filteredItems) {
      const month = formatMonth(item.date);
      grouped.set(month, [...(grouped.get(month) || []), item]);
    }
    return Array.from(grouped.entries());
  }, [filteredItems]);

  const stats = useMemo(() => ({
    websiteEvents: events.length,
    birthdays: buildBirthdayItems(year, "MPSC", mpscStudents).length + buildBirthdayItems(year, "Herohalli", herohalliStudents).length,
    posterDays: POSTER_EVENTS.length,
    upcoming: allItems.filter((item) => item.date >= startOfToday()).length,
  }), [allItems, events.length, herohalliStudents, mpscStudents, year]);

  const requestDeviceAlerts = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    if (!(window.isSecureContext || window.location.hostname === "localhost")) {
      setPermission("needs-secure-context");
      return;
    }
    const next = await window.Notification.requestPermission();
    setPermission(next);
  };

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-black text-zinc-300">
        <div className="flex min-h-screen items-center justify-center">
          <Activity className="h-6 w-6 animate-pulse text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Notification Timeline" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Admin Timeline</p>
            <h1 className="mt-2 font-[family-name:var(--font-space)] text-3xl font-semibold text-white sm:text-4xl">
              Notifications and calendar
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Events" value={stats.websiteEvents} />
            <Metric label="Birthdays" value={stats.birthdays} />
            <Metric label="Posters" value={stats.posterDays} />
            <Metric label="Upcoming" value={stats.upcoming} />
          </div>
        </header>

        <section className="mb-6 grid gap-3 lg:grid-cols-[1fr_0.75fr]">
          <div className="card-panel p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search timeline..."
                  className="min-h-11 w-full rounded-lg border border-zinc-800 bg-black py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-zinc-500"
                />
              </label>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="min-h-11 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white outline-none focus:border-zinc-500"
              >
                {[getCurrentFeeYear() - 1, getCurrentFeeYear(), getCurrentFeeYear() + 1].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadTimeline(true)}
                disabled={refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition-colors ${
                    filter === item.value
                      ? "border-white bg-white text-black"
                      : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-panel p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-zinc-400">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Device Alerts</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {permission === "granted"
                    ? "Enabled on this browser."
                    : permission === "denied"
                      ? "Blocked in browser settings."
                      : permission === "needs-secure-context"
                        ? "Needs HTTPS or localhost."
                        : permission === "unsupported"
                          ? "Not supported on this browser."
                          : "Permission has not been requested."}
                </p>
              </div>
              {permission !== "granted" ? (
                <button
                  type="button"
                  onClick={requestDeviceAlerts}
                  className="min-h-10 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
                >
                  Enable
                </button>
              ) : (
                <CheckCircle2 className="mt-2 h-4 w-4 text-emerald-400" />
              )}
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : groups.length ? (
          <div className="space-y-6">
            {groups.map(([month, items]) => (
              <section key={month}>
                <div className="mb-3 flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-zinc-500" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">{month}</h2>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <TimelineCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <p className="text-sm font-semibold text-white">No timeline items found</p>
            <p className="mt-1 text-xs text-zinc-500">Try a different filter, search term, or year.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-right">
      <p className="text-lg font-semibold text-white">{value.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const styles = stylesForKind(item.kind);
  const dayCount = daysUntil(item.date);
  const relative = dayCount === 0
    ? "Today"
    : dayCount === 1
      ? "Tomorrow"
      : dayCount > 1
        ? `In ${dayCount} days`
        : `${Math.abs(dayCount)} days ago`;

  const card = (
    <div className={`relative overflow-hidden rounded-xl border p-4 pl-5 transition-colors ${styles.card}`}>
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${styles.rail}`} aria-hidden="true" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border ${styles.icon}`}>
            {item.kind === "event" ? (
              <Trophy className="h-4 w-4" />
            ) : item.kind === "birthday" ? (
              <Gift className="h-4 w-4" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${styles.badge}`}>
                {item.category}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${styles.status}`}>{item.status}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-1 text-xs text-white/70">{item.meta}</p>
            <p className="mt-2 text-xs text-white/50">{item.detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
          <p className="text-sm font-semibold text-white">{formatDate(item.date)}</p>
          <p className="mt-1 text-xs text-white/45">{relative}</p>
        </div>
      </div>
    </div>
  );

  if (!item.href) return card;
  return (
    <Link href={item.href} className="block">
      {card}
    </Link>
  );
}
