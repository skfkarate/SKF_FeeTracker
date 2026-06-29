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

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
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
      <div className="min-h-screen bg-black text-zinc-300">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Black Belt 2026" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Examinations</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Black Belt 2026
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => loadCandidates(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="card-panel overflow-hidden p-4 sm:p-5">
          <div className="mb-6 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-minimal pl-10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-500">
                No candidates found.
              </div>
            ) : (
              filteredCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => openEditor(candidate)}
                  className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{candidate.display_name}</p>
                        <p className="text-xs text-zinc-500">{candidate.skf_id}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-white" />
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-zinc-800 bg-black/40 p-2">
                      <span className="block text-zinc-500">Readiness</span>
                      <span className="font-medium capitalize text-zinc-300">{candidate.readiness.replace('_', ' ')}</span>
                    </div>
                    <div className="rounded border border-zinc-800 bg-black/40 p-2">
                      <span className="block text-zinc-500">Teaching Hrs</span>
                      <span className="font-medium text-zinc-300">{candidate.teaching_hours || 0} hrs</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedCandidate ? (
          <div className="glass-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEditor()}>
            <form onSubmit={handleSubmit} className="glass-modal max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3 sticky top-0 bg-[#050505]/95 backdrop-blur-md pb-4 border-b border-zinc-800 z-10 -mt-4 pt-4 -mx-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedCandidate.display_name}</h2>
                    <p className="text-xs text-zinc-500">{selectedCandidate.skf_id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex border-b border-zinc-800 mb-4 overflow-x-auto hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("status")}
                  className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "status" ? "border-red-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                >
                  Overview & Status
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("academics")}
                  className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "academics" ? "border-red-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                >
                  Academics & Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("practical")}
                  className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "practical" ? "border-red-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                >
                  Practical & Combat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("continuous")}
                  className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${activeTab === "continuous" ? "border-red-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
                >
                  Continuous Tasks
                </button>
              </div>

              <div className="space-y-6 pt-2">
                {activeTab === "status" && (
                  <section>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Overall Readiness</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Final Result</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Final Score</span>
                        <input
                          type="number"
                          step="0.1"
                          className="input-minimal"
                          value={editForm.exam_score || ""}
                          onChange={(e) => handleFieldChange("exam_score", e.target.value ? Number(e.target.value) : null)}
                        />
                      </label>

                      <label className="block mt-4 sm:col-span-2">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Instructor Notes</span>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">First Aid Certification</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">WKF Kumite Rules</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">WKF Kata Rules</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">WKF Referee Status</span>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Weapon Mastery</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Bunkai Mechanics</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Tournament Kata</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Tournament Kumite</span>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Teaching Status</span>
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
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Teaching Hours</span>
                        <input
                          type="number"
                          className="input-minimal"
                          value={editForm.teaching_hours || 0}
                          onChange={(e) => handleFieldChange("teaching_hours", Number(e.target.value))}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Video Submissions</span>
                        <input
                          type="number"
                          className="input-minimal"
                          value={editForm.video_count || 0}
                          onChange={(e) => handleFieldChange("video_count", Number(e.target.value))}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-zinc-400">Marketing Enrollment</span>
                        <select
                          className="input-minimal"
                          value={editForm.marketing_status || "in_progress"}
                          onChange={(e) => handleFieldChange("marketing_status", e.target.value)}
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="enrolled">Student Enrolled</option>
                        </select>
                      </label>
                      <label className="block flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950 mt-4 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={editForm.mock_exam_done || false}
                          onChange={(e) => handleFieldChange("mock_exam_done", e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500 focus:ring-offset-zinc-950"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-white">Mock Examinations Completed</span>
                          <span className="block text-xs text-zinc-500">Has the candidate passed the mock examinations?</span>
                        </div>
                      </label>
                    </div>

                    <div className="mt-6">
                      <h4 className="mb-3 text-xs font-semibold text-zinc-400">Self-Defense Monthly Check-ins</h4>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((monthNum) => {
                          const key = `month_${monthNum}`;
                          const isChecked = editForm.self_defense_months?.[key] ?? selectedCandidate?.self_defense_months?.[key] ?? false;
                          return (
                            <label key={key} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-950">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleSelfDefenseChange(key, e.target.checked)}
                                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500 focus:ring-offset-zinc-950"
                              />
                              <span className="text-xs text-zinc-300">Month {monthNum}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end border-t border-zinc-800 mt-6">
                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving}
                    className="btn-ghost inline-flex min-h-11 items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary bg-red-600 hover:bg-red-500 text-white inline-flex min-h-11 items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Candidate
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
