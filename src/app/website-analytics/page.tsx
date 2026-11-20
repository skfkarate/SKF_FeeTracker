"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  BookOpenCheck,
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
  UserCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import AccountMenu from "@/components/common/AccountMenu";
import LedgerRow from "@/components/ui/LedgerRow";
import MeterRing from "@/components/ui/MeterRing";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import StatTile, { type StatTone } from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
import {
  getHomePracticeAnalytics,
  getWebsiteAnalytics,
  type AnalyticsBreakdown,
  type DailyWebsiteTraffic,
  type HomePracticeAnalytics,
  type WebsiteAnalyticsData,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";

const RANGE_OPTIONS = [7, 30, 90, 180, 365];
const SIGNAL_FILTERS = ["all", "page", "login", "lead", "payment", "failure"] as const;
type SignalFilter = (typeof SIGNAL_FILTERS)[number];

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page view",
  lead_submit_success: "Lead submitted",
  lead_submit_failed: "Lead failed",
  portal_login_success: "Login succeeded",
  portal_login_failed: "Login failed",
  portal_fee_payment_submitted: "Fee payment submitted",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  page_view: "A public or portal page was opened",
  lead_submit_success: "Website enquiry reached SKF",
  lead_submit_failed: "Website enquiry did not reach SKF",
  portal_login_success: "Athlete entered the portal",
  portal_login_failed: "Athlete could not enter the portal",
  portal_fee_payment_submitted: "Athlete submitted a fee proof",
};

const KNOWN_EVENT_TYPES = Object.keys(EVENT_LABELS);

type Signal = {
  id: string;
  eventType: string;
  path: string;
  createdAt: string;
  skfId: string | null;
  visitorId: string | null;
  source?: string;
  device?: string;
  browser?: string;
  metadata?: Record<string, unknown>;
};

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
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

function eventLabel(value: string) {
  return EVENT_LABELS[value] || value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventDescription(value: string) {
  return EVENT_DESCRIPTIONS[value] || "Operational website event";
}

function eventStatus(value: string): LedgerStatus {
  void value;
  return "neutral";
}

function countFor(data: WebsiteAnalyticsData, eventType: string) {
  if (eventType === "page_view") return data.overview.pageViews;
  return data.operations.eventBreakdown.find((row) => row.label === eventType)?.value || 0;
}

function matchesFilter(eventType: string, filter: SignalFilter) {
  if (filter === "all") return true;
  if (filter === "failure") return eventType.includes("failed");
  if (filter === "page") return eventType === "page_view";
  return eventType.includes(filter);
}

function metadataSummary(metadata: Record<string, unknown> = {}) {
  const entries = Object.entries(metadata).slice(0, 3);
  if (!entries.length) return "No extra detail";
  return entries
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" | ");
}

function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-[16px] text-center text-sm text-[color:var(--color-text-faint)]">
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: StatTone;
}) {
  return (
    <StatTile
      label={label}
      value={value}
      hint={detail}
      tone={tone}
      icon={<Icon className="h-[16px] w-[16px]" />}
    />
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
    <section className="hud-panel p-[16px] sm:p-[20px]">
      <h3 className="mb-[16px] flex items-center gap-[8px] text-sm font-semibold text-[color:var(--color-text)]">
        <Icon className="h-[16px] w-[16px] text-[color:var(--color-text-faint)]" />
        {title}
      </h3>
      {rows.length ? (
        <div className="space-y-[12px]">
          {rows.map((row) => (
            <div key={row.label} className="min-w-[0px]">
              <div className="mb-[6px] flex items-center justify-between gap-[12px] text-xs">
                <span className="truncate text-[color:var(--color-text-dim)]">{row.label}</span>
                <span className="font-mono tnum shrink-0 text-[color:var(--color-text-faint)]">
                  {number(row.value)} · {percent(row.percentage)}
                </span>
              </div>
              <div className="h-[6px] overflow-hidden rounded-[var(--radius-pill)] bg-[color:var(--color-raised)]">
                <div
                  className="h-full rounded-[var(--radius-pill)] bg-[color:var(--color-text-dim)]"
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

function DailyTrafficGrid({ rows }: { rows: DailyWebsiteTraffic[] }) {
  const visible = rows.slice(-30);
  const max = Math.max(...visible.map((row) => row.views), 1);

  return (
    <section className="hud-panel p-[16px] sm:p-[20px]">
      <div className="mb-[16px] flex flex-wrap items-end justify-between gap-[8px]">
        <div>
          <p className="eyebrow text-[color:var(--color-text-faint)]">Traffic rhythm</p>
          <h3 className="font-display mt-[4px] text-lg text-[color:var(--color-text)]">Daily activity</h3>
        </div>
        <p className="text-xs text-[color:var(--color-text-faint)]">Latest {visible.length} days</p>
      </div>
      {visible.some((row) => row.views > 0) ? (
        <div className="grid grid-cols-6 gap-[6px] sm:grid-cols-[repeat(10,minmax(0,1fr))] xl:grid-cols-[repeat(15,minmax(0,1fr))]">
          {visible.map((row) => (
            <div
              key={row.date}
              className="min-w-[0px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] p-[6px]"
              title={`${formatDateLabel(row.date)}: ${number(row.views)} views`}
            >
              <div className="flex h-[48px] items-end rounded bg-[color:var(--color-panel-strong)]">
                <div
                  className="w-full rounded bg-[color:var(--color-accent-dim)]"
                  style={{ height: `${row.views > 0 ? Math.max((row.views / max) * 100, 6) : 0}%` }}
                />
              </div>
              <p className="font-mono tnum mt-[4px] truncate text-center text-[10px] text-[color:var(--color-text-faint)]">
                {row.views || ""}
              </p>
              <p className="truncate text-center text-[9px] text-[color:var(--color-text-faint)]">
                {formatDateLabel(row.date)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock>No website visits are recorded in this period.</EmptyBlock>
      )}
    </section>
  );
}

function HourlyTraffic({ rows }: { rows: WebsiteAnalyticsData["content"]["hourlyTraffic"] }) {
  const max = Math.max(...rows.map((row) => row.views), 1);

  return (
    <section className="hud-panel p-[16px] sm:p-[20px]">
      <div className="mb-[16px] flex items-center gap-[8px]">
        <Clock3 className="h-[16px] w-[16px] text-[color:var(--color-text-faint)]" />
        <h3 className="text-sm font-semibold text-[color:var(--color-text)]">Hourly pattern</h3>
      </div>
      <div className="grid grid-cols-6 gap-[6px] md:grid-cols-12">
        {rows.map((row) => (
          <div
            key={row.hour}
            className="min-w-[0px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] p-[6px]"
            title={`${String(row.hour).padStart(2, "0")}:00 — ${number(row.views)} views`}
          >
            <div className="flex h-[40px] items-end rounded bg-[color:var(--color-panel-strong)]">
              <div
                className="w-full rounded bg-[color:var(--color-accent-dim)]"
                style={{ height: `${row.views > 0 ? Math.max((row.views / max) * 100, 6) : 0}%` }}
              />
            </div>
            <p className="font-mono tnum mt-[4px] truncate text-center text-[10px] text-[color:var(--color-text-faint)]">
              {String(row.hour).padStart(2, "0")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageList({ title, rows }: { title: string; rows: WebsiteAnalyticsData["content"]["topPages"] }) {
  return (
    <section className="hud-panel overflow-hidden">
      <div className="border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
        <h3 className="eyebrow text-[color:var(--color-text-faint)]">{title}</h3>
      </div>
      {rows.length ? (
        <div className="divide-y divide-[color:var(--color-hairline)]">
          {rows.slice(0, 12).map((row, index) => (
            <LedgerRow
              key={`${title}-${row.path}`}
              index={index}
              title={row.path}
              subtitle={row.title}
              idLabel={`${row.group} · ${number(row.visitors)} visitors · ${number(row.entrances)} in · ${number(row.exits)} out`}
              amount={number(row.views)}
              amountLabel="views"
            />
          ))}
        </div>
      ) : (
        <div className="p-[16px] sm:p-[20px]">
          <EmptyBlock>No page data available.</EmptyBlock>
        </div>
      )}
    </section>
  );
}

function VisitorList({ visitors }: { visitors: WebsiteAnalyticsData["audience"]["recentVisitors"] }) {
  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex items-center gap-[8px] border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
        <UserRound className="h-[16px] w-[16px] text-[color:var(--color-text-faint)]" />
        <h3 className="eyebrow text-[color:var(--color-text-faint)]">Recent visitor journeys</h3>
      </div>
      {visitors.length ? (
        <div className="divide-y divide-[color:var(--color-hairline)]">
          {visitors.slice(0, 12).map((visitor, index) => (
            <LedgerRow
              key={`${visitor.visitorId}-${visitor.lastSeen}`}
              index={index}
              title={visitor.landingPage || visitor.lastPage || visitor.visitorId}
              subtitle={`${visitor.source} · ${visitor.device} · ${visitor.browser} · ${visitor.os}`}
              idLabel={`${visitor.visitorId}${visitor.skfId ? ` · ${visitor.skfId}` : ""} · ${visitor.ipLabel || "NO IP"}`}
              amount={`${visitor.sessions}/${visitor.pageViews}`}
              amountLabel="visits / views"
              trailing={<span className="font-mono text-[11px] text-[color:var(--color-text-faint)]">{formatDateTime(visitor.lastSeen)}</span>}
            />
          ))}
        </div>
      ) : (
        <div className="p-[16px] sm:p-[20px]">
          <EmptyBlock>No recent visitor journeys available.</EmptyBlock>
        </div>
      )}
    </section>
  );
}

function SignalRegister({ data }: { data: WebsiteAnalyticsData }) {
  const rows = KNOWN_EVENT_TYPES.map((eventType) => ({
    eventType,
    count: countFor(data, eventType),
  })).sort((a, b) => b.count - a.count);

  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-[8px] border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
        <div>
          <p className="eyebrow text-[color:var(--color-text-faint)]">Complete signal register</p>
          <h3 className="font-display mt-[4px] text-lg text-[color:var(--color-text)]">Every event SKF tracks</h3>
        </div>
        <p className="font-mono tnum text-xs text-[color:var(--color-text-faint)]">
          {number(data.history.totalEvents)} lifetime events
        </p>
      </div>
      <div className="divide-y divide-[color:var(--color-hairline)]">
        {rows.map((row, index) => (
          <LedgerRow
            key={row.eventType}
            index={index}
            status={eventStatus(row.eventType)}
            title={eventLabel(row.eventType)}
            subtitle={eventDescription(row.eventType)}
            idLabel={row.eventType}
            amount={number(row.count)}
            amountLabel="events"
          />
        ))}
      </div>
    </section>
  );
}

function SignalFeed({ signals }: { signals: Signal[] }) {
  const [filter, setFilter] = useState<SignalFilter>("all");
  const filtered = useMemo(
    () => signals.filter((signal) => matchesFilter(signal.eventType, filter)).slice(0, 60),
    [filter, signals],
  );

  return (
    <section className="hud-panel overflow-hidden">
      <div className="border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
        <div className="mb-[12px] flex flex-wrap items-end justify-between gap-[8px]">
          <div>
            <p className="eyebrow text-[color:var(--color-text-faint)]">Minute-by-minute</p>
            <h3 className="font-display mt-[4px] text-lg text-[color:var(--color-text)]">Signal feed</h3>
          </div>
          <p className="text-xs text-[color:var(--color-text-faint)]">Newest first · latest {filtered.length}</p>
        </div>
        <SegmentedTabs
          ariaLabel="Filter website signals"
          value={filter}
          onChange={setFilter}
          options={SIGNAL_FILTERS.map((value) => ({
            value,
            label: value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1),
          }))}
        />
      </div>
      {filtered.length ? (
        <div className="divide-y divide-[color:var(--color-hairline)]">
          {filtered.map((signal, index) => (
            <LedgerRow
              key={signal.id}
              index={index}
              status={eventStatus(signal.eventType)}
              title={eventLabel(signal.eventType)}
              subtitle={[signal.path, signal.source, signal.device].filter(Boolean).join(" · ") || "Website event"}
              idLabel={[signal.skfId, signal.visitorId, signal.metadata ? metadataSummary(signal.metadata) : null]
                .filter(Boolean)
                .join(" · ") || "No identity recorded"}
              trailing={<StatusPill status={eventStatus(signal.eventType)} label={eventLabel(signal.eventType)} />}
              onClick={undefined}
            />
          ))}
        </div>
      ) : (
        <div className="p-[16px] sm:p-[20px]">
          <EmptyBlock>No signals match this filter in the loaded window.</EmptyBlock>
        </div>
      )}
    </section>
  );
}

function LoginHealth({ data }: { data: WebsiteAnalyticsData }) {
  const attempts = data.overview.portalLogins + data.overview.portalLoginFailures;
  const successRate = attempts > 0 ? Math.round((data.overview.portalLogins / attempts) * 100) : 0;
  const uniquePortalPeople = new Set(
    data.audience.recentVisitors.map((visitor) => visitor.skfId).filter(Boolean),
  ).size;

  return (
    <section className="hud-panel p-[16px] sm:p-[20px]">
      <div className="mb-[16px] flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <p className="eyebrow text-[color:var(--color-text-faint)]">Access control</p>
          <h3 className="font-display mt-[4px] text-lg text-[color:var(--color-text)]">Login health</h3>
        </div>
        <MeterRing
          value={successRate}
          caption="success rate"
          tone="action"
        />
      </div>
      <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
        {[
          ["Attempts", number(attempts)],
          ["Logged in", number(data.overview.portalLogins)],
          ["Failed", number(data.overview.portalLoginFailures)],
          ["Identified", number(uniquePortalPeople)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-[0px] rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] p-[12px]">
            <p className="truncate text-[11px] text-[color:var(--color-text-faint)]">{label}</p>
            <p className="numeric mt-[8px] break-words text-lg text-[color:var(--color-text)]">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-[12px] text-xs leading-relaxed text-[color:var(--color-text-faint)]">
        Attempts include every successful and failed portal login event in the loaded window.
      </p>
    </section>
  );
}

function LeadHealth({ data }: { data: WebsiteAnalyticsData }) {
  const feeSubmissions = countFor(data, "portal_fee_payment_submitted");
  const failureRate =
    data.overview.leadSubmissions + data.overview.leadFailures > 0
      ? Math.round((data.overview.leadFailures / (data.overview.leadSubmissions + data.overview.leadFailures)) * 100)
      : 0;

  return (
    <section className="hud-panel p-[16px] sm:p-[20px]">
      <div className="mb-[16px]">
        <p className="eyebrow text-[color:var(--color-text-faint)]">Inbound work</p>
        <h3 className="font-display mt-[4px] text-lg text-[color:var(--color-text)]">Leads and submissions</h3>
      </div>
      <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
        {[
          ["Leads", number(data.overview.leadSubmissions), "settled"],
          ["Failed leads", number(data.overview.leadFailures), "overdue"],
          ["Fee proofs", number(feeSubmissions), "action"],
          ["Lead failure rate", `${failureRate}%`, failureRate > 10 ? "overdue" : "neutral"],
        ].map(([label, value, tone]) => (
          <div key={label} className="min-w-[0px] rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] p-[12px]">
            <p className="truncate text-[11px] text-[color:var(--color-text-faint)]">{label}</p>
            <p className={`numeric mt-[8px] break-words text-lg ${tone === "overdue" ? "text-[color:var(--color-text-dim)]" : tone === "settled" ? "text-[color:var(--color-accent)]" : tone === "action" ? "text-[color:var(--color-action)]" : "text-[color:var(--color-text)]"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomePracticePerformance({ analytics }: { analytics: HomePracticeAnalytics }) {
  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-[12px] border-b border-[color:var(--color-hairline)] p-[16px] sm:p-[20px]">
        <div>
          <p className="eyebrow text-[color:var(--color-text-faint)]">Athlete portal</p>
          <h3 className="font-display mt-[4px] flex items-center gap-[8px] text-lg text-[color:var(--color-text)]">
            <BookOpenCheck className="h-[20px] w-[20px] text-[color:var(--color-accent)]" />
            Home practice
          </h3>
          <p className="mt-[4px] text-xs text-[color:var(--color-text-dim)]">
            Watch and completion signals from the last {analytics.rangeDays} days.
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--color-hairline)] px-[12px] py-[4px] text-[11px] text-[color:var(--color-text-faint)]">
          Instructor only
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[12px] p-[16px] sm:p-[20px] lg:grid-cols-5">
        <StatTile label="Watches" value={number(analytics.overview.watchedLessons)} tone="neutral" />
        <StatTile label="Athletes" value={number(analytics.overview.uniqueAthletes)} />
        <StatTile label="Completions" value={number(analytics.overview.completions)} tone="neutral" />
        <StatTile label="Completion rate" value={percent(analytics.overview.completionRate)} tone="action" />
        <StatTile label="Average progress" value={percent(analytics.overview.averageProgress)} tone="action" />
      </div>

      <div className="grid gap-[16px] border-t border-[color:var(--color-hairline)] p-[16px] sm:p-[20px] xl:grid-cols-2">
        <div className="min-w-[0px]">
          <h4 className="mb-[12px] text-sm font-semibold text-[color:var(--color-text)]">Lesson performance</h4>
          {analytics.videos.length ? (
            <div className="space-y-[8px]">
              {analytics.videos.slice(0, 8).map((video, index) => (
                <LedgerRow
                  key={video.videoId}
                  index={index}
                  title={video.title}
                  subtitle={`${video.watches} watches · ${formatDateTime(video.lastWatchedAt)}`}
                  idLabel={`${video.uniqueAthletes} athletes · ${video.completions} complete`}
                  amount={`${video.averageProgress}%`}
                  amountLabel="average"
                />
              ))}
            </div>
          ) : (
            <EmptyBlock>No lesson watch activity in this period.</EmptyBlock>
          )}
        </div>
        <div className="min-w-[0px]">
          <h4 className="mb-[12px] text-sm font-semibold text-[color:var(--color-text)]">Recent athlete viewing</h4>
          {analytics.recent.length ? (
            <div className="space-y-[8px]">
              {analytics.recent.slice(0, 8).map((watch, index) => (
                <LedgerRow
                  key={`${watch.skfId}-${watch.videoTitle}-${watch.watchedAt}-${index}`}
                  index={index}
                  status={watch.completed ? "paid" : "due"}
                  title={watch.athleteName}
                  subtitle={watch.videoTitle}
                  idLabel={`${watch.skfId} · ${watch.belt} · ${formatDateTime(watch.watchedAt)}`}
                  amount={`${watch.progressPercent}%`}
                  amountLabel="progress"
                />
              ))}
            </div>
          ) : (
            <EmptyBlock>No athlete viewing has been recorded yet.</EmptyBlock>
          )}
        </div>
      </div>
    </section>
  );
}

export default function WebsiteAnalyticsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [rangeDays, setRangeDays] = useState(90);
  const [analytics, setAnalytics] = useState<WebsiteAnalyticsData | null>(null);
  const [practiceAnalytics, setPracticeAnalytics] = useState<HomePracticeAnalytics | null>(null);
  const [practiceError, setPracticeError] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (checking || !user) return;
    setLoading(true);
    setError("");
    try {
      const [website, practice] = await Promise.allSettled([
        getWebsiteAnalytics(rangeDays),
        getHomePracticeAnalytics(rangeDays),
      ]);
      if (website.status === "rejected") throw website.reason;
      setAnalytics(website.value.data);
      setWarning(website.value.warning || website.value.data?.warning || "");
      if (practice.status === "fulfilled") {
        setPracticeAnalytics(practice.value);
        setPracticeError("");
      } else {
        setPracticeAnalytics(null);
        setPracticeError("Home Practice watch analytics could not be loaded right now.");
      }
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

  const signals = useMemo<Signal[]>(() => {
    if (!analytics) return [];
    const pageViews: Signal[] = analytics.recent.pageViews.map((row) => ({
      id: `page-${row.id}`,
      eventType: "page_view",
      path: row.path,
      createdAt: row.createdAt,
      skfId: row.skfId,
      visitorId: row.visitorId,
      source: row.source,
      device: row.device,
      browser: row.browser,
    }));
    const events: Signal[] = analytics.operations.events.map((row) => ({
      id: `event-${row.id}`,
      eventType: row.eventType,
      path: row.path,
      createdAt: row.createdAt,
      skfId: row.skfId,
      visitorId: null,
      metadata: row.metadata,
    }));
    return [...pageViews, ...events].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [analytics]);

  if (checking || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-base)] text-[color:var(--color-text-faint)]">
        <RefreshCw className="h-[24px] w-[24px] animate-spin" />
      </div>
    );
  }

  return (
    <PageShell
      hud={{
        title: "Insights",
        backHref: "/dashboard",
        actions: <AccountMenu />,
      }}
    >
      <header className="mb-[20px] flex flex-col gap-[16px] lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-[0px]">
          <div className="mb-[8px] flex items-center gap-[8px]">
            <Globe2 className="h-[16px] w-[16px] text-[color:var(--color-brand)]" />
            <p className="eyebrow text-[color:var(--color-text-faint)]">Website intelligence</p>
          </div>
          <h2 className="font-display text-[clamp(1.2rem,1.05rem+0.7vw,1.6rem)] text-[color:var(--color-text)]">
            The whole funnel, not just traffic
          </h2>
          <p className="mt-[4px] max-w-2xl text-sm leading-relaxed text-[color:var(--color-text-dim)]">
            Visitors, logins, failures, leads and every tracked website signal in one quiet ledger.
          </p>
        </div>

        <div className="flex flex-col gap-[8px] sm:flex-row sm:items-center">
          <SegmentedTabs
            ariaLabel="Analytics range"
            value={String(rangeDays)}
            onChange={(value) => setRangeDays(Number(value))}
            options={RANGE_OPTIONS.map((days) => ({ value: String(days), label: `${days}d` }))}
          />
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-[16px] text-sm font-semibold text-[color:var(--color-text-dim)] transition-colors hover:text-[color:var(--color-text)] disabled:opacity-50"
          >
            <RefreshCw className={`h-[16px] w-[16px] ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-[16px] flex items-start gap-[12px] rounded-xl border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-glass-hover)] p-[16px] text-sm text-[color:var(--color-text)]">
          <AlertCircle className="mt-[2px] h-[16px] w-[16px] shrink-0 text-[color:var(--color-text-dim)]" />
          <div className="min-w-[0px]">
            <p className="font-semibold">Website analytics could not be loaded.</p>
            <p className="mt-[4px] break-words text-[color:var(--color-text-dim)]">{error}</p>
          </div>
        </div>
      ) : null}

      {warning ? (
        <div className="mb-[16px] flex items-start gap-[12px] rounded-xl border border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] p-[16px] text-sm text-[color:var(--color-text)]">
          <AlertCircle className="mt-[2px] h-[16px] w-[16px] shrink-0 text-[color:var(--color-action)]" />
          <p className="leading-relaxed text-[color:var(--color-text-dim)]">{warning}</p>
        </div>
      ) : null}

      {practiceError ? (
        <div className="mb-[16px] rounded-xl border border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] p-[16px] text-sm text-[color:var(--color-text-dim)]">
          {practiceError}
        </div>
      ) : null}

      {loading && !analytics ? (
        <div className="flex h-[256px] items-center justify-center">
          <RefreshCw className="h-[28px] w-[28px] animate-spin text-[color:var(--color-text-faint)]" />
        </div>
      ) : analytics ? (
        <div className="space-y-[16px]">
          <section className="hud-panel flex flex-wrap items-center gap-x-[24px] gap-y-[8px] px-[16px] py-[12px] text-xs sm:px-[20px]">
            {[
              ["Window", analytics.period.label],
              ["Loaded", `${number(analytics.period.eventsLoaded)} / ${number(analytics.period.eventLimit)}`],
              ["First signal", formatDateTime(analytics.history.firstRecordedAt)],
              ["Last signal", formatDateTime(analytics.history.lastRecordedAt)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-[0px]">
                <span className="eyebrow mr-[8px] text-[color:var(--color-text-faint)]">{label}</span>
                <span className="font-mono tnum text-[color:var(--color-text-dim)]">{value}</span>
              </div>
            ))}
          </section>

          <section>
            <div className="mb-[12px] flex flex-wrap items-baseline justify-between gap-[8px]">
              <h3 className="font-display text-lg text-[color:var(--color-text)]">Visitor funnel</h3>
              <p className="eyebrow text-[color:var(--color-text-faint)]">People first, then events</p>
            </div>
            <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 xl:grid-cols-6">
              <MetricCard icon={Users} label="People visited" value={number(analytics.overview.uniqueVisitors)} detail={`${number(analytics.overview.returningVisitors)} returning`} tone="action" />
              <MetricCard icon={Eye} label="Visits" value={number(analytics.overview.visits)} detail={`${number(analytics.overview.visitsToday)} today`} />
              <MetricCard icon={MousePointerClick} label="Page views" value={number(analytics.overview.pageViews)} detail={`${analytics.overview.avgPagesPerVisit} pages per visit`} />
              <MetricCard icon={LogIn} label="Login attempts" value={number(analytics.overview.portalLogins + analytics.overview.portalLoginFailures)} detail="Success and failure together" tone="action" />
              <MetricCard icon={UserCheck} label="Logged in" value={number(analytics.overview.portalLogins)} detail="Successful portal logins" tone="action" />
              <MetricCard icon={AlertCircle} label="Failed logins" value={number(analytics.overview.portalLoginFailures)} detail="Access was denied" tone="neutral" />
            </div>
          </section>

          <section className="grid gap-[16px] xl:grid-cols-2">
            <LoginHealth data={analytics} />
            <LeadHealth data={analytics} />
          </section>

          <SignalRegister data={analytics} />

          <SignalFeed signals={signals} />

          <section className="grid gap-[16px] xl:grid-cols-[1.4fr_0.6fr]">
            <DailyTrafficGrid rows={analytics.content.dailyTraffic} />
            <HourlyTraffic rows={analytics.content.hourlyTraffic} />
          </section>

          <section className="grid gap-[16px] lg:grid-cols-2 xl:grid-cols-4">
            <BreakdownList title="Traffic sources" icon={Search} rows={analytics.acquisition.referrers} empty="No source data available." />
            <BreakdownList title="Page sections" icon={Compass} rows={analytics.content.pageGroups} empty="No page group data available." />
            <BreakdownList title="Devices" icon={Smartphone} rows={analytics.audience.devices} empty="No device data available." />
            <BreakdownList title="Browsers" icon={Laptop} rows={analytics.audience.browsers} empty="No browser data available." />
          </section>

          <section className="grid gap-[16px] xl:grid-cols-2">
            <PageList title="Top pages" rows={analytics.content.topPages} />
            <PageList title="Landing pages" rows={analytics.acquisition.landingPages} />
          </section>

          <VisitorList visitors={analytics.audience.recentVisitors} />

          {practiceAnalytics ? <HomePracticePerformance analytics={practiceAnalytics} /> : null}

          <section className="hud-panel p-[16px] sm:p-[20px]">
            <div className="mb-[12px] flex items-center gap-[8px]">
              <TrendingUp className="h-[16px] w-[16px] text-[color:var(--color-brand)]" />
              <h3 className="text-sm font-semibold text-[color:var(--color-text)]">Current reading</h3>
            </div>
            {analytics.insights.length ? (
              <div className="grid gap-[8px] sm:grid-cols-2 xl:grid-cols-3">
                {analytics.insights.map((insight) => (
                  <p key={insight} className="min-w-[0px] rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] p-[12px] text-sm leading-relaxed text-[color:var(--color-text-dim)]">
                    {insight}
                  </p>
                ))}
              </div>
            ) : (
              <EmptyBlock>No automatic reading is available for this window.</EmptyBlock>
            )}
          </section>

          <p className="flex items-center gap-[8px] text-xs text-[color:var(--color-text-faint)]">
            <Activity className="h-[14px] w-[14px]" />
            Counts cover the loaded analytics window. Lifetime totals are shown in the signal register.
          </p>
        </div>
      ) : (
        <EmptyBlock>Website analytics is not configured yet.</EmptyBlock>
      )}
    </PageShell>
  );
}
