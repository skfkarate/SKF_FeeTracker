"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  Compass,
  Eye,
  Globe2,
  Laptop,
  LogIn,
  MousePointerClick,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  UserRound,
  Users,
  UserCheck,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  getWebsiteAnalytics,
  type AnalyticsBreakdown,
  type DailyWebsiteTraffic,
  type WebsiteAnalyticsData,
  type WebsiteOperationalEvent,
  type WebsitePageAnalytics,
  type WebsiteRecentPageView,
  type WebsiteVisitorAnalytics,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";

const RANGE_OPTIONS = [7, 30, 90, 180, 365];
const VIEWS = ["Anonymous Visitors", "Portal Activity"] as const;
type ViewMode = (typeof VIEWS)[number];

function number(value: number) {
  return Number(value || 0).toLocaleString("en-IN");
}

function percent(value: number) {
  return `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

function eventLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataSummary(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata || {}).slice(0, 4);
  if (!entries.length) return "No metadata";
  return entries
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" | ");
}

function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-black/20 px-4 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "green" | "amber" | "cyan" | "red";
}) {
  const toneClass = {
    default: "text-zinc-300",
    green: "text-emerald-300",
    amber: "text-amber-300",
    cyan: "text-cyan-300",
    red: "text-red-300",
  }[tone];

  return (
    <div className="card-panel min-h-32 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className="font-[family-name:var(--font-space)] text-2xl font-semibold text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{detail}</p>
    </div>
  );
}

function BreakdownList({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  rows: AnalyticsBreakdown[];
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="card-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 text-zinc-500" />
          {title}
        </h2>
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-zinc-300">{row.label}</span>
                <span className="flex-shrink-0 text-zinc-500">
                  {number(row.value)} - {percent(row.percentage)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black">
                <div
                  className="h-full rounded-full bg-zinc-300"
                  style={{ width: `${Math.max((row.value / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock>{empty}</EmptyBlock>
      )}
    </section>
  );
}

function DailyTrafficChart({ rows }: { rows: DailyWebsiteTraffic[] }) {
  const max = Math.max(...rows.map((row) => row.views), 1);

  return (
    <section className="card-panel p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Traffic</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Daily Website Activity</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-white" />
            Views
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-2 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Leads
          </span>
        </div>
      </div>

      {rows.some((row) => row.views > 0) ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex h-72 min-w-[720px] items-stretch gap-2 border-t border-zinc-800/70 pt-4">
            {rows.map((row) => {
              const height = row.views > 0 ? Math.max((row.views / max) * 100, 4) : 0;
              return (
                <div key={row.date} className="group flex min-w-8 flex-1 flex-col items-center gap-2">
                  <span className="h-5 text-[10px] font-semibold tabular-nums text-zinc-500">
                    {row.views ? number(row.views) : ""}
                  </span>
                  <div className="relative flex min-h-0 w-full flex-1 items-end justify-center rounded-t bg-black/30">
                    <div
                      className="w-full max-w-8 rounded-t bg-white/80 transition-colors group-hover:bg-cyan-300"
                      style={{ height: `${height}%` }}
                    />
                    {row.leads > 0 ? (
                      <span className="absolute bottom-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                    ) : null}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                    {formatDateLabel(row.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyBlock>No website visits are recorded in this selected period.</EmptyBlock>
      )}
    </section>
  );
}

function HourlyTraffic({ rows }: { rows: WebsiteAnalyticsData["content"]["hourlyTraffic"] }) {
  const max = Math.max(...rows.map((row) => row.views), 1);

  return (
    <section className="card-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Clock3 className="h-4 w-4 text-zinc-500" />
          Hourly Pattern
        </h2>
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
        {rows.map((row) => (
          <div key={row.hour} className="rounded-lg border border-zinc-800 bg-black/30 p-2">
            <div className="mb-2 flex h-16 items-end overflow-hidden rounded bg-zinc-950">
              <div
                className="w-full origin-bottom rounded bg-zinc-500/80"
                style={{
                  height: `${row.views > 0 ? Math.max((row.views / max) * 100, 3) : 0}%`,
                }}
              />
            </div>
            <p className="text-center text-[10px] text-zinc-500">{String(row.hour).padStart(2, "0")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageTable({ title, rows }: { title: string; rows: WebsitePageAnalytics[] }) {
  return (
    <section className="card-panel overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Page</th>
                <th className="px-5 py-3 font-semibold">Group</th>
                <th className="px-5 py-3 text-right font-semibold">Views</th>
                <th className="px-5 py-3 text-right font-semibold">Visitors</th>
                <th className="px-5 py-3 text-right font-semibold">Entrances</th>
                <th className="px-5 py-3 text-right font-semibold">Exits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {rows.map((row) => (
                <tr key={`${title}-${row.path}`} className="hover:bg-white/[0.02]">
                  <td className="max-w-[280px] px-5 py-4">
                    <p className="truncate font-medium text-white">{row.path}</p>
                    <p className="mt-1 truncate text-xs text-zinc-600">{row.title}</p>
                  </td>
                  <td className="px-5 py-4 text-zinc-400">{row.group}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-white">{number(row.views)}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-zinc-400">{number(row.visitors)}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-zinc-400">{number(row.entrances)}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-zinc-400">{number(row.exits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5">
          <EmptyBlock>No page data available.</EmptyBlock>
        </div>
      )}
    </section>
  );
}

function VisitorList({ visitors }: { visitors: WebsiteVisitorAnalytics[] }) {
  return (
    <section className="card-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <UserRound className="h-4 w-4 text-zinc-500" />
          Recent Visitor Journeys
        </h2>
      </div>
      {visitors.length ? (
        <div className="space-y-3">
          {visitors.map((visitor) => (
            <div key={`${visitor.visitorId}-${visitor.lastSeen}`} className="rounded-xl border border-zinc-800 bg-black/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-zinc-300">{visitor.visitorId}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{visitor.landingPage} to {visitor.lastPage}</p>
                  <p className="mt-1 text-xs text-zinc-500">{visitor.source} - {visitor.device} - {visitor.browser} - {visitor.os}</p>
                  {visitor.skfId ? <p className="mt-1 text-xs text-cyan-400">Student: {visitor.skfId}</p> : null}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[220px]">
                  <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
                    <span className="block text-sm font-semibold text-white">{visitor.sessions}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Visits</span>
                  </span>
                  <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
                    <span className="block text-sm font-semibold text-white">{visitor.pageViews}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Views</span>
                  </span>
                  <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
                    <span className="block truncate text-sm font-semibold text-white">{visitor.ipLabel || "-"}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">IP</span>
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-zinc-600">Last seen {formatDateTime(visitor.lastSeen)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock>No recent visitor journeys available.</EmptyBlock>
      )}
    </section>
  );
}

function RecentPageViews({ rows, showStudent = false }: { rows: WebsiteRecentPageView[]; showStudent?: boolean }) {
  return (
    <section className="card-panel overflow-hidden">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-white">Recent Page Views</h2>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">{showStudent ? "Student" : "Source"}</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="truncate text-xs font-medium text-white">{row.path}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {showStudent ? (
                      <span className="font-mono text-[10px] text-cyan-400">{row.skfId || <span className="text-zinc-600">-</span>}</span>
                    ) : (
                      <span className="text-zinc-500">{row.device} - {row.browser}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{showStudent ? `${row.device} - ${row.browser}` : row.source}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-xs text-zinc-500">{formatDateTime(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5">
          <EmptyBlock>No recent page views available.</EmptyBlock>
        </div>
      )}
    </section>
  );
}

function OperationalEvents({ events }: { events: WebsiteOperationalEvent[] }) {
  return (
    <section className="card-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <LogIn className="h-4 w-4 text-zinc-500" />
          Lead & Portal Events
        </h2>
      </div>
      {events.length ? (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-zinc-800 bg-black/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{eventLabel(event.eventType)}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {event.path}
                    {event.skfId ? ` - ${event.skfId}` : ""}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">{formatDateTime(event.createdAt)}</p>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-zinc-600">{metadataSummary(event.metadata)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock>No lead or portal events are recorded in this period.</EmptyBlock>
      )}
    </section>
  );
}

export default function WebsiteAnalyticsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [activeView, setActiveView] = useState<ViewMode>("Anonymous Visitors");
  const [rangeDays, setRangeDays] = useState(90);
  const [analytics, setAnalytics] = useState<WebsiteAnalyticsData | null>(null);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (checking || !user) return;
    setLoading(true);
    setError("");
    try {
      const result = await getWebsiteAnalytics(rangeDays);
      setAnalytics(result.data);
      setWarning(result.warning || result.data?.warning || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Website analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [checking, rangeDays, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAnalytics]);

  // === Filtered data for each view ===
  const filteredData = useMemo(() => {
    if (!analytics) return null;

    const allPageViews = analytics.recent.pageViews;
    const allVisitors = analytics.audience.recentVisitors;
    const allEvents = analytics.operations.events;

    if (activeView === "Portal Activity") {
      const studentPageViews = allPageViews.filter((pv) => pv.skfId);
      const studentVisitors = allVisitors.filter((v) => v.skfId);
      const loginEvents = allEvents.filter(
        (e) => e.eventType === "portal_login_success" || e.eventType === "portal_login_failed",
      );
      const uniqueStudents = new Set(studentVisitors.map((v) => v.skfId).filter(Boolean));

      return {
        pageViews: studentPageViews,
        visitors: studentVisitors,
        events: loginEvents,
        metrics: {
          uniqueStudents: uniqueStudents.size,
          studentPageViews: studentPageViews.length,
          successfulLogins: loginEvents.filter((e) => e.eventType === "portal_login_success").length,
          failedLogins: loginEvents.filter((e) => e.eventType === "portal_login_failed").length,
        },
      };
    }

    // Anonymous Visitors
    const anonPageViews = allPageViews.filter((pv) => !pv.skfId);
    const anonVisitors = allVisitors.filter((v) => !v.skfId);

    return {
      pageViews: anonPageViews,
      visitors: anonVisitors,
      events: allEvents,
      metrics: null,
    };
  }, [analytics, activeView]);

  const kpis = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        icon: Users,
        label: "Visits",
        value: number(analytics.overview.visits),
        detail: `${number(analytics.overview.visitsToday)} visits today`,
        tone: "cyan" as const,
      },
      {
        icon: UserRound,
        label: "Unique Visitors",
        value: number(analytics.overview.uniqueVisitors),
        detail: `${number(analytics.overview.returningVisitors)} returning visitors`,
        tone: "green" as const,
      },
      {
        icon: Eye,
        label: "Page Views",
        value: number(analytics.overview.pageViews),
        detail: `${analytics.overview.avgPagesPerVisit} pages per visit`,
      },
      {
        icon: MousePointerClick,
        label: "Lead Rate",
        value: percent(analytics.overview.leadConversionRate),
        detail: `${number(analytics.overview.leadSubmissions)} leads, ${number(analytics.overview.leadFailures)} failures`,
        tone: analytics.overview.leadFailures > 0 ? ("amber" as const) : ("green" as const),
      },
    ];
  }, [analytics]);

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Website Analytics" rightContent={<NavMenu />} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-cyan-300" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Website Intelligence</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Website Analytics
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {activeView === "Anonymous Visitors"
                ? "Anonymous visitor traffic, page performance, sources and engagement from the public website."
                : "Authenticated portal user activity — which student visited which page and when."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              {RANGE_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    rangeDays === days
                      ? "bg-white text-black"
                      : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Website analytics could not be loaded.</p>
              <p className="mt-1 text-red-100/75">{error}</p>
            </div>
          </div>
        ) : null}

        {warning ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="leading-relaxed">{warning}</p>
          </div>
        ) : null}

        {/* Primary view toggle - Anonymous Visitors vs Portal Activity */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-0 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  activeView === view
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {view === "Anonymous Visitors" ? (
                  <ShieldQuestion className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {view}
              </button>
            ))}
          </div>
        </div>

        {loading && !analytics ? (
          <div className="flex h-72 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-zinc-500" />
          </div>
        ) : analytics ? (
          <div className="space-y-6 animate-slide-up">
            {/* ============ ANONYMOUS VISITORS VIEW ============ */}
            {activeView === "Anonymous Visitors" && (
              <>
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {kpis.map((kpi) => (
                    <MetricCard key={kpi.label} {...kpi} />
                  ))}
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    icon={Activity}
                    label="Bounce Rate"
                    value={percent(analytics.overview.bounceRate)}
                    detail={`${number(analytics.overview.publicPageViews)} public views`}
                    tone={analytics.overview.bounceRate >= 70 ? "amber" : "default"}
                  />
                  <MetricCard
                    icon={LogIn}
                    label="Portal Logins"
                    value={number(analytics.overview.portalLogins)}
                    detail={`${number(analytics.overview.portalLoginFailures)} failed attempts`}
                    tone={analytics.overview.portalLoginFailures > analytics.overview.portalLogins ? "red" : "default"}
                  />
                  <MetricCard
                    icon={BarChart3}
                    label="Loaded Window"
                    value={number(analytics.period.eventsLoaded)}
                    detail={`${analytics.period.label}, ${analytics.period.limited ? "limited sample" : "complete window"}`}
                    tone={analytics.period.limited ? "amber" : "default"}
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="Data Span"
                    value={analytics.history.firstRecordedAt ? formatDateTime(analytics.history.firstRecordedAt).split(",")[0] : "N/A"}
                    detail={`${number(analytics.history.totalEvents)} total events recorded`}
                  />
                </section>

                <DailyTrafficChart rows={analytics.content.dailyTraffic} />

                <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                  <PageTable title="Top Pages" rows={analytics.content.topPages} />
                  <div className="space-y-6">
                    <BreakdownList title="Traffic Sources" icon={Search} rows={analytics.acquisition.referrers} empty="No source data available." />
                    <BreakdownList title="Page Sections" icon={Compass} rows={analytics.content.pageGroups} empty="No page group data available." />
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                  <BreakdownList title="Devices" icon={Smartphone} rows={analytics.audience.devices} empty="No device data available." />
                  <BreakdownList title="Browsers" icon={Laptop} rows={analytics.audience.browsers} empty="No browser data available." />
                  <BreakdownList title="Operating Systems" icon={Activity} rows={analytics.audience.operatingSystems} empty="No operating system data available." />
                </section>

                <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <HourlyTraffic rows={analytics.content.hourlyTraffic} />
                  <section className="card-panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-zinc-500" />
                      <h2 className="text-sm font-semibold text-white">Current Insights</h2>
                    </div>
                    <div className="grid gap-3">
                      {analytics.insights.map((insight) => (
                        <div key={insight} className="rounded-xl border border-zinc-800 bg-black/25 p-4 text-sm leading-relaxed text-zinc-300">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </section>
                </section>

                <VisitorList visitors={filteredData?.visitors || analytics.audience.recentVisitors} />
                <RecentPageViews rows={filteredData?.pageViews || analytics.recent.pageViews} />

                <section className="grid gap-4 md:grid-cols-2">
                  <MetricCard
                    icon={LogIn}
                    label="Portal Logins"
                    value={number(analytics.overview.portalLogins)}
                    detail={`${number(analytics.overview.portalLoginFailures)} failed attempts`}
                    tone={analytics.overview.portalLoginFailures > analytics.overview.portalLogins ? "red" : "default"}
                  />
                  <MetricCard
                    icon={MousePointerClick}
                    label="Lead Conversion"
                    value={percent(analytics.overview.leadConversionRate)}
                    detail={`${number(analytics.overview.leadSubmissions)} leads`}
                    tone={analytics.overview.leadFailures > analytics.overview.leadSubmissions ? "amber" : "green"}
                  />
                </section>
                <OperationalEvents events={analytics.operations.events} />
              </>
            )}

            {/* ============ PORTAL ACTIVITY VIEW ============ */}
            {activeView === "Portal Activity" && (
              <>
                <section className="grid gap-4 sm:grid-cols-3">
                  <MetricCard
                    icon={UserCheck}
                    label="Authenticated Students"
                    value={number(filteredData?.metrics?.uniqueStudents || 0)}
                    detail="Unique students identified via portal login"
                    tone="cyan"
                  />
                  <MetricCard
                    icon={LogIn}
                    label="Portal Logins"
                    value={number(filteredData?.metrics?.successfulLogins || 0)}
                    detail={`${number(filteredData?.metrics?.failedLogins || 0)} failed attempts`}
                    tone="green"
                  />
                  <MetricCard
                    icon={Eye}
                    label="Student Page Views"
                    value={number(filteredData?.metrics?.studentPageViews || 0)}
                    detail="Pages visited by logged-in students"
                    tone="cyan"
                  />
                </section>

                {/* Login events table */}
                {filteredData && filteredData.events.length > 0 && (
                  <section className="card-panel p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <LogIn className="h-4 w-4 text-zinc-500" />
                        Recent Student Logins
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[500px]">
                        <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Student</th>
                            <th className="px-4 py-3 font-semibold">Event</th>
                            <th className="px-4 py-3 font-semibold">Device</th>
                            <th className="px-4 py-3 text-right font-semibold">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {filteredData.events.slice(0, 20).map((event) => (
                            <tr key={event.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3 font-mono text-xs text-cyan-300">{event.skfId || "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  event.eventType === "portal_login_success"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-red-500/20 text-red-300"
                                }`}>
                                  {eventLabel(event.eventType)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-zinc-500">{metadataSummary(event.metadata).slice(0, 40)}</td>
                              <td className="px-4 py-3 text-right text-xs text-zinc-500">{formatDateTime(event.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Student page views */}
                {filteredData && filteredData.pageViews.length > 0 && (
                  <RecentPageViews rows={filteredData.pageViews} showStudent />
                )}

                {filteredData && filteredData.visitors.length > 0 && (
                  <section className="card-panel p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <UserCheck className="h-4 w-4 text-zinc-500" />
                        Student Visitor Profiles
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {filteredData.visitors.map((visitor) => (
                        <div key={`${visitor.visitorId}-${visitor.lastSeen}`} className="rounded-xl border border-zinc-800 bg-black/25 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-semibold text-cyan-300">{visitor.skfId}</p>
                              <p className="mt-1 text-xs text-zinc-400">{visitor.landingPage} to {visitor.lastPage}</p>
                              <p className="mt-1 text-xs text-zinc-500">{visitor.source} - {visitor.device} - {visitor.browser}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[200px]">
                              <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
                                <span className="block text-sm font-semibold text-white">{visitor.sessions}</span>
                                <span className="text-[10px] uppercase tracking-widest text-zinc-600">Visits</span>
                              </span>
                              <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
                                <span className="block text-sm font-semibold text-white">{visitor.pageViews}</span>
                                <span className="text-[10px] uppercase tracking-widest text-zinc-600">Views</span>
                              </span>
                              <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
                                <span className="block truncate text-sm font-semibold text-white">{visitor.ipLabel || "-"}</span>
                                <span className="text-[10px] uppercase tracking-widest text-zinc-600">IP</span>
                              </span>
                            </div>
                          </div>
                          <p className="mt-3 text-[11px] text-zinc-600">Last seen {formatDateTime(visitor.lastSeen)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(!filteredData || (!filteredData.events.length && !filteredData.pageViews.length)) && (
                  <EmptyBlock>No portal activity recorded yet. Student page visits will appear here once students log into the portal.</EmptyBlock>
                )}
              </>
            )}
          </div>
        ) : (
          <EmptyBlock>Website analytics is not configured yet.</EmptyBlock>
        )}
      </main>
    </div>
  );
}
