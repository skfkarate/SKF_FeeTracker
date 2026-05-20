"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Gift, X, Zap, Wallet, Trophy } from "lucide-react";
import {
  getReferralCredits,
  addReferralCredit,
  getStudents,
  ReferralCreditsData,
  ReferralCredit,
  Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import Navbar from "@/components/common/Navbar";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ReferralCreditsPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [branch, setBranch] = useState("Herohalli");
  const [data, setData] = useState<ReferralCreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Credit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [newCredit, setNewCredit] = useState({
    studentId: "",
    amount: 500,
    reason: "",
    description: "",
    usedInMonth: "",
  });
  const [adding, setAdding] = useState(false);

  // Detail Modal
  const [selectedCredit, setSelectedCredit] = useState<ReferralCredit | null>(null);

  const loadData = useCallback(async () => {
    if (!user || checking) return;
    setLoading(true);
    setError("");
    try {
      const result = await getReferralCredits(branch);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [branch, checking, user]);

  useEffect(() => {
    if (!checking && user) {
      loadData();
    }
  }, [checking, loadData, user]);

  const openAddModal = async () => {
    setShowAddModal(true);
    setLoadingStudents(true);
    try {
      const studentList = await getStudents(branch, new Date().getMonth(), false, feeYear);
      setStudents(studentList.filter((s) => s.status === "Active"));
    } catch {
      alert("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddCredit = async () => {
    if (!newCredit.studentId) {
      alert("Please select a student");
      return;
    }
    if (newCredit.amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setAdding(true);
    try {
      const usedMonth =
        newCredit.usedInMonth !== ""
          ? parseInt(newCredit.usedInMonth)
          : undefined;
      const usedDate =
        usedMonth !== undefined ? new Date().toISOString() : undefined;

      await addReferralCredit(
        branch,
        newCredit.studentId,
        newCredit.amount,
        newCredit.reason,
        newCredit.description, // description
        usedMonth,
        usedDate,
        feeYear,
      );
      setShowAddModal(false);
      setNewCredit({ studentId: "", amount: 500, reason: "", description: "", usedInMonth: "" });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add credit");
    } finally {
      setAdding(false);
    }
  };

  const stats = useMemo(() => {
    if (!data) return { total: 0, totalAmount: 0, active: 0, activeAmount: 0, redeemed: 0, redeemedAmount: 0 };
    const total = data.credits.length;
    const totalAmount = data.credits.reduce((sum, c) => sum + c.amount, 0);
    const active = data.credits.filter(c => !c.isUsed).length;
    const activeAmount = data.credits.filter(c => !c.isUsed).reduce((sum, c) => sum + c.amount, 0);
    const redeemed = data.credits.filter(c => c.isUsed).length;
    const redeemedAmount = data.credits.filter(c => c.isUsed).reduce((sum, c) => sum + c.amount, 0);

    return { total, totalAmount, active, activeAmount, redeemed, redeemedAmount };
  }, [data]);

  if (checking || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* Header */}
      <Navbar
        title="REFERRAL CREDITS"
        showBack
        rightContent={null}
      />

      <main className="max-w-2xl mx-auto p-4 pt-24">
        {/* Branch Toggle */}
        <div className="flex p-1 bg-black/20 rounded-xl w-full max-w-md mx-auto border border-white/5 mb-6">
          <button
            onClick={() => setBranch("Herohalli")}
            className={`flex-1 py-2 rounded-lg text-sm font-[family-name:var(--font-space)] tracking-wider transition-all duration-300 ${branch === "Herohalli"
              ? "bg-red-600/90 text-white shadow-lg shadow-red-900/20 border border-white/10"
              : "text-[var(--text-muted)] hover:text-white"
              }`}
          >
            HEROHALLI
          </button>
          <button
            onClick={() => setBranch("MPSC")}
            className={`flex-1 py-2 rounded-lg text-sm font-[family-name:var(--font-space)] tracking-wider transition-all duration-300 ${branch === "MPSC"
              ? "bg-blue-600/90 text-white shadow-lg shadow-blue-900/20 border border-white/10"
              : "text-[var(--text-muted)] hover:text-white"
              }`}
          >
            MP SPORTS CLUB
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Loading referral credits...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <button
              onClick={loadData}
              className="btn-primary text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data Display */}
        {!loading && !error && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-fade-in">
              <div className="glass-card p-4 relative overflow-hidden" style={{ borderColor: "rgba(59, 130, 246, 0.25)" }}>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Trophy className="w-12 h-12 text-blue-400" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Total Issued
                </p>
                <p className="font-[family-name:var(--font-space)] text-lg sm:text-xl text-blue-400">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">
                  {stats.total} credits total
                </p>
              </div>

              <div className="glass-card p-4 relative overflow-hidden" style={{ borderColor: "rgba(34, 197, 94, 0.25)" }}>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Zap className="w-12 h-12 text-green-400" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Active
                </p>
                <p className="font-[family-name:var(--font-space)] text-lg sm:text-xl text-green-400">
                  ₹{stats.activeAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">
                  {stats.active} available to use
                </p>
              </div>

              <div className="glass-card p-4 relative overflow-hidden" style={{ borderColor: "rgba(245, 158, 11, 0.25)" }}>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Wallet className="w-12 h-12 text-amber-400" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Redeemed
                </p>
                <p className="font-[family-name:var(--font-space)] text-lg sm:text-xl text-amber-400">
                  ₹{stats.redeemedAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">
                  {stats.redeemed} credits used
                </p>
              </div>
            </div>

            {/* Credits List */}
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                  Credit Ledger
                </p>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 text-xs sm:text-sm rounded-lg border border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white transition-all duration-200 font-medium tracking-wide flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Credit
                </button>
              </div>

              <div className="space-y-2">
                {data.credits.length === 0 ? (
                  <div className="glass-card p-6 text-center text-[var(--text-muted)] text-sm">
                    No referral credits yet. Add one when a parent refers a new student.
                  </div>
                ) : (
                  data.credits
                    .sort((a, b) => {
                      // Sort by used status (active first), then by date or ID
                      if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
                      return b.id.localeCompare(a.id);
                    })
                    .map((credit) => (
                      <div
                        key={credit.id}
                        onClick={() => setSelectedCredit(credit)}
                        className={`glass-card p-4 transition-all duration-200 cursor-pointer group ${credit.isUsed
                          ? "opacity-60 hover:opacity-80 border-white/5"
                          : "hover:border-green-400/30 border-white/10"
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col items-start gap-1.5 mb-1.5">
                              <p className="font-[family-name:var(--font-space)] tracking-wide text-sm text-white group-hover:text-green-200 transition-colors leading-snug">
                                {credit.studentName}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 border rounded-full whitespace-nowrap flex-shrink-0 ${credit.isUsed
                                  ? "bg-amber-600/10 text-amber-500 border-amber-600/30"
                                  : "bg-green-600/20 text-green-400 border-green-600/50"
                                  }`}
                              >
                                {credit.isUsed ? "Redeemed" : "Active"}
                              </span>
                            </div>
                            <p className="text-[var(--text-muted)] text-xs flex items-center gap-2">
                              <span>Ref: {credit.reason}</span>
                              <span className="opacity-50">•</span>
                              <span>{credit.dateEarned || "No Date"}</span>
                            </p>
                          </div>

                          <div className="ml-4 text-right">
                            <p className={`font-[family-name:var(--font-space)] text-lg ${credit.isUsed ? "text-[var(--text-muted)]" : "text-green-400"}`}>
                              ₹{credit.amount.toLocaleString()}
                            </p>
                            {credit.isUsed && credit.usedInMonth !== null && (
                              <p className="text-[10px] text-amber-400/80 mt-0.5">
                                Used in {MONTHS[credit.usedInMonth]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Add Credit Modal */}
      {showAddModal && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="glass-modal !max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-[family-name:var(--font-space)] text-xl tracking-wider">
                  ADD CREDIT
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
                    Referred From *
                  </label>
                  {loadingStudents ? (
                    <p className="text-[var(--text-muted)] text-sm">Loading students...</p>
                  ) : (
                    <select
                      value={newCredit.studentId}
                      onChange={(e) =>
                        setNewCredit({ ...newCredit, studentId: e.target.value })
                      }
                      className="input-field"
                    >
                      <option value="">Select student...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
                    Credit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={newCredit.amount}
                    onChange={(e) =>
                      setNewCredit({
                        ...newCredit,
                        amount: parseInt(e.target.value) || 500,
                      })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
                    Referred To (New Student) *
                  </label>
                  {loadingStudents ? (
                    <p className="text-[var(--text-muted)] text-sm">Loading students...</p>
                  ) : (
                    <select
                      value={
                        students.find((s) => newCredit.reason.includes(s.id))
                          ?.id || ""
                      }
                      onChange={(e) => {
                        const selectedStudent = students.find(
                          (s) => s.id === e.target.value,
                        );
                        if (selectedStudent) {
                          setNewCredit({
                            ...newCredit,
                            reason: `${selectedStudent.name} (${selectedStudent.id})`,
                          });
                        } else {
                          setNewCredit({ ...newCredit, reason: "" });
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">Select new student...</option>
                      {students
                        .filter((s) => s.id !== newCredit.studentId) // Exclude the referrer
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.id})
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
                    Used In Month (Optional)
                  </label>
                  <select
                    value={newCredit.usedInMonth}
                    onChange={(e) =>
                      setNewCredit({ ...newCredit, usedInMonth: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="">Not Used Yet</option>
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m} {feeYear}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2 font-medium">
                    Description
                  </label>
                  <textarea
                    value={newCredit.description}
                    onChange={(e) => setNewCredit({ ...newCredit, description: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                    className="input-field resize-none"
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
                  onClick={handleAddCredit}
                  disabled={adding || !newCredit.studentId}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-[family-name:var(--font-space)] tracking-wider text-sm hover:bg-green-500 transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    "ADDING..."
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      ADD CREDIT
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Detail Modal */}
      {selectedCredit && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedCredit(null)}>
          <div className="glass-modal !max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-[family-name:var(--font-space)] text-xl tracking-wider flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" /> CREDIT DETAILS
                </h2>
                <button
                  onClick={() => setSelectedCredit(null)}
                  className="text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center mb-5">
                <span
                  className={`text-xs px-4 py-1.5 border rounded-full font-medium tracking-wide ${selectedCredit.isUsed
                    ? "bg-amber-600/10 text-amber-500 border-amber-600/30"
                    : "bg-green-600/20 text-green-400 border-green-600/50"
                    }`}
                >
                  {selectedCredit.isUsed ? "✓ Redeemed" : "● Active"}
                </span>
              </div>

              {/* Amount */}
              <div className="text-center mb-6">
                <p className={`font-[family-name:var(--font-space)] text-3xl ${selectedCredit.isUsed ? "text-[var(--text-muted)]" : "text-green-400"
                  }`}>
                  ₹{selectedCredit.amount.toLocaleString()}
                </p>
              </div>

              {/* Details Grid */}
              <div className="space-y-3">
                <div className="glass-surface p-3 rounded-lg">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Student</p>
                  <p className="text-white text-sm font-medium">{selectedCredit.studentName}</p>
                  <p className="text-[var(--text-muted)] text-xs">ID: {selectedCredit.studentId}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-surface p-3 rounded-lg">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Credit ID</p>
                    <p className="text-white text-sm font-mono truncate">{selectedCredit.id}</p>
                  </div>
                  <div className="glass-surface p-3 rounded-lg">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Reason</p>
                    <p className="text-white text-sm line-clamp-1">{selectedCredit.reason}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-surface p-3 rounded-lg">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Date Earned</p>
                    <p className="text-white text-sm">{selectedCredit.dateEarned}</p>
                  </div>
                  {selectedCredit.isUsed && selectedCredit.usedDate && (
                    <div className="glass-surface p-3 rounded-lg">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Redeemed On</p>
                      <p className="text-amber-400 text-sm">{selectedCredit.usedDate.split('T')[0]}</p>
                    </div>
                  )}
                  {selectedCredit.isUsed && selectedCredit.usedInMonth !== null && (
                    <div className="glass-surface p-3 rounded-lg">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Applied For</p>
                      <p className="text-amber-400 text-sm">
                        {MONTHS[selectedCredit.usedInMonth] || "Unknown"}
                      </p>
                    </div>
                  )}
                </div>

                {selectedCredit.description && (
                  <div className="glass-surface p-3 rounded-lg">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-0.5">Description</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{selectedCredit.description}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedCredit(null)}
                className="w-full mt-6 btn-ghost font-[family-name:var(--font-space)] tracking-wider text-sm"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
