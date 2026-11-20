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
  Plus,
} from "lucide-react";

import {
  FinanceCommandCenterData,
  FinanceLedgerRow,
  getFinanceCommandCenter,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";

import GlobalSearch from "@/components/common/GlobalSearch";
import MonthSelector from "@/components/common/MonthSelector";
import AccountMenu from "@/components/common/AccountMenu";
import NotificationBell from "@/components/common/NotificationBell";
import LedgerRow from "@/components/ui/LedgerRow";
import MeterRing from "@/components/ui/MeterRing";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
import { AddExtraIncomeModal } from "./AddExtraIncomeModal";

type MoneySection = "overview" | "ledger" | "fund";

const BRANCHES = [
  { value: "Overall", label: "Overall" },
  { value: "Herohalli", label: "Herohalli" },
  { value: "MPSC", label: "MP Sports" },
];

const BRANCH_TABS: SegmentOption<string>[] = BRANCHES.map((branch) => ({
  value: branch.value,
  label: branch.label,
}));

const MONEY_SECTIONS: SegmentOption<MoneySection>[] = [
  { value: "overview", label: "Overview" },
  { value: "ledger", label: "Ledger" },
  { value: "fund", label: "Fund" },
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

function num(amount: number) {
  return Math.round(Number(amount) || 0).toLocaleString("en-IN");
}

function ledgerStatus(status: FinanceLedgerRow["status"]): LedgerStatus {
  const value = String(status);
  if (value === "paid" || value === "settled") return "paid";
  if (value === "credit") return "credit";
  if (value === "due" || value === "pending") return "due";
  if (value === "partial") return "partial";
  return "overdue";
}

function toneClass(tone: "green" | "amber" | "blue" | "red" | "purple" | "white") {
  const map = {
    green: "text-[color:var(--color-text-dim)]",
    amber: "text-[color:var(--color-text-dim)]",
    blue: "text-[color:var(--color-text-dim)]",
    red: "text-[color:var(--color-text-dim)]",
    purple: "text-[color:var(--color-text-dim)]",
    white: "text-[color:var(--color-text)]",
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
      className={`glass-card p-[16px] text-left relative overflow-hidden transition-all ${
        active ? "border-[color:var(--color-hairline)] bg-[color:var(--color-accent-dim)]" : "hover:border-[color:var(--color-hairline)]"
      }`}
    >
      <Icon className={`absolute right-[12px] top-[12px] w-[40px] h-[40px] opacity-10 ${toneClass(tone)}`} />
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-[4px]">
        {label}
      </p>
      <p className={`font-sans text-xl ${toneClass(tone)}`}>
        {value}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-[4px]">{note}</p>
    </button>
  );
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
      "extraIncome",
      "eventIncome",
    ].includes(row.formulaKey);
  }
  if (formulaKey === "eventSurplus") {
    return row.formulaKey === "eventIncome" || row.formulaKey === "eventExpenses";
  }
  return row.formulaKey === formulaKey;
}

export default function FinancesPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [branch, setBranch] = useState("Overall");
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [data, setData] = useState<FinanceCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFormula, setActiveFormula] = useState("all");
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [section, setSection] = useState<MoneySection>("overview");

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!user || checking) return;
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
    if (!checking && user) {
      let cancelled = false;
      const id = window.setTimeout(() => {
        if (cancelled) return;
        void loadData();
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(id);
      };
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
    <>
      <PageShell
        hud={{
          title: "Money",
          monthLabel: month === null ? `FY ${feeYear}` : `${MONTHS[month - 1]} ${feeYear}`,
          branchLabel: branch === "Overall" ? "All branches" : branch,
          backHref: "/dashboard",
          actions: <GlobalSearch />,
          bell: <NotificationBell />,
          account: <AccountMenu />,
        }}
      >
        <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[12px]">
          <MonthSelector
            compact
            selectedMonth={month}
            year={feeYear}
            onMonthChange={(nextMonth) => {
              setActiveFormula("all");
              setMonth(nextMonth);
            }}
          />
          <button
            type="button"
            onClick={() => loadData(true)}
            className="tap-target inline-flex min-w-[44px] items-center justify-center gap-[8px] rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-xs font-semibold text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-text)] disabled:opacity-50"
            aria-label="Refresh finance data"
          >
            <RefreshCw className="h-[16px] w-[16px]" />
            Refresh
          </button>
        </div>
        <SegmentedTabs
          options={BRANCH_TABS}
          value={branch}
          onChange={(nextBranch) => {
            setActiveFormula("all");
            setBranch(nextBranch);
          }}
          ariaLabel="Finance branch"
          className="mb-[12px]"
        />
        <SegmentedTabs
          options={MONEY_SECTIONS}
          value={section}
          onChange={setSection}
          ariaLabel="Money section"
          className="mb-[24px]"
        />

        {loading && (
          <div className="text-center py-[64px]">
            <div className="spinner mx-auto mb-[16px]" />
            <p className="text-[var(--text-muted)] text-sm">Loading finance command center...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-[64px]">
            <p className="text-[color:var(--color-text-dim)] mb-[16px] text-sm">{error}</p>
            <button onClick={() => loadData(true)} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-[24px]">
            {section === "overview" ? (
            <section className="hud-panel p-[20px] sm:p-[24px]">
              <div className="flex items-center justify-between gap-[16px]">
                <div>
                  <p className="eyebrow text-[color:var(--color-text-dim)]">{data.branch} · {data.periodLabel}</p>
                  <p className={`numeric mt-[12px] text-[40px] leading-none ${data.summary.availableBalance < 0 ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text)]"}`}>
                    {num(data.summary.availableBalance)}
                  </p>
                  <p className="mt-[12px] max-w-xl text-xs text-[color:var(--color-text-dim)]">{data.formulas.availableBalance}</p>
                </div>
                <MeterRing
                  value={data.summary.collectionRate}
                  caption="collection rate"
                  tone="action"
                />
              </div>

              <div className="mt-[20px] grid grid-cols-2 gap-[12px] lg:grid-cols-4">
                <StatTile label="Income" value={num(data.summary.grossIncome)} tone="neutral" />
                <StatTile
                  label="Expenses"
                  value={num(-(data.summary.developmentExpenses + data.summary.eventExpenses + (data.summary.customRemovals || 0)))}
                  tone="neutral"
                />
                <StatTile
                  label="Net"
                  value={num(data.summary.grossIncome - data.summary.developmentExpenses - data.summary.eventExpenses - (data.summary.customRemovals || 0))}
                  tone="neutral"
                />
                <StatTile label="Active students" value={num(data.summary.activeStudents)} />
              </div>
            </section>
            ) : null}

            {section === "overview" && data.warnings.length > 0 && (
              <section className="space-y-[8px]">
                {data.warnings.map((warning) => (
                  <div
                    key={warning.message}
                    className={`glass-card p-[12px] flex items-start gap-[12px] ${
                      warning.level === "danger"
                        ? "text-[color:var(--color-text)]"
                        : "text-[color:var(--color-text)]"
                    }`}
                    style={{
                      borderColor:
                        warning.level === "danger"
                          ? "var(--color-hairline-strong)"
                          : "var(--color-hairline-strong)",
                    }}
                  >
                    <AlertTriangle className="w-[16px] h-[16px] mt-[2px] flex-shrink-0" />
                    <p className="text-sm">{warning.message}</p>
                  </div>
                ))}
              </section>
            )}

            {section === "overview" ? (
            <section className="hud-panel p-[24px]">
              <div className="flex items-center gap-[8px] mb-[24px]">
                <BarChart3 className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Fee Position</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
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
            ) : null}

            {section === "ledger" ? (
            <section className="hud-panel p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Calculator className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Calculation</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFormula("all")}
                  className="text-xs text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] transition-colors border border-[color:var(--color-hairline)] px-[12px] py-[6px] rounded-md"
                >
                  Show all ledger rows
                </button>
              </div>

              <div className="divide-y divide-[color:var(--color-hairline)]">
                {[...data.incomeBreakdown, ...data.expenseBreakdown].map((item, index) => {
                  const signedAmount = item.key === "developmentExpenses" || item.key === "eventExpenses" || item.key === "customRemovals" ? -Math.abs(item.amount) : item.amount;
                  return (
                    <LedgerRow
                      key={item.key}
                      index={index}
                      status={signedAmount < 0 ? "neutral" : "credit"}
                      title={item.label}
                      idLabel={item.formula}
                      amount={`${signedAmount > 0 ? "+" : signedAmount < 0 ? "-" : ""}${num(Math.abs(signedAmount))}`}
                      trailing={<StatusPill status={signedAmount < 0 ? "overdue" : "credit"} label={signedAmount < 0 ? "Out" : "In"} />}
                      className={activeFormula === item.key ? "bg-[color:var(--color-well)]" : undefined}
                      onClick={() => setActiveFormula(item.key)}
                    />
                  );
                })}
                <LedgerRow
                  status="credit"
                  title="Development fund contribution"
                  idLabel={data.formulas.developmentFundContribution}
                  amount={num(data.summary.developmentFundContribution)}
                  trailing={<StatusPill status="credit" label="Fund" />}
                />
              </div>
            </section>
            ) : null}

            {section === "fund" ? (
            <section className="hud-panel p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Wallet className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Fund & Tools</h2>
                </div>
                <Link
                  href="/development"
                  className="text-xs text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] transition-colors flex items-center gap-[4px] border border-[color:var(--color-hairline-strong)] px-[12px] py-[6px] rounded-md bg-[color:var(--color-well)]"
                >
                  Expense report <ArrowRight className="w-[12px] h-[12px]" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-[12px]">
                <MetricCard
                  label="Gross Income"
                  value={currency(data.summary.grossIncome)}
                  note="Core income + event income"
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
                  label="Event Spend"
                  value={`-${currency(data.summary.eventExpenses)}`}
                  note="Belt exam/tournament costs"
                  icon={Package}
                  tone="red"
                  active={activeFormula === "eventExpenses"}
                  onClick={() => setActiveFormula("eventExpenses")}
                />
                {(data.summary.customRemovals || 0) > 0 && (
                  <MetricCard
                    label="Removals"
                    value={`-${currency(data.summary.customRemovals || 0)}`}
                    note="Withdrawals from ledger"
                    icon={Package}
                    tone="red"
                    active={activeFormula === "customRemovals"}
                    onClick={() => setActiveFormula("customRemovals")}
                  />
                )}
                <MetricCard
                  label="Fund Balance"
                  value={currency(data.summary.developmentFundBalance)}
                  note="30% monthly fee cash less expenses"
                  icon={PiggyBank}
                  tone="blue"
                  onClick={() => setActiveFormula("all")}
                />
              </div>
            </section>
            ) : null}

            {section === "overview" ? (
            <section className="hud-panel p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Ticket className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Income Sources</h2>
                </div>
                <button
                  onClick={() => setShowAddIncome(true)}
                  className="text-xs text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] transition-colors flex items-center gap-[4px] border border-[color:var(--color-accent-border)] px-[12px] py-[6px] rounded-md bg-[color:var(--color-well)]"
                >
                  <Plus className="w-[12px] h-[12px]" /> Add Income
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-[12px]">
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px]">
                  <Ticket className="w-[20px] h-[20px] text-[color:var(--color-text-dim)] mb-[12px]" />
                  <p className="text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[4px]">
                    Admission
                  </p>
                  <p className="font-sans text-2xl text-[color:var(--color-text-dim)]">
                    {currency(data.summary.admissionCollected)}
                  </p>
                </div>
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px]">
                  <Shirt className="w-[20px] h-[20px] text-[color:var(--color-text-dim)] mb-[12px]" />
                  <p className="text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[4px]">
                    Dress Profit
                  </p>
                  <p
                    className={`font-sans text-2xl ${
                      data.summary.dressProfit < 0 ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text-dim)]"
                    }`}
                  >
                    {currency(data.summary.dressProfit)}
                  </p>
                </div>
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px]">
                  <Wallet className="w-[20px] h-[20px] text-[color:var(--color-text-dim)] mb-[12px]" />
                  <p className="text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[4px]">
                    Extra Income
                  </p>
                  <p className="font-sans text-2xl text-[color:var(--color-text-dim)]">
                    {currency(data.summary.extraIncome)}
                  </p>
                </div>
                <Link
                  href="/events"
                  className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px] hover:border-[color:var(--color-hairline-strong)] transition-colors"
                >
                  <Ticket className="w-[20px] h-[20px] text-[color:var(--color-text-dim)] mb-[12px]" />
                  <p className="text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[4px]">
                    Event Income
                  </p>
                  <p className="font-sans text-2xl text-[color:var(--color-text-dim)]">
                    {currency(data.summary.eventIncome)}
                  </p>
                </Link>
                <Link
                  href="/referrals"
                  className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px] hover:border-[color:var(--color-accent-border)] transition-colors"
                >
                  <Gift className="w-[20px] h-[20px] text-[color:var(--color-text-dim)] mb-[12px]" />
                  <p className="text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-wider mb-[4px]">
                    Referral Credits
                  </p>
                  <p className="font-sans text-2xl text-[color:var(--color-text-dim)]">
                    {currency(data.summary.creditsApplied)}
                  </p>
                </Link>
              </div>
            </section>
            ) : null}

            {section === "fund" ? (
            <section className="hud-panel p-[24px]">
              <div className="flex items-center gap-[8px] mb-[24px]">
                <BarChart3 className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Year Cash Flow</h2>
              </div>
              <div className="space-y-[16px]">
                {data.cashFlowByMonth
                  .filter((row) => row.income !== 0 || row.expenses > 0)
                  .map((row) => {
                    const incomeMagnitude = Math.abs(row.income);
                    const incomeTone = row.income < 0 ? "red" : "green";
                    return (
                      <div key={`${row.year}-${row.month}`} className="grid grid-cols-[44px_1fr_92px] gap-[12px] items-center">
                        <p className="text-xs text-[color:var(--color-text-dim)] font-sans">
                          {MONTHS[row.month]}
                        </p>
                        <div className="space-y-[6px]">
                          <div className="h-[8px] rounded-full bg-[color:var(--color-well)] overflow-hidden">
                            <div
                              className={`h-full ${incomeTone === "red" ? "bg-[color:var(--color-text-faint)]" : "bg-[color:var(--color-accent)]"}`}
                              style={{ width: incomeMagnitude > 0 ? `${Math.max(4, (incomeMagnitude / maxFlow) * 100)}%` : 0 }}
                            />
                          </div>
                          <div className="h-[8px] rounded-full bg-[color:var(--color-well)] overflow-hidden">
                            <div
                              className="h-full bg-[color:var(--color-text-faint)]"
                              style={{ width: row.expenses > 0 ? `${Math.max(4, (row.expenses / maxFlow) * 100)}%` : 0 }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-medium ${incomeTone === "red" ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text-dim)]"}`}>
                            {currency(row.income)}
                          </p>
                          <p className="text-xs text-[color:var(--color-text-dim)] font-medium">-{currency(row.expenses)}</p>
                        </div>
                      </div>
                    );
                  })}
                {data.cashFlowByMonth.every((row) => row.income === 0 && row.expenses === 0) && (
                  <p className="text-sm text-[color:var(--color-text-dim)] text-center py-[24px]">
                    No finance activity recorded for this year.
                  </p>
                )}
              </div>
            </section>
            ) : null}

            {section === "ledger" ? (
            <section className="hud-panel p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Package className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Ledger Rows</h2>
                </div>
                <div className="px-[12px] py-[4px] bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-full">
                  <p className="text-[10px] text-[color:var(--color-text-dim)] uppercase tracking-wider">
                    {filteredLedger.length} Records
                  </p>
                </div>
              </div>
              <div className="divide-y divide-[color:var(--color-hairline)]">
                {filteredLedger.length === 0 ? (
                  <p className="py-[32px] text-center text-sm text-[color:var(--color-text-dim)]">
                    No rows match this calculation.
                  </p>
                ) : (
                  filteredLedger.map((row, index) => {
                    const status = ledgerStatus(row.status);
                    return (
                      <LedgerRow
                        key={`${row.type}-${row.id}-${row.label}`}
                        index={index}
                        status={status}
                        title={row.label}
                        subtitle={`${row.date || `${MONTHS[row.month]} ${row.year}`} · ${row.status === "due" ? "pending" : row.status}`}
                        idLabel={`${row.branch}${row.receiptId ? ` · ${row.receiptId}` : ""}`}
                        amount={num(row.amount)}
                        amountLabel={row.type}
                        trailing={<StatusPill status={status} />}
                      />
                    );
                  })
                )}
              </div>
            </section>
            ) : null}
          </div>
        )}
      </PageShell>

      {month !== null && data && (
        <AddExtraIncomeModal
          isOpen={showAddIncome}
          onClose={() => setShowAddIncome(false)}
          branch={data.branch === "Overall" ? "bangalore" : data.branch}
          month={month}
          onSuccess={() => loadData(true)}
        />
      )}
    </>
  );
}
