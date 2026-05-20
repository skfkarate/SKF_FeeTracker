"use client";

import { useEffect, useState, useMemo } from "react";
import { Activity, TrendingUp, BarChart3, Calendar, IndianRupee } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { getDevelopmentFundData, MonthlyDevFund } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [data, setData] = useState<MonthlyDevFund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checking || !user) return;
    const year = getCurrentFeeYear();
    getDevelopmentFundData(year).then((res) => {
      setData(res.monthlyBreakdown || []);
      setLoading(false);
    });
  }, [user, checking]);

  const stats = useMemo(() => {
    const totalCollected = data.reduce((sum, m) => sum + m.collected, 0);
    const monthsWithData = data.filter((m) => m.collected > 0).length || 1;
    const avgMonthly = Math.round(totalCollected / monthsWithData);
    const maxCollected = Math.max(...data.map(m => m.collected), 1);
    
    return { totalCollected, avgMonthly, maxCollected };
  }, [data]);

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Analytics" rightContent={<NavMenu />} />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Main Bar Chart */}
            <div className="card-panel p-8">
              <h3 className="text-sm font-semibold text-white mb-8 flex items-center gap-2">
                Monthly Gross Collection <span className="text-zinc-600 font-normal text-xs">({getCurrentFeeYear()})</span>
              </h3>
              
              <div className="overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                <div className="h-64 flex items-end gap-2 sm:gap-4 mt-8 pt-4 border-t border-zinc-800/50 min-w-[480px]">
                  {data.map((monthData, i) => {
                    const height = monthData.collected > 0 ? (monthData.collected / stats.maxCollected) * 100 : 0;
                    const isCurrent = i === new Date().getMonth();
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                          ₹{monthData.collected.toLocaleString()}
                        </div>
                        
                        {/* Bar */}
                        <div className="w-full relative flex items-end justify-center h-full">
                          <div 
                            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${
                              isCurrent ? "bg-emerald-500/80" : "bg-zinc-700/50 group-hover:bg-zinc-600"
                            }`}
                            style={{ height: `${Math.max(height, 1)}%` }}
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
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
