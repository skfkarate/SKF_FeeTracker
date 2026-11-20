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

import GlobalSearch from "@/components/common/GlobalSearch";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import AccountMenu from "@/components/common/AccountMenu";
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
      card: "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] text-[color:var(--color-text)]",
      rail: "bg-[color:var(--color-accent)]",
      icon: "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]",
      badge: "border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text)]",
      status: "text-[color:var(--color-text)]",
    };
  }

  if (kind === "birthday") {
    return {
      card: "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] text-[color:var(--color-text)]",
      rail: "bg-[color:var(--color-accent)]",
      icon: "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]",
      badge: "border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text)]",
      status: "text-[color:var(--color-text)]",
    };
  }

  return {
    card: "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] text-[color:var(--color-text)]",
    rail: "bg-[color:var(--color-accent)]",
    icon: "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]",
    badge: "border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text)]",
    status: "text-[color:var(--color-text)]",
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
      <div className="min-h-screen bg-[color:var(--color-well)] text-[color:var(--color-text)]">
        <div className="flex min-h-screen items-center justify-center">
          <Activity className="h-[24px] w-[24px] animate-pulse text-[color:var(--color-text-dim)]" />
        </div>
      </div>
    );
  }

  return (
    <PageShell
      hud={{
        title: "Notification Timeline",
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
        <header className="mb-[24px] flex flex-col gap-[20px] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">Admin Timeline</p>
            <h1 className="mt-[8px] font-sans text-[clamp(1.35rem,1rem+1vw,2rem)] font-semibold text-[color:var(--color-text)]">
              Notifications and calendar
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
            <Metric label="Events" value={stats.websiteEvents} />
            <Metric label="Birthdays" value={stats.birthdays} />
            <Metric label="Posters" value={stats.posterDays} />
            <Metric label="Upcoming" value={stats.upcoming} />
          </div>
        </header>

        <section className="mb-[24px] grid min-w-[0px] grid-cols-[minmax(0,1fr)] gap-[12px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
          <div className="card-panel min-w-[0px] p-[16px]">
            <div className="grid min-w-[0px] grid-cols-[minmax(0,1fr)] gap-[12px] md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="relative block min-w-[0px]">
                <Search className="pointer-events-none absolute left-[12px] top-[50%] h-[16px] w-[16px] -translate-y-1/2 text-[color:var(--color-text-faint)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search timeline..."
                  className="min-h-[44px] min-w-[0px] w-full max-w-full rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] py-[8px] pl-[40px] pr-[12px] text-sm text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-hairline-strong)]"
                />
              </label>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="min-h-[44px] min-w-[0px] max-w-full rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-sm text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-hairline-strong)]"
              >
                {[getCurrentFeeYear() - 1, getCurrentFeeYear(), getCurrentFeeYear() + 1].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadTimeline(true)}
                disabled={refreshing}
                className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)] disabled:opacity-60"
              >
                <RefreshCw className={`h-[16px] w-[16px] ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <div className="mt-[12px] flex min-w-[0px] max-w-full flex-wrap gap-[8px]">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`min-h-[44px] whitespace-nowrap rounded-full border px-[16px] text-xs font-semibold transition-colors ${
                    filter === item.value
                      ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
                      : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-panel min-w-[0px] p-[16px]">
            <div className="flex min-w-[0px] items-start gap-[12px]">
              <span className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
                <Bell className="h-[16px] w-[16px]" />
              </span>
              <div className="min-w-[0px] flex-1">
                <p className="break-words text-sm font-semibold text-[color:var(--color-text)]">Device Alerts</p>
                <p className="mt-[4px] break-words text-xs text-[color:var(--color-text-dim)]">
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
                  className="min-h-[44px] rounded-lg bg-[color:var(--color-accent)] px-[12px] text-xs font-semibold text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-panel-strong)]"
                >
                  Enable
                </button>
              ) : (
                <CheckCircle2 className="mt-[8px] h-[16px] w-[16px] text-[color:var(--color-text-dim)]" />
              )}
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
            <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
          </div>
        ) : groups.length ? (
          <div className="space-y-[24px]">
            {groups.map(([month, items]) => (
              <section key={month}>
                <div className="mb-[12px] flex items-center gap-[12px]">
                  <CalendarDays className="h-[16px] w-[16px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-[color:var(--color-text-dim)]">{month}</h2>
                </div>
                <div className="space-y-[12px]">
                  {items.map((item) => (
                    <TimelineCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[32px] text-center">
            <p className="text-sm font-semibold text-[color:var(--color-text)]">No timeline items found</p>
            <p className="mt-[4px] text-xs text-[color:var(--color-text-dim)]">Try a different filter, search term, or year.</p>
          </div>
        )}
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] py-[12px] text-right">
      <p className="text-lg font-semibold text-[color:var(--color-text)]">{value.toLocaleString("en-IN")}</p>
      <p className="mt-[4px] text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-text-faint)]">{label}</p>
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
    <div className={`relative overflow-hidden rounded-xl border p-[16px] pl-[20px] transition-colors ${styles.card}`}>
      <span className={`absolute bottom-[0px] left-[0px] top-[0px] w-[4px] ${styles.rail}`} aria-hidden="true" />
      <div className="flex flex-col gap-[12px] sm:flex-row sm:items-start">
        <div className="flex min-w-[0px] flex-1 items-start gap-[12px]">
          <span className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-lg border ${styles.icon}`}>
            {item.kind === "event" ? (
              <Trophy className="h-[16px] w-[16px]" />
            ) : item.kind === "birthday" ? (
              <Gift className="h-[16px] w-[16px]" />
            ) : (
              <Megaphone className="h-[16px] w-[16px]" />
            )}
          </span>
          <div className="min-w-[0px] flex-1">
            <div className="flex flex-wrap items-center gap-[8px]">
              <span className={`rounded-full border px-[8px] py-[2px] text-[10px] font-semibold uppercase tracking-widest ${styles.badge}`}>
                {item.category}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${styles.status}`}>{item.status}</span>
            </div>
            <h3 className="mt-[8px] text-base font-semibold text-[color:var(--color-text)]">{item.title}</h3>
            <p className="mt-[4px] text-xs text-[color:var(--color-text)]">{item.meta}</p>
            <p className="mt-[8px] text-xs text-[color:var(--color-text)]">{item.detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-[12px] sm:block sm:text-right">
          <p className="text-sm font-semibold text-[color:var(--color-text)]">{formatDate(item.date)}</p>
          <p className="mt-[4px] text-xs text-[color:var(--color-text)]">{relative}</p>
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
