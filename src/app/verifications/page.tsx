"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Bell, MessageCircle, AlertCircle, ArrowRight, ExternalLink, XCircle } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  approvePaymentVerification,
  getPaymentVerifications,
  getStudents,
  PaymentVerification,
  rejectPaymentVerification,
  Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import Link from "next/link";

// Auto-refresh every 7 minutes to keep signed proof URLs fresh (they expire in 10 min)
const AUTO_REFRESH_MS = 7 * 60 * 1000;

export default function VerificationsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [verifications, setVerifications] = useState<PaymentVerification[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<(Student & { branch: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadInbox = useCallback(async (silent = false) => {
    if (checking || !user) return;
    if (!silent) setLoading(true);
    setError("");
    const currentMonth = new Date().getMonth();

    try {
      const [verificationRows, mpsc, hero] = await Promise.all([
        getPaymentVerifications("Overall"),
        getStudents("MPSC", currentMonth),
        getStudents("Herohalli", currentMonth),
      ]);
      const allStudents = [
        ...mpsc.map(s => ({ ...s, branch: "MPSC" })),
        ...hero.map(s => ({ ...s, branch: "Herohalli" }))
      ].filter(s => s.status.toLowerCase() === "active");

      const overdue = allStudents.filter(s => s.monthStatus === "Pending");
      setVerifications(verificationRows);
      setOverdueStudents(overdue);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load action inbox");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [checking, user]);

  // Initial load
  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  // Auto-refresh timer to keep signed URLs alive
  useEffect(() => {
    if (checking || !user) return;
    refreshTimerRef.current = setInterval(() => {
      void loadInbox(true);
    }, AUTO_REFRESH_MS);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [checking, user, loadInbox]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleApprove = async (proofId: string) => {
    // Optimistic removal
    const prevVerifications = verifications;
    setVerifications(v => v.filter(p => p.id !== proofId));
    setActioning(proofId);
    try {
      await approvePaymentVerification(proofId);
      showToast("Payment approved successfully");
      // Background sync to pick up any new verifications or updated overdue lists
      void loadInbox(true);
    } catch (err) {
      // Rollback optimistic update on failure
      setVerifications(prevVerifications);
      const msg = err instanceof Error ? err.message : "Failed to approve payment proof";
      showToast(msg, "error");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (proofId: string) => {
    const note = window.prompt("Reason for rejecting this payment proof?");
    if (!note?.trim()) return;

    // Optimistic removal
    const prevVerifications = verifications;
    setVerifications(v => v.filter(p => p.id !== proofId));
    setActioning(proofId);
    try {
      await rejectPaymentVerification(proofId, note.trim());
      showToast("Payment proof rejected");
      // Background sync
      void loadInbox(true);
    } catch (err) {
      // Rollback optimistic update on failure
      setVerifications(prevVerifications);
      const msg = err instanceof Error ? err.message : "Failed to reject payment proof";
      showToast(msg, "error");
    } finally {
      setActioning(null);
    }
  };

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Action Inbox" rightContent={<NavMenu />} />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        
        <header className="mb-10 flex items-end justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Priority Queue</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-4xl font-semibold tracking-tight text-white mt-2">
              Action Inbox
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-500 px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <span className="text-white">{verifications.length + overdueStudents.length}</span> pending actions
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center h-40 items-center">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card-panel p-8 text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button onClick={() => loadInbox()} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        ) : verifications.length === 0 && overdueStudents.length === 0 ? (
          <div className="card-panel p-12 text-center flex flex-col items-center justify-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Inbox Zero</h3>
            <p className="text-zinc-500 max-w-sm">All pending actions and fee collections have been cleared. Excellent work!</p>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            
            {/* Needs Approval Section */}
            {verifications.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50 mb-4">
                  <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Needs Approval
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {verifications.map((proof) => (
                    <div key={proof.id} className="card-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-emerald-500/20 bg-emerald-500/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-zinc-200">{proof.studentName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-zinc-500">{proof.studentId}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400">{proof.branch}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[10px] text-zinc-400">
                              ₹{proof.amount.toLocaleString("en-IN")} {proof.monthName ? `• ${proof.monthName} ${proof.year}` : ""}
                            </span>
                          </div>
                          {proof.paymentReference && (
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Ref: {proof.paymentReference}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                        {proof.proofUrl && (
                          <a
                            href={proof.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
                          >
                            Proof <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReject(proof.id)}
                          disabled={actioning === proof.id}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(proof.id)}
                          disabled={actioning === proof.id}
                          className="px-3 py-1.5 rounded-lg border border-transparent bg-emerald-500 text-black text-xs font-medium hover:bg-emerald-400 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Section */}
            {overdueStudents.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50 mb-4">
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Overdue Payments
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {overdueStudents.map(student => (
                    <div key={student.id} className="card-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-zinc-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-zinc-200">{student.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-zinc-500">{student.id}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400">{student.branch}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:ml-auto">
                        <a 
                          href={`https://wa.me/91${student.whatsapp?.replace(/\D/g, '') || student.phone?.replace(/\D/g, '')}?text=Reminder:%20Fee%20pending%20for%20this%20month`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
                        >
                          <MessageCircle className="w-3 h-3" /> Remind
                        </a>
                        <Link 
                          href={`/students/${student.branch}/${encodeURIComponent(student.id)}`}
                          className="px-3 py-1.5 rounded-lg border border-transparent bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
                        >
                          View Profile <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-md border transition-all animate-slide-up ${
          toast.type === "success"
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            : "bg-red-500/20 text-red-300 border-red-500/30"
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
