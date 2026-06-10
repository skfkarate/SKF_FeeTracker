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
import { getCurrentFeeYear } from "@/lib/fee-year";
import MonthSelector from "@/components/common/MonthSelector";
import Navbar from "@/components/common/Navbar";

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
  return amount < 0 ? "text-red-400" : "text-green-400";
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
      const id = window.setTimeout(() => {
        void loadData();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [checking, loadData, user]);



  const handleAddExpenseClick = () => {
    // Validate before showing confirmation
    if (!newExpense.title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!newExpense.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (newExpense.scope === "Others" && !newExpense.scopeOther.trim()) {
      alert("Please specify the scope");
      return;
    }
    if (newExpense.amount <= 0) {
      alert("Please enter a valid amount");
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
      loadData(); // Reload to get updated data
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add expense");
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
      alert(
        "This expense cannot be deleted. Expenses can only be deleted within 24 hours of creation."
      );
      return;
    }

    setDeleting(true);
    try {
      await deleteDevelopmentExpense(selectedExpense.id);
      setSelectedExpense(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete expense");
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
        return "bg-red-600/20 text-red-400 border-red-600/50";
      case "MPSC":
        return "bg-blue-600/20 text-blue-400 border-blue-600/50";
      case "Both":
        return "bg-green-600/20 text-green-400 border-green-600/50";
      default:
        return "bg-yellow-600/20 text-yellow-500 border-yellow-600/50";
    }
  };

  if (checking || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* Header */}
      <Navbar
        title="DEVELOPMENT FUND"
        showBack
        rightContent={
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider hidden sm:block">
            30% Income Fund
          </div>
        }
      />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24">
        {/* View Toggle & Month Selection */}
        <div className="mb-6 space-y-4">
          <div className="flex p-1 bg-black/20 rounded-xl w-full max-w-md mx-auto border border-white/5">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-2 rounded-lg text-sm font-[family-name:var(--font-space)] tracking-wider transition-all duration-300 ${filter === "all"
                ? "bg-[var(--surface)] text-white shadow-lg border border-white/10"
                : "text-[var(--text-muted)] hover:text-white"
                }`}
            >
              OVERVIEW (ALL)
            </button>
            <button
              onClick={() => setFilter(new Date().getMonth())}
              className={`flex-1 py-2 rounded-lg text-sm font-[family-name:var(--font-space)] tracking-wider transition-all duration-300 ${filter !== "all"
                ? "bg-[var(--surface)] text-white shadow-lg border border-white/10"
                : "text-[var(--text-muted)] hover:text-white"
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
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Loading development fund...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <button onClick={loadData} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        )}

        {/* Data Display */}
        {!loading && !error && data && (
          <>
            {/* Summary Cards */}
            <section className="card-panel p-6 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <PiggyBank className="w-5 h-5 text-blue-400" />
                <h2 className="text-white text-lg font-medium tracking-wide">Fund Overview</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                <div className="bg-zinc-900/50 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <PiggyBank className="w-12 h-12 text-blue-400" />
                  </div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <PiggyBank className="w-3 h-3" /> Total Fund (30%)
                  </p>
                  <p className="font-[family-name:var(--font-space)] text-xl sm:text-2xl text-blue-400 mt-2">
                    ₹{filteredStats.allocated.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 opacity-70">
                    From fees, admission and dress profit
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-amber-500/20 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Package className="w-12 h-12 text-amber-400" />
                  </div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Total Spent
                  </p>
                  <p className="font-[family-name:var(--font-space)] text-xl sm:text-2xl text-amber-400 mt-2">
                    ₹{filteredStats.spent.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 opacity-70">
                    {filter === "all" ? "Across all months" : "Selected month"}
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-green-500/20 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <TrendingUp className="w-12 h-12 text-green-400" />
                  </div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Running Balance
                  </p>
                  <p className={`font-[family-name:var(--font-space)] text-xl sm:text-2xl mt-2 ${balanceTextClass(filteredStats.balance)}`}>
                    {formatCurrency(filteredStats.balance)}
                  </p>
                  {filter === "all" && data?.reserveUsed && data.reserveUsed > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-400/90 font-medium animate-pulse">
                      <Zap className="w-3 h-3" />
                      <span>Includes ₹{data.reserveUsed.toLocaleString()} Reserve</span>
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1 opacity-70">
                    {filter === "all" ? "End of year-to-date position" : `After ${MONTHS[filter]}`}
                  </p>
                </div>
              </div>
            </section>

            {/* Monthly Breakdown - ONLY show if filter is ALL */}
            {filter === "all" && (
              <section className="card-panel p-6 mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-white text-lg font-medium tracking-wide">Monthly Breakdown</h2>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-wider bg-zinc-900/30">
                          <th className="text-left p-4">Month</th>
                          <th className="text-right p-4">Income</th>
                          <th className="text-right p-4">30% Fund</th>
                          <th className="text-right p-4">Spent</th>
                          <th className="text-right p-4">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyTimeline.map((m) => (
                            <tr
                              key={m.month}
                              className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                            >
                              <td className="p-4 font-[family-name:var(--font-space)] tracking-wider text-sm text-zinc-300">
                                {MONTHS[m.month]}
                              </td>
                              <td className="p-4 text-right text-zinc-400">
                                ₹{m.collected.toLocaleString()}
                              </td>
                              <td className="p-4 text-right text-blue-400 font-medium">
                                ₹{m.devFund.toLocaleString()}
                              </td>
                              <td className="p-4 text-right text-amber-400 font-medium">
                                {m.spent > 0
                                  ? `₹${m.spent.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td className={`p-4 text-right font-medium ${balanceTextClass(m.carryForward)}`}>
                                {formatCurrency(m.carryForward)}
                              </td>
                            </tr>
                          ))}
                        {monthlyTimeline.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-8 text-center text-zinc-500 text-sm"
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
            <section className="card-panel p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-white text-lg font-medium tracking-wide">
                    Expenses <span className="text-zinc-500 font-normal text-sm ml-1">{filter !== "all" ? `(${MONTHS[filter]})` : `(${feeYear})`}</span>
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 text-sm rounded-lg border border-green-600/30 bg-green-600/10 text-green-400 hover:bg-green-600 hover:text-white transition-all duration-200 font-medium tracking-wide w-full sm:w-auto text-center"
                >
                  + Add Expense
                </button>
              </div>
              <div className="space-y-3">
                {filteredExpenses.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                    No expenses recorded for this period
                  </div>
                ) : (
                  filteredExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        onClick={() => setSelectedExpense(expense)}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-red-600/30 hover:bg-zinc-800/50 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col items-start gap-1.5 mb-1.5">
                              <p className="font-[family-name:var(--font-space)] tracking-wide text-sm text-zinc-200 leading-snug">
                                {expense.title || expense.description}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 border rounded-md font-medium whitespace-nowrap flex-shrink-0 ${getScopeBadgeColor(expense.scope || "Both")}`}
                              >
                                {getScopeLabel(expense.scope || "Both")}
                              </span>
                            </div>
                            <p className="text-zinc-500 text-xs">
                              {MONTHS[expense.month]} {expense.year} •{" "}
                              {expense.dateAdded}
                            </p>
                          </div>
                          <p className="font-[family-name:var(--font-space)] text-base sm:text-lg text-amber-400 ml-4">
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
      </main>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="glass-modal !max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-[family-name:var(--font-space)] text-xl tracking-wider">
                  ADD EXPENSE
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
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
                    <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium flex items-center gap-2">
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
                      className="input-field border-amber-500/30 focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                )}

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
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
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
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
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
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
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost flex-1 font-[family-name:var(--font-space)] tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddExpenseClick}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-[family-name:var(--font-space)] tracking-wider text-sm hover:bg-green-500 transition-colors"
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
          <div className="glass-modal !max-w-md" style={{ borderColor: "rgba(245, 158, 11, 0.3)" }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="font-[family-name:var(--font-space)] text-xl tracking-wider">
                  CONFIRM EXPENSE
                </h2>
              </div>

              <p className="text-[var(--text-secondary)] mb-4 text-sm">
                Please review the expense details before saving:
              </p>

              <div className="glass-surface p-4 space-y-3 mb-6 rounded-lg">
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Scope</p>
                  <p className="text-white text-sm">
                    {newExpense.scope === "Others"
                      ? newExpense.scopeOther
                      : getScopeLabel(newExpense.scope)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Month</p>
                  <p className="text-white text-sm">{MONTHS[newExpense.month]} {feeYear}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Title</p>
                  <p className="text-white text-sm">{newExpense.title}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Description</p>
                  <p className="text-white text-sm">{newExpense.description}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">Amount</p>
                  <p className="text-amber-400 font-[family-name:var(--font-space)] text-xl">
                    ₹{newExpense.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={adding}
                  className="btn-ghost flex-1 font-[family-name:var(--font-space)] tracking-wider text-sm disabled:opacity-50"
                >
                  GO BACK
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={adding}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-[family-name:var(--font-space)] tracking-wider text-sm hover:bg-green-500 transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    "SAVING..."
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> CONFIRM
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
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-[family-name:var(--font-space)] text-xl tracking-wider">
                  EXPENSE DETAILS
                </h2>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-1 border rounded-full ${getScopeBadgeColor(selectedExpense.scope || "Both")}`}
                  >
                    {getScopeLabel(selectedExpense.scope || "Both")}
                  </span>
                  <span className="text-[var(--text-muted)] text-sm">
                    {MONTHS[selectedExpense.month]} {selectedExpense.year}
                  </span>
                </div>

                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase mb-1">Title</p>
                  <p className="font-[family-name:var(--font-space)] text-lg tracking-wide">
                    {selectedExpense.title || selectedExpense.description}
                  </p>
                </div>

                {selectedExpense.description &&
                  selectedExpense.title !== selectedExpense.description && (
                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] uppercase mb-1">
                        Description
                      </p>
                      <p className="text-[var(--text-secondary)] text-sm">{selectedExpense.description}</p>
                    </div>
                  )}

                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase mb-1">Amount</p>
                  <p className="font-[family-name:var(--font-space)] text-2xl text-amber-400">
                    ₹{selectedExpense.amount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-[var(--text-muted)] text-[10px] uppercase mb-1">
                    Date Added
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm">{selectedExpense.dateAdded}</p>
                </div>

                <div className="text-[var(--text-muted)] text-xs font-mono">
                  ID: {selectedExpense.id}
                </div>
              </div>

              {/* Delete Section */}
              <div className="border-t border-[var(--border)] pt-4">
                {canDeleteExpense(selectedExpense) ? (
                  <button
                    onClick={handleDeleteExpense}
                    disabled={deleting}
                    className="w-full py-3 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg font-[family-name:var(--font-space)] tracking-wider text-sm hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? "DELETING..." : "DELETE EXPENSE"}
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-[var(--text-muted)] text-sm mb-2">
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

    </div>
  );
}
