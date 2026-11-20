"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Package,
  PiggyBank,
  Save,
  TrendingUp,
  X,
  Trash2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  getDevelopmentFundData,
  addDevelopmentExpense,
  deleteDevelopmentExpense,
  DevelopmentFundData,
  DevExpense,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { useToast } from "@/lib/use-toast";
import { getCurrentFeeYear } from "@/lib/fee-year";
import MonthSelector from "@/components/common/MonthSelector";
import GlobalSearch from "@/components/common/GlobalSearch";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import AccountMenu from "@/components/common/AccountMenu";

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

const SCOPE_OPTIONS = [
  { value: "Herohalli", label: "Herohalli" },
  { value: "MPSC", label: "MP Sports Club" },
  { value: "Both", label: "Both Branches" },
  { value: "Others", label: "Others" },
];

function balanceTextClass(amount: number) {
  return amount < 0 ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text-dim)]";
}

function formatCurrency(amount: number) {
  const rounded = Math.round(Number(amount) || 0);
  const prefix = rounded < 0 ? "-₹" : "₹";
  return `${prefix}${Math.abs(rounded).toLocaleString("en-IN")}`;
}

function numericYear(year: string | number) {
  const value = Number(year);
  return Number.isFinite(value) ? value : 0;
}

function dateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortExpensesByTimeline(a: DevExpense, b: DevExpense) {
  return (
    numericYear(b.year) - numericYear(a.year) ||
    b.month - a.month ||
    dateValue(b.dateAdded) - dateValue(a.dateAdded) ||
    b.id.localeCompare(a.id)
  );
}

export default function DevelopmentFundPage() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  const feeYear = getCurrentFeeYear();
  const [data, setData] = useState<DevelopmentFundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    month: new Date().getMonth(),
    title: "",
    description: "",
    scope: "Both",
    scopeOther: "",
    amount: 0,
  });
  const [adding, setAdding] = useState(false);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Detail Modal
  const [selectedExpense, setSelectedExpense] = useState<DevExpense | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || checking) return;
    setLoading(true);
    setError("");
    try {
      const result = await getDevelopmentFundData(feeYear);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [checking, feeYear, user]);

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
  }, [checking, loadData, user]);

  const handleAddExpenseClick = () => {
    // Validate before showing confirmation
    if (!newExpense.title.trim()) {
      toast("Please enter a title", "error");
      return;
    }
    if (!newExpense.description.trim()) {
      toast("Please enter a description", "error");
      return;
    }
    if (newExpense.scope === "Others" && !newExpense.scopeOther.trim()) {
      toast("Please specify the scope", "error");
      return;
    }
    if (newExpense.amount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    // Show confirmation
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setAdding(true);
    try {
      const finalScope =
        newExpense.scope === "Others"
          ? newExpense.scopeOther.trim()
          : newExpense.scope;

      await addDevelopmentExpense(
        newExpense.month,
        newExpense.title.trim(),
        newExpense.description.trim(),
        finalScope,
        newExpense.amount,
        feeYear,
      );
      setShowConfirmModal(false);
      setShowAddModal(false);
      setNewExpense({
        month: new Date().getMonth(),
        title: "",
        description: "",
        scope: "Both",
        scopeOther: "",
        amount: 0,
      });
      toast("Development expense added", "success");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add expense", "error");
    } finally {
      setAdding(false);
    }
  };

  const canDeleteExpense = (expense: DevExpense): boolean => {
    // Check if expense is within 24 hours of creation
    const addedDate = new Date(expense.dateAdded);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    if (!canDeleteExpense(selectedExpense)) {
      toast(
        "This expense cannot be deleted. Expenses can only be deleted within 24 hours of creation.",
        "error"
      );
      return;
    }

    setDeleting(true);
    try {
      await deleteDevelopmentExpense(selectedExpense.id);
      setSelectedExpense(null);
      toast("Development expense deleted", "success");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete expense", "error");
    } finally {
      setDeleting(false);
    }
  };

  const [filter, setFilter] = useState<number | "all">("all");

  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    const expenses =
      filter === "all"
        ? data.expenses
        : data.expenses.filter((e) => e.month === filter);
    return [...expenses].sort(sortExpensesByTimeline);
  }, [data, filter]);

  const monthlyTimeline = useMemo(() => {
    if (!data) return [];
    return data.monthlyBreakdown
      .filter((m) => m.collected > 0 || m.spent > 0)
      .sort(
        (a, b) =>
          numericYear(b.year) - numericYear(a.year) ||
          b.month - a.month,
      );
  }, [data]);

  const filteredStats = useMemo(() => {
    if (!data) return { allocated: 0, spent: 0, balance: 0 };

    if (filter === "all") {
      const allocated = data.monthlyBreakdown.reduce((sum, row) => sum + row.devFund, 0);
      const spent = data.monthlyBreakdown.reduce((sum, row) => sum + row.spent, 0);

      return {
        allocated,
        spent,
        balance: allocated - spent,
      };
    }

    const monthData = data.monthlyBreakdown.find((m) => m.month === filter);
    return {
      allocated: monthData ? monthData.devFund : 0,
      spent: monthData ? monthData.spent : 0,
      balance: monthData ? monthData.carryForward : 0,
    };
  }, [data, filter]);

  const getScopeLabel = (scope: string): string => {
    const option = SCOPE_OPTIONS.find((o) => o.value === scope);
    return option ? option.label : scope;
  };

  const getScopeBadgeColor = (scope: string): string => {
    switch (scope) {
      case "Herohalli":
        return "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]";
      case "MPSC":
        return "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-accent-border)]";
      case "Both":
        return "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]";
      default:
        return "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]";
    }
  };

  if (checking || !user) return null;

  return (
    <PageShell
      hud={{
        title: "Development Fund",
        backHref: "/dashboard",
        actions: (
          <>
            <GlobalSearch />
            <span className="hidden text-[10px] uppercase tracking-wider text-[color:var(--color-text-faint)] sm:inline">
              30% Income Fund
            </span>
          </>
        ),
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
        {/* View Toggle & Month Selection */}
        <div className="mb-[24px] space-y-[16px]">
          <div className="flex p-[4px] bg-[color:var(--color-well)] rounded-xl w-full max-w-md mx-auto border border-[color:var(--color-hairline)]">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-sans tracking-wider transition-all duration-300 ${filter === "all"
                ? "bg-[var(--surface)] text-[color:var(--color-text)] shadow-lg border border-[color:var(--color-hairline)]"
                : "text-[var(--text-muted)] hover:text-[color:var(--color-text)]"
                }`}
            >
              OVERVIEW (ALL)
            </button>
            <button
              onClick={() => setFilter(new Date().getMonth())}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-sans tracking-wider transition-all duration-300 ${filter !== "all"
                ? "bg-[var(--surface)] text-[color:var(--color-text)] shadow-lg border border-[color:var(--color-hairline)]"
                : "text-[var(--text-muted)] hover:text-[color:var(--color-text)]"
                }`}
            >
              MONTHLY VIEW
            </button>
          </div>

          {filter !== "all" && (
            <div className="animate-slide-up">
              <MonthSelector
                selectedMonth={filter as number}
                year={feeYear}
                onMonthChange={(m: number) => setFilter(m)}
                className="max-w-xs mx-auto"
              />
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-[64px]">
            <div className="spinner mx-auto mb-[16px]" />
            <p className="text-[var(--text-muted)] text-sm">Loading development fund...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-[64px]">
            <p className="text-[color:var(--color-text-dim)] mb-[16px] text-sm">{error}</p>
            <button onClick={loadData} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        )}

        {/* Data Display */}
        {!loading && !error && data && (
          <>
            {/* Summary Cards */}
            <section className="card-panel p-[24px] mb-[24px]">
              <div className="flex items-center gap-[8px] mb-[24px]">
                <PiggyBank className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                <h2 className="text-[color:var(--color-text)] text-lg font-medium tracking-wide">Fund Overview</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] animate-fade-in">
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-accent-border)] rounded-xl p-[20px] relative overflow-hidden">
                  <div className="absolute top-[0px] right-[0px] p-[8px] opacity-10">
                    <PiggyBank className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
                  </div>
                  <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-wider mb-[4px] flex items-center gap-[4px]">
                    <PiggyBank className="w-[12px] h-[12px]" /> Total Fund (30%)
                  </p>
                  <p className="font-sans text-xl sm:text-2xl text-[color:var(--color-text-dim)] mt-[8px]">
                    ₹{filteredStats.allocated.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[color:var(--color-text-dim)] mt-[4px] opacity-70">
                    From fees, admission and dress profit
                  </p>
                </div>
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px] relative overflow-hidden">
                  <div className="absolute top-[0px] right-[0px] p-[8px] opacity-10">
                    <Package className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
                  </div>
                  <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-wider mb-[4px] flex items-center gap-[4px]">
                    <Package className="w-[12px] h-[12px]" /> Total Spent
                  </p>
                  <p className="font-sans text-xl sm:text-2xl text-[color:var(--color-text-dim)] mt-[8px]">
                    ₹{filteredStats.spent.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[color:var(--color-text-dim)] mt-[4px] opacity-70">
                    {filter === "all" ? "Across all months" : "Selected month"}
                  </p>
                </div>
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[20px] relative overflow-hidden">
                  <div className="absolute top-[0px] right-[0px] p-[8px] opacity-10">
                    <TrendingUp className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
                  </div>
                  <p className="text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-wider mb-[4px] flex items-center gap-[4px]">
                    <TrendingUp className="w-[12px] h-[12px]" /> Running Balance
                  </p>
                  <p className={`font-sans text-xl sm:text-2xl mt-[8px] ${balanceTextClass(filteredStats.balance)}`}>
                    {formatCurrency(filteredStats.balance)}
                  </p>
                  {filter === "all" && data?.reserveUsed && data.reserveUsed > 0 && (
                    <div className="flex items-center gap-[6px] mt-[4px] text-[10px] text-[color:var(--color-text-dim)] font-medium animate-pulse">
                      <Zap className="w-[12px] h-[12px]" />
                      <span>Includes ₹{data.reserveUsed.toLocaleString()} Reserve</span>
                    </div>
                  )}
                  <p className="text-[10px] text-[color:var(--color-text-dim)] mt-[4px] opacity-70">
                    {filter === "all" ? "End of year-to-date position" : `After ${MONTHS[filter]}`}
                  </p>
                </div>
              </div>
            </section>

            {/* Monthly Breakdown - ONLY show if filter is ALL */}
            {filter === "all" && (
              <section className="card-panel p-[24px] mb-[24px] animate-fade-in" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-[8px] mb-[24px]">
                  <TrendingUp className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-[color:var(--color-text)] text-lg font-medium tracking-wide">Monthly Breakdown</h2>
                </div>
                <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] text-[10px] uppercase tracking-wider bg-[color:var(--color-well)]">
                          <th className="text-left p-[16px]">Month</th>
                          <th className="text-right p-[16px]">Income</th>
                          <th className="text-right p-[16px]">30% Fund</th>
                          <th className="text-right p-[16px]">Spent</th>
                          <th className="text-right p-[16px]">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyTimeline.map((m) => (
                            <tr
                              key={m.month}
                              className="border-b border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)] transition-colors"
                            >
                              <td className="p-[16px] font-sans tracking-wider text-sm text-[color:var(--color-text)]">
                                {MONTHS[m.month]}
                              </td>
                              <td className="p-[16px] text-right text-[color:var(--color-text-dim)]">
                                ₹{m.collected.toLocaleString()}
                              </td>
                              <td className="p-[16px] text-right text-[color:var(--color-text-dim)] font-medium">
                                ₹{m.devFund.toLocaleString()}
                              </td>
                              <td className="p-[16px] text-right text-[color:var(--color-text-dim)] font-medium">
                                {m.spent > 0
                                  ? `₹${m.spent.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td className={`p-[16px] text-right font-medium ${balanceTextClass(m.carryForward)}`}>
                                {formatCurrency(m.carryForward)}
                              </td>
                            </tr>
                          ))}
                        {monthlyTimeline.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-[32px] text-center text-[color:var(--color-text-dim)] text-sm"
                              >
                                No income or expenses recorded yet
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* EXPENSES LIST */}
            <section className="card-panel p-[24px] animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] mb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Package className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                  <h2 className="text-[color:var(--color-text)] text-lg font-medium tracking-wide">
                    Expenses <span className="text-[color:var(--color-text-dim)] font-normal text-sm ml-[4px]">{filter !== "all" ? `(${MONTHS[filter]})` : `(${feeYear})`}</span>
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-[16px] py-[10px] text-sm rounded-lg border border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-accent-strong)] hover:text-[color:var(--color-accent-ink)] transition-all duration-200 font-medium tracking-wide w-full sm:w-auto text-center"
                >
                  + Add Expense
                </button>
              </div>
              <div className="space-y-[12px]">
                {filteredExpenses.length === 0 ? (
                  <div className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[32px] text-center text-[color:var(--color-text-dim)] text-sm">
                    No expenses recorded for this period
                  </div>
                ) : (
                  filteredExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        onClick={() => setSelectedExpense(expense)}
                        className="bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] rounded-xl p-[16px] cursor-pointer hover:border-[color:var(--color-hairline-strong)] hover:bg-[color:var(--color-well)] transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-[0px]">
                            <div className="flex flex-col items-start gap-[6px] mb-[6px]">
                              <p className="font-sans tracking-wide text-sm text-[color:var(--color-text)] leading-snug">
                                {expense.title || expense.description}
                              </p>
                              <span
                                className={`text-[10px] px-[8px] py-[2px] border rounded-md font-medium whitespace-nowrap flex-shrink-0 ${getScopeBadgeColor(expense.scope || "Both")}`}
                              >
                                {getScopeLabel(expense.scope || "Both")}
                              </span>
                            </div>
                            <p className="text-[color:var(--color-text-dim)] text-xs">
                              {MONTHS[expense.month]} {expense.year} •{" "}
                              {expense.dateAdded}
                            </p>
                          </div>
                          <p className="font-sans text-base sm:text-lg text-[color:var(--color-text-dim)] ml-[16px]">
                            -₹{expense.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>

          </>
        )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="glass-modal !max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <h2 className="font-sans text-xl tracking-wider">
                  ADD EXPENSE
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[var(--text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <X className="w-[20px] h-[20px]" />
                </button>
              </div>

              <div className="space-y-[16px]">
                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                    Scope *
                  </label>
                  <select
                    value={newExpense.scope}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        scope: e.target.value,
                      })
                    }
                    className="input-field"
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {newExpense.scope === "Others" && (
                  <div className="animate-slide-down">
                    <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium flex items-center gap-[8px]">
                      Specify Scope <span className="text-[10px] opacity-50 normal-case">(e.g. Tournament, Event)</span>
                    </label>
                    <input
                      type="text"
                      value={newExpense.scopeOther}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          scopeOther: e.target.value,
                        })
                      }
                      placeholder="Enter custom scope..."
                      className="input-field border-[color:var(--color-hairline-strong)] focus:border-[color:var(--color-hairline-strong)]"
                      autoFocus
                    />
                  </div>
                )}

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                    Month *
                  </label>
                  <select
                    value={newExpense.month}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        month: parseInt(e.target.value),
                      })
                    }
                    className="input-field"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>
                        {m} {feeYear}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newExpense.title}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., Karate Equipment, Practice Mats..."
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                    Description *
                  </label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        description: e.target.value,
                      })
                    }
                    placeholder="Provide detailed description of the expense..."
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={newExpense.amount || ""}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        amount: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter amount"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-[12px] mt-[24px]">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddExpenseClick}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors"
                >
                  REVIEW & SAVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="glass-modal-overlay" style={{ zIndex: 110 }} onClick={(e) => e.target === e.currentTarget && setShowConfirmModal(false)}>
          <div className="glass-modal !max-w-md" style={{ borderColor: "var(--color-hairline-strong)" }}>
            <div className="p-[24px]">
              <div className="flex items-center gap-[12px] mb-[24px]">
                <AlertTriangle className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
                <h2 className="font-sans text-xl tracking-wider">
                  CONFIRM EXPENSE
                </h2>
              </div>

              <p className="text-[var(--text-secondary)] mb-[16px] text-sm">
                Please review the expense details before saving:
              </p>

              <div className="glass-surface p-[16px] space-y-[12px] mb-[24px] rounded-lg">
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Scope</p>
                  <p className="text-[color:var(--color-text)] text-sm">
                    {newExpense.scope === "Others"
                      ? newExpense.scopeOther
                      : getScopeLabel(newExpense.scope)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Month</p>
                  <p className="text-[color:var(--color-text)] text-sm">{MONTHS[newExpense.month]} {feeYear}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Title</p>
                  <p className="text-[color:var(--color-text)] text-sm">{newExpense.title}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Description</p>
                  <p className="text-[color:var(--color-text)] text-sm">{newExpense.description}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Amount</p>
                  <p className="text-[color:var(--color-text-dim)] font-sans text-xl">
                    ₹{newExpense.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-[12px]">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={adding}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm disabled:opacity-50"
                >
                  GO BACK
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={adding}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    "SAVING..."
                  ) : (
                    <span className="flex items-center justify-center gap-[8px]">
                      <Save className="w-[16px] h-[16px]" /> CONFIRM
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedExpense(null)}>
          <div className="glass-modal !max-w-md">
            <div className="p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <h2 className="font-sans text-xl tracking-wider">
                  EXPENSE DETAILS
                </h2>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="text-[var(--text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <X className="w-[20px] h-[20px]" />
                </button>
              </div>

              <div className="space-y-[16px] mb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <span
                    className={`text-[10px] px-[8px] py-[4px] border rounded-full ${getScopeBadgeColor(selectedExpense.scope || "Both")}`}
                  >
                    {getScopeLabel(selectedExpense.scope || "Both")}
                  </span>
                  <span className="text-[var(--text-muted)] text-sm">
                    {MONTHS[selectedExpense.month]} {selectedExpense.year}
                  </span>
                </div>

                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase mb-[4px]">Title</p>
                  <p className="font-sans text-lg tracking-wide">
                    {selectedExpense.title || selectedExpense.description}
                  </p>
                </div>

                {selectedExpense.description &&
                  selectedExpense.title !== selectedExpense.description && (
                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] uppercase mb-[4px]">
                        Description
                      </p>
                      <p className="text-[var(--text-secondary)] text-sm">{selectedExpense.description}</p>
                    </div>
                  )}

                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase mb-[4px]">Amount</p>
                  <p className="font-sans text-2xl text-[color:var(--color-text-dim)]">
                    ₹{selectedExpense.amount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase mb-[4px]">
                    Date Added
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm">{selectedExpense.dateAdded}</p>
                </div>

                <div className="text-[var(--text-muted)] text-xs font-mono">
                  ID: {selectedExpense.id}
                </div>
              </div>

              {/* Delete Section */}
              <div className="border-t border-[var(--border)] pt-[16px]">
                {canDeleteExpense(selectedExpense) ? (
                  <button
                    onClick={handleDeleteExpense}
                    disabled={deleting}
                    className="w-full py-[12px] bg-[color:var(--color-well)] border border-[color:var(--color-hairline-strong)] text-[color:var(--color-text-dim)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-glass-hover)] hover:text-[color:var(--color-text)] transition-all disabled:opacity-50 flex items-center justify-center gap-[8px]"
                  >
                    <Trash2 className="w-[16px] h-[16px]" />
                    {deleting ? "DELETING..." : "DELETE EXPENSE"}
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-[var(--text-muted)] text-sm mb-[8px]">
                      ⚠️ Delete not available
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">
                      Expenses can only be deleted within 24 hours of creation to
                      prevent corruption.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </PageShell>
  );
}
