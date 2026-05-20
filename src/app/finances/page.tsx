"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Clock,
  Gift,
  Package,
  PiggyBank,
  RefreshCw,
  Shirt,
  Ticket,
  Wallet,
} from "lucide-react";

import {
  FinanceCommandCenterData,
  FinanceLedgerRow,
  getFinanceCommandCenter,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";

import MonthSelector from "@/components/common/MonthSelector";
import Navbar from "@/components/common/Navbar";

const BRANCHES = [
  { value: "Overall", label: "OVERALL" },
  { value: "Herohalli", label: "HEROHALLI" },
  { value: "MPSC", label: "MP SPORTS" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function currency(amount: number) {
  const rounded = Math.round(Number(amount) || 0);
  const prefix = rounded < 0 ? "-₹" : "₹";
  return `${prefix}${Math.abs(rounded).toLocaleString("en-IN")}`;
}

function toneClass(tone: "green" | "amber" | "blue" | "red" | "purple" | "white") {
  const map = {
    green: "text-green-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    red: "text-red-400",
    purple: "text-purple-400",
    white: "text-white",
  };
  return map[tone];
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  tone: "green" | "amber" | "blue" | "red" | "purple" | "white";
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-card p-4 text-left relative overflow-hidden transition-all ${
        active ? "border-white/30 bg-white/[0.04]" : "hover:border-white/15"
      }`}
    >
      <Icon className={`absolute right-3 top-3 w-10 h-10 opacity-10 ${toneClass(tone)}`} />
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <p className={`font-[family-name:var(--font-space)] text-xl ${toneClass(tone)}`}>
        {value}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-1">{note}</p>
    </button>
  );
}

function ledgerTone(row: FinanceLedgerRow) {
  if (row.type === "expense" || row.type === "credit") return "text-red-400";
  if (row.type === "pending") return "text-amber-400";
  return "text-green-400";
}

function rowMatchesFormula(row: FinanceLedgerRow, formulaKey: string) {
  if (formulaKey === "all") return row.type !== "pending";
  if (formulaKey === "expected") return true;
  if (formulaKey === "monthlyFeeCash") {
    return row.formulaKey === "monthlyFeeCash" || row.formulaKey === "creditsApplied";
  }
  if (formulaKey === "grossIncome") {
    return [
      "monthlyFeeCash",
      "creditsApplied",
      "admissionCollected",
      "dressProfit",
    ].includes(row.formulaKey);
  }
  return row.formulaKey === formulaKey;
}

export default function FinancesPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [branch, setBranch] = useState("Overall");
  const [month, setMonth] = useState<number | null>(null);
  const [data, setData] = useState<FinanceCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFormula, setActiveFormula] = useState("all");

  useEffect(() => {
    if (!checking && user && month === null) {
      setMonth(new Date().getMonth());
    }
  }, [checking, month, user]);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!user || checking || month === null) return;
      setLoading(true);
      setError("");
      try {
        const result = await getFinanceCommandCenter(
          branch,
          month,
          forceRefresh,
          feeYear,
        );
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load finance data");
      } finally {
        setLoading(false);
      }
    },
    [branch, checking, feeYear, month, user],
  );

  useEffect(() => {
    if (!checking && user && month !== null) {
      setActiveFormula("all");
      loadData();
    }
  }, [branch, checking, loadData, month, user]);

  const filteredLedger = useMemo(() => {
    if (!data) return [];
    return data.ledgerRows.filter((row) => rowMatchesFormula(row, activeFormula));
  }, [activeFormula, data]);

  const maxFlow = useMemo(() => {
    if (!data) return 1;
    return Math.max(
      1,
      ...data.cashFlowByMonth.map((row) => Math.max(Math.abs(row.income), row.expenses)),
    );
  }, [data]);

  if (checking || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Navbar
        title="FINANCE"
        showBack
        rightContent={
          <div className="scale-90 origin-right">
            <MonthSelector
              selectedMonth={month ?? 0}
              year={feeYear}
              onMonthChange={setMonth}
            />
          </div>
        }
      />

      <main className="max-w-3xl mx-auto p-4 pt-24 pb-12">
        <div className="flex p-1 bg-black/20 rounded-xl w-full border border-white/5 mb-5">
          {BRANCHES.map((option) => (
            <button
              key={option.value}
              onClick={() => setBranch(option.value)}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-[family-name:var(--font-space)] tracking-wider transition-all ${
                branch === option.value
                  ? "bg-[var(--surface)] text-white border border-white/10"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Loading finance command center...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <button onClick={() => loadData(true)} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            <section
              className="glass-card p-5 sm:p-6"
              style={{ borderColor: "rgba(34, 197, 94, 0.35)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)] mb-2">
                    {data.branch} • {data.periodLabel}
                  </p>
                  <h1
                    className={`font-[family-name:var(--font-space)] text-3xl sm:text-4xl ${
                      data.summary.availableBalance < 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {currency(data.summary.availableBalance)}
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xl">
                    {data.formulas.availableBalance}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="Refresh finance data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Income</p>
                  <p
                    className={`font-[family-name:var(--font-space)] ${
                      data.summary.grossIncome < 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {currency(data.summary.grossIncome)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Expenses</p>
                  <p className="text-red-400 font-[family-name:var(--font-space)]">
                    {currency(data.summary.developmentExpenses)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Net</p>
                  <p
                    className={`font-[family-name:var(--font-space)] ${
                      data.summary.grossIncome - data.summary.developmentExpenses < 0
                        ? "text-red-400"
                        : "text-blue-400"
                    }`}
                  >
                    {currency(data.summary.grossIncome - data.summary.developmentExpenses)}
                  </p>
                </div>
              </div>
            </section>

            {data.warnings.length > 0 && (
              <section className="space-y-2">
                {data.warnings.map((warning) => (
                  <div
                    key={warning.message}
                    className={`glass-card p-3 flex items-start gap-3 ${
                      warning.level === "danger"
                        ? "text-red-300"
                        : "text-amber-300"
                    }`}
                    style={{
                      borderColor:
                        warning.level === "danger"
                          ? "rgba(239, 68, 68, 0.35)"
                          : "rgba(245, 158, 11, 0.35)",
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{warning.message}</p>
                  </div>
                ))}
              </section>
            )}

            <section className="card-panel p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h2 className="text-white text-lg font-medium tracking-wide">Fee Position</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  label="Expected"
                  value={currency(data.summary.expected)}
                  note={`${data.summary.activeStudents} fee-active students`}
                  icon={BarChart3}
                  tone="blue"
                  active={activeFormula === "expected"}
                  onClick={() => setActiveFormula("expected")}
                />
                <MetricCard
                  label="Collected"
                  value={currency(data.summary.collected)}
                  note={`${data.summary.paidStudents} students paid`}
                  icon={CheckCircle2}
                  tone="green"
                  active={activeFormula === "monthlyFeeCash"}
                  onClick={() => setActiveFormula("monthlyFeeCash")}
                />
                <MetricCard
                  label="Pending"
                  value={currency(data.summary.pending)}
                  note={`${data.summary.pendingStudents} students pending`}
                  icon={Clock}
                  tone="amber"
                  active={activeFormula === "pending"}
                  onClick={() => setActiveFormula("pending")}
                />
                <MetricCard
                  label="Collection"
                  value={`${data.summary.collectionRate}%`}
                  note="Paid students / active students"
                  icon={Calculator}
                  tone="white"
                  onClick={() => setActiveFormula("all")}
                />
              </div>
            </section>

            <section className="card-panel p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-white text-lg font-medium tracking-wide">Calculation</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFormula("all")}
                  className="text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-md"
                >
                  Show all ledger rows
                </button>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                {[...data.incomeBreakdown, ...data.expenseBreakdown].map((item) => {
                  const signedAmount = item.key === "developmentExpenses" ? -Math.abs(item.amount) : item.amount;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveFormula(item.key)}
                      className={`w-full p-4 flex items-start justify-between gap-4 border-b border-zinc-800 last:border-b-0 text-left hover:bg-zinc-800 transition-colors ${
                        activeFormula === item.key ? "bg-zinc-800/80" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm text-zinc-100 font-medium">{item.label}</p>
                        <p className="text-xs text-zinc-500 mt-1">{item.formula}</p>
                      </div>
                      <p
                        className={`font-[family-name:var(--font-space)] text-lg ${
                          signedAmount < 0 ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {signedAmount > 0 ? "+" : ""}
                        {currency(signedAmount)}
                      </p>
                    </button>
                  );
                })}
                <div className="p-4 flex items-start justify-between gap-4 border-t border-blue-500/20 bg-blue-500/5">
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Development fund contribution</p>
                    <p className="text-xs text-blue-300/60 mt-1">
                      {data.formulas.developmentFundContribution}
                    </p>
                  </div>
                  <p className="font-[family-name:var(--font-space)] text-lg text-blue-400">
                    {currency(data.summary.developmentFundContribution)}
                  </p>
                </div>
              </div>
            </section>

            <section className="card-panel p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-white text-lg font-medium tracking-wide">Fund & Tools</h2>
                </div>
                <Link
                  href="/development"
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 border border-amber-500/30 px-3 py-1.5 rounded-md bg-amber-500/5"
                >
                  Expense report <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  label="Gross Income"
                  value={currency(data.summary.grossIncome)}
                  note="Fee cash + admission + dress profit"
                  icon={Wallet}
                  tone={data.summary.grossIncome < 0 ? "red" : "green"}
                  active={activeFormula === "grossIncome"}
                  onClick={() => setActiveFormula("grossIncome")}
                />
                <MetricCard
                  label="Credits"
                  value={`-${currency(data.summary.creditsApplied)}`}
                  note="Reduces cash received"
                  icon={Gift}
                  tone="purple"
                  active={activeFormula === "creditsApplied"}
                  onClick={() => setActiveFormula("creditsApplied")}
                />
                <MetricCard
                  label="Expenses"
                  value={`-${currency(data.summary.developmentExpenses)}`}
                  note="Development spending"
                  icon={Package}
                  tone="red"
                  active={activeFormula === "developmentExpenses"}
                  onClick={() => setActiveFormula("developmentExpenses")}
                />
                <MetricCard
                  label="Fund Balance"
                  value={currency(data.summary.developmentFundBalance)}
                  note="30% income fund less expenses"
                  icon={PiggyBank}
                  tone="blue"
                  onClick={() => setActiveFormula("all")}
                />
              </div>
            </section>

            <section className="card-panel p-6">
              <div className="flex items-center gap-2 mb-6">
                <Ticket className="w-5 h-5 text-zinc-400" />
                <h2 className="text-white text-lg font-medium tracking-wide">Income Sources</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <Ticket className="w-5 h-5 text-blue-400 mb-3" />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Admission
                  </p>
                  <p className="font-[family-name:var(--font-space)] text-2xl text-blue-400">
                    {currency(data.summary.admissionCollected)}
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <Shirt className="w-5 h-5 text-pink-400 mb-3" />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Dress Profit
                  </p>
                  <p
                    className={`font-[family-name:var(--font-space)] text-2xl ${
                      data.summary.dressProfit < 0 ? "text-red-400" : "text-pink-400"
                    }`}
                  >
                    {currency(data.summary.dressProfit)}
                  </p>
                </div>
                <Link
                  href="/referrals"
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-purple-500/50 transition-colors"
                >
                  <Gift className="w-5 h-5 text-purple-400 mb-3" />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Referral Credits
                  </p>
                  <p className="font-[family-name:var(--font-space)] text-2xl text-purple-400">
                    {currency(data.summary.creditsApplied)}
                  </p>
                </Link>
              </div>
            </section>

            <section className="card-panel p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-zinc-400" />
                <h2 className="text-white text-lg font-medium tracking-wide">Year Cash Flow</h2>
              </div>
              <div className="space-y-4">
                {data.cashFlowByMonth
                  .filter((row) => row.income !== 0 || row.expenses > 0)
                  .map((row) => {
                    const incomeMagnitude = Math.abs(row.income);
                    const incomeTone = row.income < 0 ? "red" : "green";
                    return (
                      <div key={`${row.year}-${row.month}`} className="grid grid-cols-[44px_1fr_92px] gap-3 items-center">
                        <p className="text-xs text-zinc-500 font-[family-name:var(--font-space)]">
                          {MONTHS[row.month]}
                        </p>
                        <div className="space-y-1.5">
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full ${incomeTone === "red" ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: incomeMagnitude > 0 ? `${Math.max(4, (incomeMagnitude / maxFlow) * 100)}%` : 0 }}
                            />
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: row.expenses > 0 ? `${Math.max(4, (row.expenses / maxFlow) * 100)}%` : 0 }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-medium ${incomeTone === "red" ? "text-red-400" : "text-green-400"}`}>
                            {currency(row.income)}
                          </p>
                          <p className="text-xs text-red-400 font-medium">-{currency(row.expenses)}</p>
                        </div>
                      </div>
                    );
                  })}
                {data.cashFlowByMonth.every((row) => row.income === 0 && row.expenses === 0) && (
                  <p className="text-sm text-zinc-500 text-center py-6">
                    No finance activity recorded for this year.
                  </p>
                )}
              </div>
            </section>

            <section className="card-panel p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-white text-lg font-medium tracking-wide">Ledger Rows</h2>
                </div>
                <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    {filteredLedger.length} Records
                  </p>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                {filteredLedger.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-8">
                    No rows match this calculation.
                  </p>
                ) : (
                  filteredLedger.map((row) => (
                    <div
                      key={`${row.type}-${row.id}-${row.label}`}
                      className="p-4 border-b border-zinc-800 last:border-b-0 flex items-start justify-between gap-4 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-col items-start gap-1.5 mb-1.5">
                          <p className="text-sm text-zinc-200 font-medium leading-snug">{row.label}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 whitespace-nowrap flex-shrink-0">
                            {row.branch}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {row.date || `${MONTHS[row.month]} ${row.year}`} • {row.status === "due" ? "pending" : row.status}
                          {row.receiptId ? ` • ${row.receiptId}` : ""}
                        </p>
                      </div>
                      <p className={`font-[family-name:var(--font-space)] text-sm sm:text-base ${ledgerTone(row)}`}>
                        {currency(row.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
