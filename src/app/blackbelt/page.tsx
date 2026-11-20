"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";

import GlobalSearch from "@/components/common/GlobalSearch";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import AccountMenu from "@/components/common/AccountMenu";
import { getBBCandidates, updateBBCandidate } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { useToast } from "@/lib/use-toast";

type BBCandidate = {
  id: string;
  skf_id: string;
  display_name: string;
  first_aid_status: string;
  marketing_status: string;
  enrollment_fee_status: string;
  tournament_kata_status: string;
  tournament_kumite_status: string;
  fitness_baseline_done: boolean;
  fitness_retest_done: boolean;
  wkf_kumite_status: string;
  wkf_kata_status: string;
  wkf_referee_status: string;
  weapon_status: string;
  bunkai_status: string;
  video_count: number;
  teaching_status: string;
  teaching_hours: number;
  mock_exam_done: boolean;
  self_defense_months: Record<string, boolean>;
  readiness: string;
  exam_score: number | null;
  exam_result: string | null;
  instructor_notes: string;
};

export default function BlackBeltPage() {
  const { user, checking } = useFeeTrackAuth();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<BBCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedCandidate, setSelectedCandidate] = useState<BBCandidate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editForm, setEditForm] = useState<Partial<BBCandidate>>({});
  const [activeTab, setActiveTab] = useState("status");

  const loadCandidates = useCallback(async (forceRefresh = false) => {
    setError("");
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const rows = await getBBCandidates();
      setCandidates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load candidates.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    const timeoutId = window.setTimeout(() => {
      void loadCandidates();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [checking, loadCandidates, user]);

  const filteredCandidates = candidates.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.skf_id.toLowerCase().includes(search.toLowerCase())
  );

  function openEditor(candidate: BBCandidate) {
    setSelectedCandidate(candidate);
    setEditForm({ ...candidate });
  }

  function closeEditor() {
    if (saving) return;
    setSelectedCandidate(null);
    setEditForm({});
    setActiveTab("status");
  }

  function handleFieldChange(field: keyof BBCandidate, value: unknown) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelfDefenseChange(month: string, checked: boolean) {
    setEditForm((prev) => ({
      ...prev,
      self_defense_months: {
        ...(prev.self_defense_months || selectedCandidate?.self_defense_months || {}),
        [month]: checked,
      },
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCandidate) return;

    setSaving(true);
    setError("");

    try {
      const updated = await updateBBCandidate(selectedCandidate.id, editForm);
      setCandidates((current) =>
        current.map((c) => (c.id === updated.id ? updated : c))
      );
      toast(`${updated.display_name} has been updated successfully.`, "success");
      closeEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update candidate.");
      toast(err instanceof Error ? err.message : "An error occurred.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-[color:var(--color-well)] text-[color:var(--color-text)]">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
        </div>
      </div>
    );
  }

  return (
    <PageShell
      hud={{
        title: "Black Belt 2026",
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
        <header className="mb-[32px] flex flex-col gap-[20px] md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-[12px] flex items-center gap-[12px]">
              <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--color-accent)]" />
              <p className="text-xs font-mono uppercase tracking-widest text-[color:var(--color-text-dim)]">Examinations</p>
            </div>
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
              Black Belt 2026
            </h1>
          </div>
          <div className="flex gap-[12px]">
            <button
              type="button"
              onClick={() => loadCandidates(true)}
              disabled={refreshing}
              className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
            >
              <RefreshCw className={`h-[16px] w-[16px] ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="card-panel overflow-hidden p-[16px] sm:p-[20px]">
          <div className="mb-[24px] max-w-md relative">
            <Search className="absolute left-[12px] top-[50%] -translate-y-1/2 h-[16px] w-[16px] text-[color:var(--color-text-dim)]" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-minimal pl-[40px]"
            />
          </div>

          <div className="grid gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-[48px] flex justify-center">
                <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="col-span-full py-[48px] text-center text-[color:var(--color-text-dim)]">
                No candidates found.
              </div>
            ) : (
              filteredCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => openEditor(candidate)}
                  className="flex flex-col rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[16px] text-left transition-colors hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)] group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[12px]">
                      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
                        <Trophy className="h-[20px] w-[20px]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--color-text)]">{candidate.display_name}</p>
                        <p className="text-xs text-[color:var(--color-text-dim)]">{candidate.skf_id}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-[20px] w-[20px] text-[color:var(--color-text-faint)] transition-colors group-hover:text-[color:var(--color-text)]" />
                  </div>
                  
                  <div className="mt-[16px] grid grid-cols-2 gap-[8px] text-xs">
                    <div className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[8px]">
                      <span className="block text-[color:var(--color-text-dim)]">Readiness</span>
                      <span className="font-medium capitalize text-[color:var(--color-text)]">{candidate.readiness.replace('_', ' ')}</span>
                    </div>
                    <div className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[8px]">
                      <span className="block text-[color:var(--color-text-dim)]">Teaching Hrs</span>
                      <span className="font-medium text-[color:var(--color-text)]">{candidate.teaching_hours || 0} hrs</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedCandidate ? (
          <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEditor()}>
            <form onSubmit={handleSubmit} className="glass-modal max-w-2xl max-h-[90vh] overflow-y-auto p-[16px] sm:p-[20px]">
              <div className="mb-[20px] flex items-center justify-between gap-[12px] sticky top-[0px] bg-[color:var(--color-well)] backdrop-blur-md pb-[16px] border-b border-[color:var(--color-hairline)] z-10 mt-[-16px] pt-[16px] mx-[-16px] px-[16px]">
                <div className="flex items-center gap-[12px]">
                  <div className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
                    <ShieldCheck className="h-[20px] w-[20px]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{selectedCandidate.display_name}</h2>
                    <p className="text-xs text-[color:var(--color-text-dim)]">{selectedCandidate.skf_id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-lg hover:bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <X className="h-[16px] w-[16px]" />
                </button>
              </div>

              <div className="flex border-b border-[color:var(--color-hairline)] mb-[16px] overflow-x-auto hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("status")}
                  className={`px-[16px] py-[8px] text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "status" ? "border-[color:var(--color-accent-border)] text-[color:var(--color-text)]" : "border-transparent text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
                >
                  Overview & Status
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("academics")}
                  className={`px-[16px] py-[8px] text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "academics" ? "border-[color:var(--color-accent-border)] text-[color:var(--color-text)]" : "border-transparent text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
                >
                  Academics & Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("practical")}
                  className={`px-[16px] py-[8px] text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "practical" ? "border-[color:var(--color-accent-border)] text-[color:var(--color-text)]" : "border-transparent text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
                >
                  Practical & Combat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("continuous")}
                  className={`px-[16px] py-[8px] text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "continuous" ? "border-[color:var(--color-accent-border)] text-[color:var(--color-text)]" : "border-transparent text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
                >
                  Continuous Tasks
                </button>
              </div>

              <div className="space-y-[24px] pt-[8px]">
                {activeTab === "status" && (
                  <section>
                    <div className="grid gap-[16px] sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Overall Readiness</span>
                        <select
                          className="input-minimal"
                          value={editForm.readiness || "on_track"}
                          onChange={(e) => handleFieldChange("readiness", e.target.value)}
                        >
                          <option value="on_track">On Track</option>
                          <option value="attention_needed">Attention Needed</option>
                          <option value="exam_ready">Exam Ready</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Final Result</span>
                        <select
                          className="input-minimal"
                          value={editForm.exam_result || ""}
                          onChange={(e) => handleFieldChange("exam_result", e.target.value || null)}
                        >
                          <option value="">Pending / Not Graded</option>
                          <option value="pass">Pass</option>
                          <option value="conditional">Conditional Pass</option>
                          <option value="defer">Defer / Re-evaluate</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Final Score</span>
                        <input
                          type="number"
                          step="0.1"
                          className="input-minimal"
                          value={editForm.exam_score || ""}
                          onChange={(e) => handleFieldChange("exam_score", e.target.value ? Number(e.target.value) : null)}
                        />
                      </label>

                      <label className="block mt-[16px] sm:col-span-2">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Instructor Notes</span>
                        <textarea
                          className="input-minimal min-h-[100px] resize-y"
                          value={editForm.instructor_notes || ""}
                          onChange={(e) => handleFieldChange("instructor_notes", e.target.value)}
                          placeholder="Add any internal remarks here..."
                        />
                      </label>
                    </div>
                  </section>
                )}

                {activeTab === "academics" && (
                  <section>
                    <div className="grid gap-[16px] sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">First Aid Certification</span>
                        <select
                          className="input-minimal"
                          value={editForm.first_aid_status || "not_started"}
                          onChange={(e) => handleFieldChange("first_aid_status", e.target.value)}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">WKF Kumite Rules</span>
                        <select
                          className="input-minimal"
                          value={editForm.wkf_kumite_status || "not_started"}
                          onChange={(e) => handleFieldChange("wkf_kumite_status", e.target.value)}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="reading">Reading</option>
                          <option value="quiz_passed">Quiz Passed</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">WKF Kata Rules</span>
                        <select
                          className="input-minimal"
                          value={editForm.wkf_kata_status || "not_started"}
                          onChange={(e) => handleFieldChange("wkf_kata_status", e.target.value)}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="reading">Reading</option>
                          <option value="quiz_passed">Quiz Passed</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">WKF Referee Status</span>
                        <select
                          className="input-minimal"
                          value={editForm.wkf_referee_status || "not_started"}
                          onChange={(e) => handleFieldChange("wkf_referee_status", e.target.value)}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="reviewed">Reviewed</option>
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                {activeTab === "practical" && (
                  <section>
                    <div className="grid gap-[16px] sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Weapon Mastery</span>
                        <select
                          className="input-minimal"
                          value={editForm.weapon_status || "not_started"}
                          onChange={(e) => handleFieldChange("weapon_status", e.target.value)}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="exam_ready">Exam Ready</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Bunkai Mechanics</span>
                        <select
                          className="input-minimal"
                          value={editForm.bunkai_status || "not_done"}
                          onChange={(e) => handleFieldChange("bunkai_status", e.target.value)}
                        >
                          <option value="not_done">Not Done</option>
                          <option value="internal_demo">Internal Demo</option>
                          <option value="taught_to_kids">Taught to Juniors</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Tournament Kata</span>
                        <select
                          className="input-minimal"
                          value={editForm.tournament_kata_status || "not_won"}
                          onChange={(e) => handleFieldChange("tournament_kata_status", e.target.value)}
                        >
                          <option value="not_won">Not Won</option>
                          <option value="won">Won Medal</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Tournament Kumite</span>
                        <select
                          className="input-minimal"
                          value={editForm.tournament_kumite_status || "not_won"}
                          onChange={(e) => handleFieldChange("tournament_kumite_status", e.target.value)}
                        >
                          <option value="not_won">Not Won</option>
                          <option value="won">Won Medal</option>
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                {activeTab === "continuous" && (
                  <section>
                    <div className="grid gap-[16px] sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Teaching Status</span>
                        <select
                          className="input-minimal"
                          value={editForm.teaching_status || "ongoing"}
                          onChange={(e) => handleFieldChange("teaching_status", e.target.value)}
                        >
                          <option value="ongoing">Ongoing</option>
                          <option value="active">Active</option>
                          <option value="flagged">Flagged</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Teaching Hours</span>
                        <input
                          type="number"
                          className="input-minimal"
                          value={editForm.teaching_hours || 0}
                          onChange={(e) => handleFieldChange("teaching_hours", Number(e.target.value))}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Video Submissions</span>
                        <input
                          type="number"
                          className="input-minimal"
                          value={editForm.video_count || 0}
                          onChange={(e) => handleFieldChange("video_count", Number(e.target.value))}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-[8px] block text-xs font-semibold text-[color:var(--color-text-dim)]">Marketing Enrollment</span>
                        <select
                          className="input-minimal"
                          value={editForm.marketing_status || "in_progress"}
                          onChange={(e) => handleFieldChange("marketing_status", e.target.value)}
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="enrolled">Student Enrolled</option>
                        </select>
                      </label>
                      <label className="block flex items-center gap-[12px] p-[12px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] mt-[16px] sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={editForm.mock_exam_done || false}
                          onChange={(e) => handleFieldChange("mock_exam_done", e.target.checked)}
                          className="h-[16px] w-[16px] rounded border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] focus:ring-[color:var(--color-accent)] focus:ring-offset-[color:var(--color-base-deep)]"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-[color:var(--color-text)]">Mock Examinations Completed</span>
                          <span className="block text-xs text-[color:var(--color-text-dim)]">Has the candidate passed the mock examinations?</span>
                        </div>
                      </label>
                    </div>

                    <div className="mt-[24px]">
                      <h4 className="mb-[12px] text-xs font-semibold text-[color:var(--color-text-dim)]">Self-Defense Monthly Check-ins</h4>
                      <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((monthNum) => {
                          const key = `month_${monthNum}`;
                          const isChecked = editForm.self_defense_months?.[key] ?? selectedCandidate?.self_defense_months?.[key] ?? false;
                          return (
                            <label key={key} className="flex items-center gap-[8px] p-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleSelfDefenseChange(key, e.target.checked)}
                                className="h-[16px] w-[16px] rounded border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] focus:ring-[color:var(--color-accent)] focus:ring-offset-[color:var(--color-base-deep)]"
                              />
                              <span className="text-xs text-[color:var(--color-text)]">Month {monthNum}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex flex-col-reverse gap-[12px] pt-[16px] sm:flex-row sm:justify-end border-t border-[color:var(--color-hairline)] mt-[24px]">
                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving}
                    className="btn-ghost inline-flex min-h-[44px] items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-strong)] text-[color:var(--color-text)] inline-flex min-h-[44px] items-center justify-center gap-[8px]"
                  >
                    {saving ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <CheckCircle2 className="h-[16px] w-[16px]" />}
                    Save Candidate
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
    </PageShell>
  );
}
