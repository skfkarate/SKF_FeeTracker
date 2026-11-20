"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Gift, X, Zap, Wallet, Trophy } from "lucide-react";
import {
  getReferralCredits,
  addReferralCredit,
  editReferralCredit,
  deleteReferralCredit,
  getStudents,
  ReferralCreditsData,
  ReferralCredit,
  Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { useToast } from "@/lib/use-toast";
import { getCurrentFeeYear } from "@/lib/fee-year";
import GlobalSearch from "@/components/common/GlobalSearch";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import AccountMenu from "@/components/common/AccountMenu";
import { ConfirmModal } from "@/components/common/ConfirmModal";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function StudentCreditsPage() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ amount: 0, reason: "", description: "" });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const openAddModal = async () => {
    setShowAddModal(true);
    setLoadingStudents(true);
    try {
      const studentList = await getStudents(branch, new Date().getMonth(), false, feeYear);
      setStudents(studentList.filter((s) => s.status === "Active"));
    } catch {
      toast("Failed to load students", "error");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddCredit = async () => {
    if (!newCredit.studentId) {
      toast("Please select a student", "error");
      return;
    }
    if (newCredit.amount <= 0) {
      toast("Please enter a valid amount", "error");
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
      toast("Referral credit added", "success");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add credit", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleEditCredit = async () => {
    if (!selectedCredit) return;
    if (editForm.amount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    setUpdating(true);
    try {
      await editReferralCredit(branch, selectedCredit.id, {
        amount: editForm.amount,
        reason: editForm.reason,
        description: editForm.description,
      });
      setIsEditing(false);
      setSelectedCredit({ ...selectedCredit, ...editForm });
      toast("Referral credit updated", "success");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update credit", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCredit = () => {
    if (!selectedCredit) return;
    setConfirmOpen(true);
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
    <PageShell
      hud={{
        title: "Student Credits",
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
        {/* Branch Toggle */}
        <div className="flex p-[4px] bg-[color:var(--color-well)] rounded-xl w-full max-w-md mx-auto border border-[color:var(--color-hairline)] mb-[24px]">
          <button
            onClick={() => setBranch("Herohalli")}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-sans tracking-wider transition-all duration-300 ${branch === "Herohalli"
              ? "bg-[color:var(--color-well)] text-[color:var(--color-text)] shadow-lg shadow-[0_18px_45px_rgba(0,0,0,0.28)] border border-[color:var(--color-hairline)]"
              : "text-[var(--text-muted)] hover:text-[color:var(--color-text)]"
              }`}
          >
            HEROHALLI
          </button>
          <button
            onClick={() => setBranch("MPSC")}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-sans tracking-wider transition-all duration-300 ${branch === "MPSC"
              ? "bg-[color:var(--color-well)] text-[color:var(--color-text)] shadow-lg shadow-[0_18px_45px_rgba(0,0,0,0.28)] border border-[color:var(--color-hairline)]"
              : "text-[var(--text-muted)] hover:text-[color:var(--color-text)]"
              }`}
          >
            MP SPORTS CLUB
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-[64px]">
            <div className="spinner mx-auto mb-[16px]" />
            <p className="text-[var(--text-muted)] text-sm">Loading student credits...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-[64px]">
            <p className="text-[color:var(--color-text-dim)] mb-[16px] text-sm">{error}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mb-[24px] animate-fade-in">
              <div className="glass-card p-[16px] relative overflow-hidden" style={{ borderColor: "var(--color-accent-border)" }}>
                <div className="absolute top-[0px] right-[0px] p-[8px] opacity-10">
                  <Trophy className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[4px] flex items-center gap-[4px]">
                  <Trophy className="w-[12px] h-[12px]" /> Total Issued
                </p>
                <p className="font-sans text-lg sm:text-xl text-[color:var(--color-text-dim)]">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-[4px] opacity-70">
                  {stats.total} credits total
                </p>
              </div>

              <div className="glass-card p-[16px] relative overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
                <div className="absolute top-[0px] right-[0px] p-[8px] opacity-10">
                  <Zap className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[4px] flex items-center gap-[4px]">
                  <Zap className="w-[12px] h-[12px]" /> Active
                </p>
                <p className="font-sans text-lg sm:text-xl text-[color:var(--color-text-dim)]">
                  ₹{stats.activeAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-[4px] opacity-70">
                  {stats.active} available to use
                </p>
              </div>

              <div className="glass-card p-[16px] relative overflow-hidden" style={{ borderColor: "var(--color-hairline)" }}>
                <div className="absolute top-[0px] right-[0px] p-[8px] opacity-10">
                  <Wallet className="w-[48px] h-[48px] text-[color:var(--color-text-dim)]" />
                </div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[4px] flex items-center gap-[4px]">
                  <Wallet className="w-[12px] h-[12px]" /> Redeemed
                </p>
                <p className="font-sans text-lg sm:text-xl text-[color:var(--color-text-dim)]">
                  ₹{stats.redeemedAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-[4px] opacity-70">
                  {stats.redeemed} credits used
                </p>
              </div>
            </div>

            {/* Credits List */}
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between mb-[12px]">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                  Credit Ledger
                </p>
                <button
                  onClick={openAddModal}
                  className="px-[16px] py-[8px] text-xs sm:text-sm rounded-lg border border-[color:var(--color-accent-border)] text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-accent-strong)] hover:text-[color:var(--color-accent-ink)] transition-all duration-200 font-medium tracking-wide flex items-center gap-[4px]"
                >
                  <Plus className="w-[16px] h-[16px]" /> Add Credit
                </button>
              </div>

              <div className="space-y-[8px]">
                {data.credits.length === 0 ? (
                  <div className="glass-card p-[24px] text-center text-[var(--text-muted)] text-sm">
                    No student credits yet. Add one when a student achieves a rank or refers someone.
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
                        onClick={() => {
                          setSelectedCredit(credit);
                          setEditForm({ amount: credit.amount, reason: credit.reason, description: credit.description });
                          setIsEditing(false);
                        }}
                        className={`glass-card p-[16px] transition-all duration-200 cursor-pointer group ${credit.isUsed
                          ? "opacity-60 hover:opacity-80 border-[color:var(--color-hairline)]"
                          : "hover:border-[color:var(--color-accent-border)] border-[color:var(--color-hairline)]"
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-[0px]">
                            <div className="flex flex-col items-start gap-[6px] mb-[6px]">
                              <p className="font-sans tracking-wide text-sm text-[color:var(--color-text)] group-hover:text-[color:var(--color-text)] transition-colors leading-snug">
                                {credit.studentName}
                              </p>
                              <span
                                className={`text-[10px] px-[8px] py-[2px] border rounded-full whitespace-nowrap flex-shrink-0 ${credit.isUsed
                                  ? "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]"
                                  : "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]"
                                  }`}
                              >
                                {credit.isUsed ? "Redeemed" : "Active"}
                              </span>
                            </div>
                            <p className="text-[var(--text-muted)] text-xs flex items-center gap-[8px]">
                              <span>Ref: {credit.reason}</span>
                              <span className="opacity-50">•</span>
                              <span>{credit.dateEarned || "No Date"}</span>
                            </p>
                          </div>

                          <div className="ml-[16px] text-right">
                            <p className={`font-sans text-lg ${credit.isUsed ? "text-[var(--text-muted)]" : "text-[color:var(--color-text-dim)]"}`}>
                              ₹{credit.amount.toLocaleString()}
                            </p>
                            {credit.isUsed && credit.usedInMonth !== null && (
                              <p className="text-[10px] text-[color:var(--color-text-dim)] mt-[2px]">
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

      {/* Add Credit Modal */}
      {showAddModal && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="glass-modal !max-w-md">
            <div className="p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <h2 className="font-sans text-xl tracking-wider">
                  ADD CREDIT
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
                    Assign To Student *
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
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
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
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                    Reason (e.g. Referral, Achievement) *
                  </label>
                  <input
                    type="text"
                    value={newCredit.reason}
                    onChange={(e) => setNewCredit({ ...newCredit, reason: e.target.value })}
                    placeholder="Why is this credit given?"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
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
                  <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
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

              <div className="flex gap-[12px] mt-[24px]">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost flex-1 font-sans tracking-wider text-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddCredit}
                  disabled={adding || !newCredit.studentId || !newCredit.reason}
                  className="flex-1 py-[12px] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] rounded-lg font-sans tracking-wider text-sm hover:bg-[color:var(--color-accent-strong)] transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    "ADDING..."
                  ) : (
                    <span className="flex items-center justify-center gap-[8px]">
                      ADD CREDIT
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete Credit"
        message="Are you sure you want to delete this credit? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          setConfirmOpen(false);
          if (!selectedCredit) return;
          setDeleting(true);
          try {
            await deleteReferralCredit(branch, selectedCredit.id);
            setSelectedCredit(null);
            toast("Referral credit deleted", "success");
            loadData();
          } catch (err) {
            toast(err instanceof Error ? err.message : "Failed to delete credit", "error");
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setConfirmOpen(false)}
        loading={deleting}
      />

      {/* Credit Detail Modal */}
      {selectedCredit && (
        <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedCredit(null)}>
          <div className="glass-modal !max-w-md">
            <div className="p-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <h2 className="font-sans text-xl tracking-wider flex items-center gap-[8px]">
                  <Gift className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" /> CREDIT DETAILS
                </h2>
                <button
                  onClick={() => setSelectedCredit(null)}
                  className="text-[var(--text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <X className="w-[20px] h-[20px]" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center mb-[20px]">
                <span
                  className={`text-xs px-[16px] py-[6px] border rounded-full font-medium tracking-wide ${selectedCredit.isUsed
                    ? "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]"
                    : "bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]"
                    }`}
                >
                  {selectedCredit.isUsed ? "✓ Redeemed" : "● Active"}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-[16px] mb-[24px]">
                  <div>
                    <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseInt(e.target.value) || 0 })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={editForm.reason}
                      onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-[8px] font-medium">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="input-field resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-[8px] pt-[8px]">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 btn-ghost tracking-wider text-xs"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleEditCredit}
                      disabled={updating}
                      className="flex-1 py-[8px] bg-[color:var(--color-well)] text-[color:var(--color-text)] rounded-lg tracking-wider text-xs hover:bg-[color:var(--color-accent)] transition-colors"
                    >
                      {updating ? "SAVING..." : "SAVE CHANGES"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Amount */}
                  <div className="text-center mb-[24px]">
                    <p className={`font-sans text-3xl ${selectedCredit.isUsed ? "text-[var(--text-muted)]" : "text-[color:var(--color-text-dim)]"
                      }`}>
                      ₹{selectedCredit.amount.toLocaleString()}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-[12px]">
                    <div className="glass-surface p-[12px] rounded-lg">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Student</p>
                      <p className="text-[color:var(--color-text)] text-sm font-medium">{selectedCredit.studentName}</p>
                      <p className="text-[var(--text-muted)] text-xs">ID: {selectedCredit.studentId}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-[12px]">
                      <div className="glass-surface p-[12px] rounded-lg">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Credit ID</p>
                        <p className="text-[color:var(--color-text)] text-sm font-mono truncate">{selectedCredit.id}</p>
                      </div>
                      <div className="glass-surface p-[12px] rounded-lg">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Reason</p>
                        <p className="text-[color:var(--color-text)] text-sm line-clamp-1">{selectedCredit.reason}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-[12px]">
                      <div className="glass-surface p-[12px] rounded-lg">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Date Earned</p>
                        <p className="text-[color:var(--color-text)] text-sm">{selectedCredit.dateEarned}</p>
                      </div>
                      {selectedCredit.isUsed && selectedCredit.usedDate && (
                        <div className="glass-surface p-[12px] rounded-lg">
                          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Redeemed On</p>
                          <p className="text-[color:var(--color-text-dim)] text-sm">{selectedCredit.usedDate.split('T')[0]}</p>
                        </div>
                      )}
                      {selectedCredit.isUsed && selectedCredit.usedInMonth !== null && (
                        <div className="glass-surface p-[12px] rounded-lg">
                          <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Applied For</p>
                          <p className="text-[color:var(--color-text-dim)] text-sm">
                            {MONTHS[selectedCredit.usedInMonth] || "Unknown"}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedCredit.description && (
                      <div className="glass-surface p-[12px] rounded-lg">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-[2px]">Description</p>
                        <p className="text-[color:var(--color-text)] text-sm whitespace-pre-wrap">{selectedCredit.description}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-[8px] mt-[24px]">
                {!isEditing && (
                  <>
                    <button
                      onClick={handleDeleteCredit}
                      disabled={deleting}
                      className="px-[12px] py-[8px] border border-[color:var(--color-hairline-strong)] text-[color:var(--color-text-dim)] rounded-lg tracking-wider text-xs hover:bg-[color:var(--color-well)] transition-colors"
                      title="Delete Credit"
                    >
                      {deleting ? "..." : "DELETE"}
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-[12px] py-[8px] border border-[color:var(--color-accent-border)] text-[color:var(--color-text-dim)] rounded-lg tracking-wider text-xs hover:bg-[color:var(--color-well)] transition-colors"
                    >
                      EDIT
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedCredit(null)}
                  className="flex-1 btn-ghost font-sans tracking-wider text-sm"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
