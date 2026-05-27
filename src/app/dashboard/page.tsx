"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Wallet, PiggyBank, LayoutGrid, Activity, Sparkles, FileText, CheckCircle2, AlertCircle, ShieldCheck, Trophy } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getDashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const { user, checking } = useFeeTrackAuth();
  const [stats, setStats] = useState<{
    loaded: boolean;
    rate: number;
    pendingStudents: number;
    pendingAmount: number;
  }>({ loaded: false, rate: 0, pendingStudents: 0, pendingAmount: 0 });

  useEffect(() => {
    if (checking || !user) return;
    const currentMonth = new Date().getMonth();
    Promise.all([
      getDashboardStats("MPSC", currentMonth),
      getDashboardStats("Herohalli", currentMonth),
    ]).then(([mp, hero]) => {
      const totalCollected = mp.totalCollected + hero.totalCollected;
      const totalPendingAmt = mp.pendingAmount + hero.pendingAmount;
      const expected = totalCollected + totalPendingAmt;
      const rate = expected > 0 ? Math.round((totalCollected / expected) * 100) : 0;
      setStats({
        loaded: true,
        rate,
        pendingStudents: mp.pendingCount + hero.pendingCount,
        pendingAmount: totalPendingAmt,
      });
    });
  }, [user, checking]);

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar rightContent={<NavMenu />} />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        
        {/* Header Section */}
        <header className="mb-14 animate-fade-in flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">System Online</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-4xl font-semibold tracking-tight text-white mt-2">
              Welcome back, <span className="capitalize text-zinc-400">{user}</span>.
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-500 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>Treasury Control Center</span>
          </div>
        </header>

        {/* Insights / AI Recommendations Panel */}
        <div className="mb-10 animate-slide-up delay-100">
          <div className="card-panel p-6 bg-gradient-to-r from-zinc-900 to-black relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-300 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Weekly Insights & Tasks</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl mb-4 min-h-[3rem]">
                  {!stats.loaded ? (
                    "Analyzing treasury data..."
                  ) : stats.rate === 100 ? (
                    "Incredible! 100% collection rate achieved. All active students are fully paid for this month. Excellent work."
                  ) : (
                    `Fee collection is at ${stats.rate}%. You have ₹${stats.pendingAmount.toLocaleString()} pending across ${stats.pendingStudents} students. Focus on following up with overdue accounts to hit target.`
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md border ${
                    !stats.loaded ? "bg-zinc-800 text-zinc-500 border-zinc-700" :
                    stats.rate >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    stats.rate >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {stats.loaded && stats.rate >= 80 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} 
                    {!stats.loaded ? "Calculating Health" : stats.rate >= 80 ? "System Healthy" : "Needs Attention"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-700">
                    <FileText className="w-3 h-3" /> Month End: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}{(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() === 31) ? "st" : "th"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Branches Section (Left column on large screens) */}
          <div className="lg:col-span-7 space-y-6 animate-slide-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Dojos</h2>
              <span className="text-[10px] text-zinc-600 font-mono">2 Branches</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/students/MPSC" className="card-panel group block relative overflow-hidden h-44 p-6 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-600 transition-colors">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
                <div className="mt-6">
                  <h3 className="text-xl font-medium text-zinc-100 mb-1">MP</h3>
                  <p className="text-xs text-zinc-500 font-mono">Headquarters</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-zinc-800 to-transparent group-hover:from-zinc-300 transition-all duration-500" />
              </Link>

              <Link href="/students/Herohalli" className="card-panel group block relative overflow-hidden h-44 p-6 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-600 transition-colors">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
                <div className="mt-6">
                  <h3 className="text-xl font-medium text-zinc-100 mb-1">Herohalli</h3>
                  <p className="text-xs text-zinc-500 font-mono">Secondary Branch</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-zinc-800 to-transparent group-hover:from-zinc-400 transition-all duration-500" />
              </Link>
            </div>
          </div>

          {/* Treasury Section (Right column) */}
          <div className="lg:col-span-5 space-y-6 animate-slide-up delay-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Global Finance</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              <Link href="/verifications" className="card-panel group flex items-center p-5 gap-5 hover:bg-zinc-900/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 group-hover:border-zinc-700 transition-colors shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Action Inbox</h3>
                  <p className="text-xs text-zinc-500 mt-1">Priority queue & pending actions</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </Link>

              <Link href="/finances" className="card-panel group flex items-center p-5 gap-5 hover:bg-zinc-900/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-700 transition-colors shadow-sm">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Master Ledger</h3>
                  <p className="text-xs text-zinc-500 mt-1">Review all consolidated collections</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </Link>

              <Link href="/admissions" className="card-panel group flex items-center p-5 gap-5 hover:bg-zinc-900/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-zinc-700 transition-colors shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Admissions</h3>
                  <p className="text-xs text-zinc-500 mt-1">Approve students and manage promo codes</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </Link>

              <Link href="/events" className="card-panel group flex items-center p-5 gap-5 hover:bg-zinc-900/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 group-hover:border-zinc-700 transition-colors shadow-sm">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Event Collections</h3>
                  <p className="text-xs text-zinc-500 mt-1">Belt exams, tournaments and deposits</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </Link>

              <Link href="/analytics" className="card-panel group flex items-center p-5 gap-5 hover:bg-zinc-900/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-700 transition-colors shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Analytics & Reports</h3>
                  <p className="text-xs text-zinc-500 mt-1">Macro-trends and revenue insights</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </Link>

              <Link href="/development" className="card-panel group flex items-center p-5 gap-5 hover:bg-zinc-900/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-700 transition-colors shadow-sm">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Development Fund</h3>
                  <p className="text-xs text-zinc-500 mt-1">30% reserved capital overview</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
