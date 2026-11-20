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
import NavMenu from "@/components/common/NavMenu";
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
import { DASHBOARD_PRIORITY_TILES, DASHBOARD_SECONDARY_TILES } from "@/lib/navigation";

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
  const branches = stats.branches.length
    ? stats.branches
    : ([
        { branch: "MPSC", label: "MP", href: "/students/MPSC", totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
        { branch: "Herohalli", label: "Herohalli", href: "/students/Herohalli", totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
      ] as BranchSummary[]);

  return (
    <PageTransition>
      <PageShell
        hud={{
          title: "Today",
          monthLabel,
          actions: <GlobalSearch />,
          bell: <NotificationBell />,
          account: <NavMenu />,
        }}
      >
        <p className="mb-6 text-[13px] text-zinc-500">
          Welcome back, <span className="capitalize text-zinc-300">{user}</span>. Here is what needs attention.
        </p>

        {dashboardError ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Dashboard stats are waiting for the SKF-Karate backend.</p>
              <p className="mt-1 text-amber-100/75">{dashboardError}</p>
              <p className="mt-1 text-xs text-amber-100/60">Retrying automatically every few seconds.</p>
            </div>
          </div>
        ) : null}

        <section className="hud-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-pixel-label text-zinc-400">Needs action</p>
              <p className="font-pixel mt-2 text-[40px] leading-none text-white">
                {stats.loaded ? num(stats.pendingStudents) : "—"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {stats.loaded
                  ? `Pending across MPSC and Herohalli · ${monthLabel}`
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

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Collected" value={stats.loaded ? num(stats.totalCollected) : "—"} tone="settled" icon={<Wallet className="h-4 w-4" />} />
          <StatTile label="Pending" value={stats.loaded ? num(stats.pendingAmount) : "—"} tone="overdue" icon={<AlertCircle className="h-4 w-4" />} />
          <StatTile label="Students" value={stats.loaded ? num(stats.activeStudents) : "—"} icon={<LayoutGrid className="h-4 w-4" />} />
          <StatTile label="Rate" value={stats.loaded ? `${stats.rate}%` : "—"} tone="action" icon={<Activity className="h-4 w-4" />} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-white">Run list</h2>
              <span className="font-pixel-label text-zinc-500">Urgency first</span>
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
                    amount={stats.loaded ? num(branch.pendingAmount) : "—"}
                    amountLabel="pending"
                    trailing={
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                        <StatusPill status={status} label={stats.loaded ? `${rate}%` : "..."} />
                      </div>
                    }
                    onClick={() => router.push(branch.href)}
                  />
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-white">Shortcuts</h2>
              <span className="font-pixel-label text-zinc-500">Open</span>
            </div>
            <div className="space-y-2">
              {DASHBOARD_PRIORITY_TILES.map((item, index) => {
                const Icon = item.icon;
                return (
                  <LedgerRow
                    key={item.href}
                    index={index}
                    status="due"
                    title={item.title}
                    subtitle={item.description}
                    trailing={
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                        <StatusPill status="due" label="Open" />
                      </div>
                    }
                    onClick={() => router.push(item.href)}
                  />
                );
              })}
            </div>
            {DASHBOARD_SECONDARY_TILES.length ? (
              <div className="mt-6">
                <p className="mb-2 font-pixel-label text-zinc-500">More</p>
                <div className="space-y-2">
                  {DASHBOARD_SECONDARY_TILES.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <LedgerRow
                        key={item.href}
                        index={index}
                        title={item.title}
                        subtitle={item.description}
                        trailing={<Icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />}
                        onClick={() => router.push(item.href)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </PageShell>
    </PageTransition>
  );
}
