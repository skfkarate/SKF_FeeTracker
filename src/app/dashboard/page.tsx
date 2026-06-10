"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  LayoutGrid,
  Sparkles,
  Wallet,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";

type BranchSummary = DashboardStats & {
  branch: "MPSC" | "Herohalli";
  label: string;
  href: string;
};

const priorityLinks = [
  {
    href: "/pending-fees",
    title: "Pending Fees",
    description: "Follow up monthly dues",
    icon: Clock3,
  },
  {
    href: "/notification-timeline",
    title: "Notification Timeline",
    description: "Events, birthdays and poster days",
    icon: CalendarDays,
  },
  {
    href: "/finances",
    title: "Master Ledger",
    description: "Open receipts and fee ledger",
    icon: Wallet,
  },
  {
    href: "/website-analytics",
    title: "Website Analytics",
    description: "Visitor traffic and page insights",
    icon: Globe2,
  },
];

const DASHBOARD_RETRY_DELAY_MS = 5000;

export default function DashboardPage() {
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
      <Navbar rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-32 pb-24">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">System Online</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome back, <span className="capitalize text-zinc-400">{user}</span>.
            </h1>
          </div>
          <div className="hidden rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-medium text-zinc-500 md:flex md:items-center md:gap-2">
            <Activity className="h-3.5 w-3.5 text-zinc-400" />
            <span>FeeTrack Console</span>
          </div>
        </header>

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

        <section className="card-panel mb-6 overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-zinc-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1.5 text-sm font-semibold text-white">Monthly Status</h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                    {!stats.loaded
                      ? "Calculating current month collections..."
                      : stats.rate === 100
                        ? "100% collection rate for active students this month."
                        : `Collection is at ${stats.rate}%. Pending amount is ₹${stats.pendingAmount.toLocaleString("en-IN")} across ${stats.pendingStudents} students.`}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        !stats.loaded
                          ? "border-zinc-700 bg-zinc-800 text-zinc-500"
                          : stats.rate >= 80
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : stats.rate >= 50
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {stats.loaded && stats.rate >= 80 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {!stats.loaded ? "Calculating" : stats.rate >= 80 ? "Healthy" : "Needs Follow-up"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                      <FileText className="h-3 w-3" />
                      Month End: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800 sm:divide-y-0 lg:divide-y">
              {[
                { label: "Collected", value: `₹${stats.totalCollected.toLocaleString("en-IN")}`, icon: Wallet },
                { label: "Pending", value: `₹${stats.pendingAmount.toLocaleString("en-IN")}`, icon: AlertCircle },
                { label: "Students", value: stats.activeStudents.toLocaleString("en-IN"), icon: LayoutGrid },
                { label: "Rate", value: `${stats.rate}%`, icon: Activity },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="min-h-28 p-4 sm:p-5">
                    <Icon className="mb-3 h-4 w-4 text-zinc-500" />
                    <p className="text-xs uppercase tracking-widest text-zinc-600">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{stats.loaded ? item.value : "..."}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="card-panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Branches</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Collection Snapshot</h2>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">Current Month</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(stats.branches.length ? stats.branches : [
                { branch: "MPSC", label: "MP", href: "/students/MPSC", totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
                { branch: "Herohalli", label: "Herohalli", href: "/students/Herohalli", totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
              ] as BranchSummary[]).map((branch) => {
                const expected = branch.totalCollected + branch.pendingAmount;
                const rate = expected > 0 ? Math.round((branch.totalCollected / expected) * 100) : 0;
                return (
                  <Link
                    key={branch.branch}
                    href={branch.href}
                    className="group rounded-xl border border-zinc-800 bg-black p-4 transition-colors hover:border-zinc-600 hover:bg-zinc-950"
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-600">Branch</p>
                        <h3 className="mt-1 text-xl font-semibold text-white">{branch.label}</h3>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-white" />
                    </div>
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className={`h-full rounded-full ${rate >= 80 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-zinc-600">Rate</p>
                        <p className="mt-1 font-semibold text-white">{stats.loaded ? `${rate}%` : "..."}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Paid</p>
                        <p className="mt-1 font-semibold text-white">{stats.loaded ? branch.paidCount : "..."}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Pending</p>
                        <p className="mt-1 font-semibold text-white">{stats.loaded ? branch.pendingCount : "..."}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="card-panel p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Priority</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Today</h2>
            </div>
            <div className="grid gap-2">
              {priorityLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-16 items-center gap-3 rounded-xl border border-zinc-800 bg-black px-3 py-2 transition-colors hover:border-zinc-600 hover:bg-zinc-950"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-500 transition-colors group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-600">{item.description}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-zinc-700 transition-colors group-hover:text-white" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
