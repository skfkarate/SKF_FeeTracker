"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Activity, AlertCircle, BarChart3, Calendar, IndianRupee, RefreshCw, TrendingUp } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { getDevelopmentFundData, MonthlyDevFund } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function readMonthlyAmount(row: MonthlyDevFund | undefined, keys: string[]) {
  if (!row) return 0;
  const raw = row as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = Number(raw[key] || 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export default function AnalyticsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [data, setData] = useState<MonthlyDevFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (checking || !user) return;
    setLoading(true);
    setError("");
    const year = getCurrentFeeYear();
    try {
      const res = await getDevelopmentFundData(year, true);
      setData(res.monthlyBreakdown || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [checking, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAnalytics]);

  const monthlyData = useMemo(() => {
    const byMonth = new Map<number, MonthlyDevFund>();
    for (const row of data) {
      const monthIndex = Number(row.month);
      if (Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
        byMonth.set(monthIndex, row);
      }
    }

    return Array.from({ length: 12 }, (_, month) => {
      const row = byMonth.get(month);
      return {
        month,
        year: String(row?.year || getCurrentFeeYear()),
        collected: readMonthlyAmount(row, [
          "collected",
          "grossIncome",
          "monthlyCollected",
          "monthlyCash",
          "totalCollected",
        ]),
        devFund: readMonthlyAmount(row, [
          "devFund",
          "developmentAllocation",
          "developmentFund",
          "devFundAllocation",
        ]),
        spent: readMonthlyAmount(row, ["spent", "developmentExpenses", "expenses"]),
        carryForward: Number(row?.carryForward || 0),
      };
    });
  }, [data]);

  const stats = useMemo(() => {
    const totalCollected = monthlyData.reduce((sum, m) => sum + m.collected, 0);
    const totalDevFund = monthlyData.reduce((sum, m) => sum + m.devFund, 0);
    const totalSpent = monthlyData.reduce((sum, m) => sum + m.spent, 0);
    const monthsWithData = monthlyData.filter((m) => m.collected > 0).length || 1;
    const avgMonthly = Math.round(totalCollected / monthsWithData);
    const maxCollected = Math.max(...monthlyData.map(m => m.collected), 1);
    
    return { totalCollected, totalDevFund, totalSpent, avgMonthly, maxCollected };
  }, [monthlyData]);

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Analytics" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-32 pb-24">
        
        <header className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Financial Intelligence</p>
          </div>
          <h1 className="font-[family-name:var(--font-space)] text-4xl font-semibold tracking-tight text-white mt-2">
            Revenue Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl leading-relaxed">
            Macro-level view of your treasury&apos;s performance over the {getCurrentFeeYear()} fiscal year.
          </p>
        </header>

        {error ? (
          <div className="card-panel flex flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="max-w-xl text-sm text-red-200">{error}</p>
            <button
              type="button"
              onClick={loadAnalytics}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-panel p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <IndianRupee className="w-16 h-16 text-emerald-500" />
                </div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Total YTD Revenue
                </p>
                <p className="font-[family-name:var(--font-space)] text-3xl font-medium text-white">
                  ₹{stats.totalCollected.toLocaleString()}
                </p>
              </div>

              <div className="card-panel p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar className="w-16 h-16 text-zinc-400" />
                </div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Avg Monthly Run Rate
                </p>
                <p className="font-[family-name:var(--font-space)] text-3xl font-medium text-white">
                  ₹{stats.avgMonthly.toLocaleString()}
                </p>
              </div>

              <div className="card-panel p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity className="w-16 h-16 text-amber-400" />
                </div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Development Fund
                </p>
                <p className="font-[family-name:var(--font-space)] text-3xl font-medium text-white">
                  ₹{stats.totalDevFund.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Main Bar Chart */}
            <div className="card-panel p-8">
              <h3 className="text-sm font-semibold text-white mb-8 flex items-center gap-2">
                Monthly Gross Collection <span className="text-zinc-600 font-normal text-xs">({getCurrentFeeYear()})</span>
              </h3>
              
              <div className="overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                <div className="h-72 min-w-[560px] border-t border-zinc-800/50 pt-4">
                  {stats.totalCollected <= 0 ? (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-black/20 text-center">
                      <p className="px-4 text-sm text-zinc-500">
                        No monthly gross collection has been recorded for {getCurrentFeeYear()} yet.
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full items-stretch gap-2 sm:gap-4">
                      {monthlyData.map((monthData, i) => {
                        const height = monthData.collected > 0 ? (monthData.collected / stats.maxCollected) * 100 : 0;
                        const isCurrent = i === new Date().getMonth();
                        
                        return (
                          <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                            {/* Tooltip */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                              ₹{monthData.collected.toLocaleString()}
                            </div>

                            <span className="h-5 text-[10px] font-semibold tabular-nums text-zinc-500">
                              {monthData.collected > 0 ? `₹${monthData.collected.toLocaleString()}` : ""}
                            </span>

                            {/* Bar */}
                            <div className="relative flex min-h-0 w-full flex-1 items-end justify-center rounded-t bg-black/25">
                              <div
                                data-analytics-bar="collection"
                                aria-label={`${MONTHS[i]} collection ₹${monthData.collected.toLocaleString()}`}
                                className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${
                                  isCurrent ? "bg-emerald-500/80" : "bg-zinc-700/50 group-hover:bg-zinc-600"
                                }`}
                                style={{ height: height > 0 ? `${Math.max(height, 4)}%` : "0%" }}
                              />
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] uppercase tracking-wider ${isCurrent ? "text-emerald-400 font-bold" : "text-zinc-500"}`}>
                              {MONTHS[i]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
