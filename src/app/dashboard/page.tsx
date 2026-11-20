"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  LayoutGrid,
  Wallet,
} from "lucide-react";

import GlobalSearch from "@/components/common/GlobalSearch";
import AccountMenu from "@/components/common/AccountMenu";
import NotificationBell from "@/components/common/NotificationBell";
import { PageTransition } from "@/components/common/PageTransition";
import { SkeletonDashboard } from "@/components/common/Skeleton";
import LedgerRow from "@/components/ui/LedgerRow";
import MeterRing from "@/components/ui/MeterRing";
import PageShell from "@/components/ui/PageShell";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getDisplayName } from "@/lib/display-name";

type BranchSummary = DashboardStats & {
  branch: "MPSC" | "Herohalli";
  label: string;
  href: string;
};

const DASHBOARD_RETRY_DELAY_MS = 5000;

function num(amount: number) {
  return Math.round(Number(amount) || 0).toLocaleString("en-IN");
}

function branchStatus(rate: number): LedgerStatus {
  if (rate >= 80) return "paid";
  if (rate >= 50) return "partial";
  return "overdue";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, checking } = useFeeTrackAuth();
  const [dashboardError, setDashboardError] = useState("");
  const [stats, setStats] = useState<{
    loaded: boolean;
    rate: number;
    pendingStudents: number;
    pendingAmount: number;
    totalCollected: number;
    activeStudents: number;
    branches: BranchSummary[];
  }>({
    loaded: false,
    rate: 0,
    pendingStudents: 0,
    pendingAmount: 0,
    totalCollected: 0,
    activeStudents: 0,
    branches: [],
  });

  useEffect(() => {
    if (checking || !user) return;
    let active = true;
    let retryTimeoutId: number | undefined;
    const currentMonth = new Date().getMonth();

    const loadDashboardStats = async () => {
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
        retryTimeoutId = undefined;
      }

      try {
        const [mp, hero] = await Promise.all([
          getDashboardStats("MPSC", currentMonth),
          getDashboardStats("Herohalli", currentMonth),
        ]);

        if (!active) return;
        const totalCollected = mp.totalCollected + hero.totalCollected;
        const totalPendingAmt = mp.pendingAmount + hero.pendingAmount;
        const expected = totalCollected + totalPendingAmt;
        const rate = expected > 0 ? Math.round((totalCollected / expected) * 100) : 0;
        setDashboardError("");
        setStats({
          loaded: true,
          rate,
          pendingStudents: mp.pendingCount + hero.pendingCount,
          pendingAmount: totalPendingAmt,
          totalCollected,
          activeStudents: mp.activeStudents + hero.activeStudents,
          branches: [
            { ...mp, branch: "MPSC", label: "MP", href: "/students/MPSC" },
            { ...hero, branch: "Herohalli", label: "Herohalli", href: "/students/Herohalli" },
          ],
        });
      } catch (error) {
        if (!active) return;
        setDashboardError(error instanceof Error ? error.message : "Dashboard stats could not be loaded.");
        setStats((current) => ({ ...current, loaded: false }));
        retryTimeoutId = window.setTimeout(loadDashboardStats, DASHBOARD_RETRY_DELAY_MS);
      }
    };

    void loadDashboardStats();

    return () => {
      active = false;
      if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
    };
  }, [user, checking]);

  if (checking || !user) {
    return <SkeletonDashboard />;
  }

  const monthLabel = new Date().toLocaleString("en-IN", { month: "short", year: "numeric" });
  const branches = (stats.branches.length
    ? stats.branches
    : ([
        { branch: "MPSC", label: "MP", href: "/students/MPSC", totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
        { branch: "Herohalli", label: "Herohalli", href: "/students/Herohalli", totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
      ] as BranchSummary[]))
    .slice()
    .sort((a, b) => b.pendingAmount - a.pendingAmount);

  return (
    <PageTransition>
      <PageShell
        hud={{
          title: "Today",
          monthLabel,
          actions: <GlobalSearch />,
          bell: <NotificationBell />,
          account: <AccountMenu />,
        }}
      >
        <header className="mb-4">
          <p className="eyebrow text-[color:var(--color-text-faint)]">{monthLabel}</p>
          <h2 className="font-display mt-2 text-[clamp(1.45rem,1.2rem+1vw,2rem)] leading-tight text-[color:var(--color-text)]">
            {greeting()}, {getDisplayName(user)}.
          </h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-dim)]">
            Here is what needs attention across both dojos.
          </p>
        </header>

        {dashboardError ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[color:var(--color-overdue-border)] bg-[color:var(--color-overdue-dim)] p-4 text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--color-overdue)]" />
            <div className="min-w-0">
              <p className="font-semibold">Dashboard stats are waiting for the SKF-Karate backend.</p>
              <p className="mt-1 break-words text-[color:var(--color-text-dim)]">{dashboardError}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-faint)]">Retrying automatically every few seconds.</p>
            </div>
          </div>
        ) : null}

        <section className="hud-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow text-[color:var(--color-text-faint)]">Needs attention</p>
              <p className="numeric mt-3 break-words text-[clamp(2rem,1.5rem+2.2vw,3rem)] leading-none text-[color:var(--color-text)]">
                ₹{stats.loaded ? num(stats.pendingAmount) : "—"}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-text-dim)] sm:text-sm">
                {stats.loaded
                  ? `${num(stats.pendingStudents)} students pending across MPSC and Herohalli`
                  : "Calculating current month collections..."}
              </p>
            </div>
            <MeterRing
              value={stats.rate}
              caption="collection rate"
              tone={stats.rate >= 80 ? "settled" : stats.rate >= 50 ? "action" : "overdue"}
            />
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4">
          <StatTile label="Collected" value={stats.loaded ? `₹${num(stats.totalCollected)}` : "—"} tone="settled" icon={<Wallet className="h-4 w-4" />} />
          <StatTile label="Pending" value={stats.loaded ? `₹${num(stats.pendingAmount)}` : "—"} tone="overdue" icon={<AlertCircle className="h-4 w-4" />} />
          <StatTile label="Students" value={stats.loaded ? num(stats.activeStudents) : "—"} icon={<LayoutGrid className="h-4 w-4" />} />
          <StatTile label="Rate" value={stats.loaded ? `${stats.rate}%` : "—"} tone="action" icon={<Activity className="h-4 w-4" />} />
        </div>

        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[clamp(1.05rem,1rem+0.35vw,1.3rem)] text-[color:var(--color-text)]">
              Branch run list
            </h2>
            <span className="eyebrow text-[color:var(--color-text-faint)]">Highest dues first</span>
          </div>

          <div className="space-y-2">
            {branches.map((branch, index) => {
              const expected = branch.totalCollected + branch.pendingAmount;
              const rate = expected > 0 ? Math.round((branch.totalCollected / expected) * 100) : 0;
              const status = branchStatus(rate);
              return (
                <LedgerRow
                  key={branch.branch}
                  index={index}
                  status={status}
                  title={branch.label}
                  subtitle={`${branch.paidCount} paid · ${branch.pendingCount} pending`}
                  idLabel={`BRANCH · ${monthLabel.toUpperCase()}`}
                  amount={stats.loaded ? `₹${num(branch.pendingAmount)}` : "—"}
                  amountLabel="pending"
                  trailing={
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-[color:var(--color-text-faint)]" aria-hidden="true" />
                      <StatusPill status={status} label={stats.loaded ? `${rate}%` : "..."} />
                    </div>
                  }
                  onClick={() => router.push(branch.href)}
                />
              );
            })}
          </div>
        </section>
      </PageShell>
    </PageTransition>
  );
}
