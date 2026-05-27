"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  IndianRupee,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  addEventDeposit,
  addEventExpense,
  EventCollectionItem,
  EventFeeConfig,
  EventFeeOverride,
  EventFeePreviewRow,
  generateEventFees,
  getEventCollections,
  previewEventFees,
  upsertEventFeeConfig,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";

const BRANCHES = [
  { value: "Overall", label: "OVERALL" },
  { value: "Herohalli", label: "HEROHALLI" },
  { value: "MPSC", label: "MP SPORTS" },
];

const EVENT_TYPES = [
  { value: "all", label: "All" },
  { value: "belt_exam", label: "Belt Exams" },
  { value: "tournament", label: "Tournaments" },
  { value: "event", label: "Events" },
  { value: "other", label: "Other" },
];

function currency(amount: number) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultConfig(event: EventCollectionItem): EventFeeConfig {
  return {
    eventId: event.event.id,
    feeCategory: event.config?.feeCategory || (event.event.type === "tournament" ? "tournament" : event.event.type.includes("grading") || event.event.type.includes("belt") ? "belt_exam" : "event"),
    targetingMode: event.config?.targetingMode || "branch_and_eligibility",
    pricingMode: event.config?.pricingMode || "branch_belt",
    defaultAmount: event.config?.defaultAmount || 0,
    dueDate: event.config?.dueDate || event.event.date || today(),
    branchScope: event.config?.branchScope?.length ? event.config.branchScope : event.event.hostingBranch ? [event.event.hostingBranch] : [],
    beltScope: event.config?.beltScope || [],
    branchPrices: event.config?.branchPrices || {},
    beltPrices: event.config?.beltPrices || {},
    branchBeltPrices: event.config?.branchBeltPrices || {},
    studentOverrides: event.config?.studentOverrides || [],
    notes: event.config?.notes || "",
  };
}

function rowTone(status: EventFeePreviewRow["status"]) {
  if (status === "ready") return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
  if (status === "waived") return "text-blue-400 border-blue-500/20 bg-blue-500/10";
  if (status === "excluded") return "text-zinc-500 border-zinc-700 bg-zinc-800/60";
  return "text-amber-400 border-amber-500/20 bg-amber-500/10";
}

export default function EventCollectionsPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [branch, setBranch] = useState("Overall");
  const [typeFilter, setTypeFilter] = useState("all");
  const [data, setData] = useState<Awaited<ReturnType<typeof getEventCollections>> | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [config, setConfig] = useState<EventFeeConfig | null>(null);
  const [previewRows, setPreviewRows] = useState<EventFeePreviewRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, EventFeeOverride>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expense, setExpense] = useState({ title: "", amount: "", branchScope: "Both" });
  const [deposit, setDeposit] = useState({ amount: "", branchScope: "Both", reference: "" });

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!user || checking) return;
    setLoading(true);
    setError("");
    try {
      const result = await getEventCollections(branch, feeYear, forceRefresh);
      setData(result);
      const first = result.events[0];
      if (!selectedEventId && first) {
        setSelectedEventId(first.event.id);
        setConfig(defaultConfig(first));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event collections");
    } finally {
      setLoading(false);
    }
  }, [branch, checking, feeYear, selectedEventId, user]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadData]);

  useEffect(() => {
    if (!data?.events.length) return;
    if (!data.events.some((item) => item.event.id === selectedEventId)) {
      selectEvent(data.events[0]);
    }
  }, [data, selectedEventId]);

  const selectedEvent = useMemo(
    () => data?.events.find((item) => item.event.id === selectedEventId) || null,
    [data, selectedEventId],
  );

  const filteredEvents = useMemo(() => {
    const events = data?.events || [];
    if (typeFilter === "all") return events;
    return events.filter((item) => (item.config?.feeCategory || defaultConfig(item).feeCategory) === typeFilter);
  }, [data, typeFilter]);

  const previewSummary = useMemo(() => ({
    ready: previewRows.filter((row) => row.status === "ready").length,
    waived: previewRows.filter((row) => row.status === "waived").length,
    review: previewRows.filter((row) => row.status === "needs_review").length,
    total: previewRows.filter((row) => row.status === "ready").reduce((sum, row) => sum + row.finalAmount, 0),
  }), [previewRows]);

  function selectEvent(item: EventCollectionItem) {
    setSelectedEventId(item.event.id);
    const next = defaultConfig(item);
    setConfig(next);
    setOverrides(Object.fromEntries(next.studentOverrides.map((override) => [override.skfId, override])));
    setPreviewRows([]);
    setNotice("");
  }

  function updateBranchPrice(branchName: string, amount: string) {
    setConfig((current) => current ? {
      ...current,
      branchPrices: { ...current.branchPrices, [branchName]: Number(amount || 0) },
    } : current);
  }

  function updateBeltPrice(beltKey: string, amount: string) {
    setConfig((current) => current ? {
      ...current,
      beltPrices: { ...current.beltPrices, [beltKey]: Number(amount || 0) },
    } : current);
  }

  function updateOverride(skfId: string, patch: Partial<EventFeeOverride>) {
    setOverrides((current) => {
    const next = {
      ...current,
      [skfId]: {
        ...(current[skfId] || {}),
        ...patch,
        skfId,
      },
    };
      return next;
    });
  }

  async function handleSaveAndPreview() {
    if (!config) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const overrideList = Object.values(overrides);
      const saved = await upsertEventFeeConfig({ ...config, studentOverrides: overrideList });
      setConfig(saved);
      const preview = await previewEventFees(saved.eventId, { ...saved, studentOverrides: overrideList });
      setPreviewRows(preview.rows);
      setNotice("Preview ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview event fees");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!config) return;
    const payable = previewRows.filter((row) => row.status === "ready" || row.status === "waived");
    const ok = window.confirm(`Generate pending fees for ${payable.length} students totaling ${currency(previewSummary.total)}?`);
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      const result = await generateEventFees(config.eventId, Object.values(overrides));
      setNotice(`Generated ${result.createdOrUpdated} dues, waived ${result.waived}, skipped ${result.skipped}.`);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate event fees");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExpense() {
    if (!selectedEvent || !expense.title.trim() || !expense.amount) return;
    setSaving(true);
    try {
      await addEventExpense({
        eventId: selectedEvent.event.id,
        title: expense.title.trim(),
        amount: Number(expense.amount),
        branchScope: expense.branchScope,
      });
      setExpense({ title: "", amount: "", branchScope: "Both" });
      setNotice("Expense recorded.");
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDeposit() {
    if (!selectedEvent || !deposit.amount) return;
    setSaving(true);
    try {
      await addEventDeposit({
        eventId: selectedEvent.event.id,
        amount: Number(deposit.amount),
        branchScope: deposit.branchScope,
        reference: deposit.reference,
      });
      setDeposit({ amount: "", branchScope: "Both", reference: "" });
      setNotice("Deposit recorded.");
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record deposit");
    } finally {
      setSaving(false);
    }
  }

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Event Collections" rightContent={<NavMenu />} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex flex-col gap-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-2">Paid Events</p>
              <h1 className="font-[family-name:var(--font-space)] text-3xl sm:text-4xl text-white">Event Collections</h1>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="card-panel p-4">
              <Wallet className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Collected</p>
              <p className="font-[family-name:var(--font-space)] text-xl text-emerald-400">{currency(data?.totals.collected || 0)}</p>
            </div>
            <div className="card-panel p-4">
              <Clock className="w-4 h-4 text-amber-400 mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pending</p>
              <p className="font-[family-name:var(--font-space)] text-xl text-amber-400">{currency(data?.totals.pending || 0)}</p>
            </div>
            <div className="card-panel p-4">
              <CircleDollarSign className="w-4 h-4 text-red-400 mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Spent</p>
              <p className="font-[family-name:var(--font-space)] text-xl text-red-400">{currency(data?.totals.spent || 0)}</p>
            </div>
            <div className="card-panel p-4">
              <CheckCircle2 className="w-4 h-4 text-blue-400 mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Surplus</p>
              <p className="font-[family-name:var(--font-space)] text-xl text-blue-400">{currency(data?.totals.surplus || 0)}</p>
            </div>
            <div className="card-panel p-4">
              <Banknote className="w-4 h-4 text-zinc-300 mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pending Deposit</p>
              <p className="font-[family-name:var(--font-space)] text-xl text-white">{currency(data?.totals.pendingDeposit || 0)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800 flex-1">
            {BRANCHES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBranch(option.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wider ${branch === option.value ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800 flex-1">
            {EVENT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold ${typeFilter === option.value ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
            <section className="card-panel p-3 h-fit">
              <div className="space-y-2">
                {filteredEvents.map((item) => (
                  <button
                    key={item.event.id}
                    type="button"
                    onClick={() => selectEvent(item)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedEventId === item.event.id ? "bg-white/[0.06] border-white/20" : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{item.event.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{item.config?.feeCategory || defaultConfig(item).feeCategory} • {item.event.hostingBranch || "All"}</p>
                      </div>
                      <Trophy className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <span className="text-emerald-400">{currency(item.collection.collected)}</span>
                      <span className="text-amber-400">{currency(item.collection.pending)}</span>
                      <span className="text-blue-400">{currency(item.finance.surplus)}</span>
                    </div>
                  </button>
                ))}
                {filteredEvents.length === 0 && (
                  <p className="text-center text-sm text-zinc-500 py-8">No events found.</p>
                )}
              </div>
            </section>

            {selectedEvent && config && (
              <div className="space-y-5">
                <section className="card-panel p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                        <CalendarDays className="w-3 h-3" />
                        {selectedEvent.event.date || "No date"} • {selectedEvent.event.hostingBranch || "All branches"}
                      </div>
                      <h2 className="text-xl text-white font-medium">{selectedEvent.event.name}</h2>
                    </div>
                    <Link href="/finances" className="text-xs text-zinc-400 hover:text-white border border-zinc-800 px-3 py-2 rounded-lg">
                      Finance
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[10px] uppercase text-zinc-500">Charged</p>
                      <p className="text-white text-xl font-[family-name:var(--font-space)]">{selectedEvent.collection.chargedCount}</p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[10px] uppercase text-zinc-500">Paid</p>
                      <p className="text-emerald-400 text-xl font-[family-name:var(--font-space)]">{selectedEvent.collection.paidCount}</p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[10px] uppercase text-zinc-500">Expense</p>
                      <p className="text-red-400 text-xl font-[family-name:var(--font-space)]">{currency(selectedEvent.finance.spent)}</p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[10px] uppercase text-zinc-500">Deposited</p>
                      <p className="text-blue-400 text-xl font-[family-name:var(--font-space)]">{currency(selectedEvent.finance.deposited)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Category</span>
                      <select value={config.feeCategory} onChange={(e) => setConfig({ ...config, feeCategory: e.target.value as EventFeeConfig["feeCategory"] })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="belt_exam">Belt examination</option>
                        <option value="tournament">Tournament</option>
                        <option value="event">Seminar / Camp / Event</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Pricing</span>
                      <select value={config.pricingMode} onChange={(e) => setConfig({ ...config, pricingMode: e.target.value as EventFeeConfig["pricingMode"] })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="fixed">Fixed</option>
                        <option value="branch">Branch wise</option>
                        <option value="belt">Belt wise</option>
                        <option value="branch_belt">Branch + belt</option>
                        <option value="student">Student specific</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Due date</span>
                      <input type="date" value={config.dueDate || ""} onChange={(e) => setConfig({ ...config, dueDate: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Default fee</span>
                      <input type="number" value={config.defaultAmount || ""} onChange={(e) => setConfig({ ...config, defaultAmount: Number(e.target.value || 0) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">MPSC price</span>
                      <input type="number" value={config.branchPrices["M P Sports Club"] || ""} onChange={(e) => updateBranchPrice("M P Sports Club", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Herohalli price</span>
                      <input type="number" value={config.branchPrices.Herohalli || ""} onChange={(e) => updateBranchPrice("Herohalli", e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                    </label>
                  </div>

                  {config.feeCategory === "belt_exam" && data && (
                    <div className="mt-5">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Target belt prices</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {data.beltSequence.map((belt) => (
                          <label key={belt.key} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                            <span className="block text-[10px] text-zinc-500 truncate">{belt.label}</span>
                            <input type="number" value={config.beltPrices[belt.key] || ""} onChange={(e) => updateBeltPrice(belt.key, e.target.value)} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white" />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button type="button" onClick={handleSaveAndPreview} disabled={saving} className="btn-primary flex-1 py-3 rounded-lg flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Save & Preview
                    </button>
                    <button type="button" onClick={handleGenerate} disabled={saving || previewRows.length === 0} className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" />
                      Generate Pending Fees
                    </button>
                  </div>
                </section>

                {previewRows.length > 0 && (
                  <section className="card-panel p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium">Preview</h3>
                      <div className="text-xs text-zinc-500">
                        {previewSummary.ready} ready • {previewSummary.waived} waived • {previewSummary.review} review • {currency(previewSummary.total)}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                      {previewRows.map((row) => (
                        <div key={row.skfId} className="grid grid-cols-1 md:grid-cols-[1fr_120px_150px] gap-3 items-center bg-zinc-950/70 border border-zinc-800 rounded-xl p-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm text-white font-medium">{row.studentName}</p>
                              <span className="text-[10px] font-mono text-zinc-500">{row.skfId}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${rowTone(row.status)}`}>{row.status.replace("_", " ")}</span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">{row.branch} {row.targetBelt ? `• ${row.currentBelt} to ${row.targetBelt}` : ""}</p>
                            {row.reason && <p className="text-xs text-amber-400 mt-1">{row.reason}</p>}
                          </div>
                          <input
                            type="number"
                            value={overrides[row.skfId]?.amount ?? row.finalAmount}
                            onChange={(e) => updateOverride(row.skfId, { amount: Number(e.target.value || 0), reason: "Student-specific amount" })}
                            className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => updateOverride(row.skfId, { excluded: !overrides[row.skfId]?.excluded, waived: false, reason: "Excluded from event fee" })} className={`flex-1 text-xs rounded-lg border px-2 py-2 ${overrides[row.skfId]?.excluded ? "border-zinc-500 text-white bg-zinc-700" : "border-zinc-800 text-zinc-400"}`}>Exclude</button>
                            <button type="button" onClick={() => updateOverride(row.skfId, { waived: !overrides[row.skfId]?.waived, excluded: false, amount: 0, reason: "Waived from event fee" })} className={`flex-1 text-xs rounded-lg border px-2 py-2 ${overrides[row.skfId]?.waived ? "border-blue-500/50 text-blue-300 bg-blue-500/10" : "border-zinc-800 text-zinc-400"}`}>Waive</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="card-panel p-5">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2"><CircleDollarSign className="w-4 h-4 text-red-400" /> Expense</h3>
                    <div className="space-y-3">
                      <input value={expense.title} onChange={(e) => setExpense({ ...expense, title: e.target.value })} placeholder="Title" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                      <input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} placeholder="Amount" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                      <select value={expense.branchScope} onChange={(e) => setExpense({ ...expense, branchScope: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="Both">Both</option>
                        <option value="M P Sports Club">MPSC</option>
                        <option value="Herohalli">Herohalli</option>
                      </select>
                      <button type="button" onClick={handleAddExpense} disabled={saving} className="w-full rounded-lg bg-red-600/90 hover:bg-red-500 text-white py-2 text-sm flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Add Expense
                      </button>
                    </div>
                  </div>

                  <div className="card-panel p-5">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Banknote className="w-4 h-4 text-blue-400" /> Bank Deposit</h3>
                    <div className="space-y-3">
                      <input type="number" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} placeholder="Amount" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                      <input value={deposit.reference} onChange={(e) => setDeposit({ ...deposit, reference: e.target.value })} placeholder="Reference" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                      <select value={deposit.branchScope} onChange={(e) => setDeposit({ ...deposit, branchScope: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="Both">Both</option>
                        <option value="M P Sports Club">MPSC</option>
                        <option value="Herohalli">Herohalli</option>
                      </select>
                      <button type="button" onClick={handleAddDeposit} disabled={saving} className="w-full rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white py-2 text-sm flex items-center justify-center gap-2">
                        <IndianRupee className="w-4 h-4" /> Add Deposit
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
