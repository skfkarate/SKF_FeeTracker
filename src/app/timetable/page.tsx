"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { getBranchTimetables, uploadBranchTimetable, type BranchTimetable } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { normalizeKarateMediaUrl } from "@/lib/media-url";

const BRANCHES = [
  { value: "MPSC", slug: "mp-sports-club", label: "MP", detail: "M P Sports Club" },
  { value: "Herohalli", slug: "herohalli", label: "Herohalli", detail: "Herohalli Branch" },
];

const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_TIMETABLE_BYTES = 8 * 1024 * 1024;

function currentMonthLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function TimetablePage() {
  const { user, checking } = useFeeTrackAuth();
  const [branch, setBranch] = useState("MPSC");
  const [monthLabel, setMonthLabel] = useState(() => currentMonthLabel());
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [timetables, setTimetables] = useState<BranchTimetable[]>([]);
  const [loadingTimetables, setLoadingTimetables] = useState(true);
  const [refreshingTimetables, setRefreshingTimetables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<BranchTimetable | null>(null);

  const selectedBranch = useMemo(
    () => BRANCHES.find((item) => item.value === branch) || BRANCHES[0],
    [branch],
  );

  const currentTimetable = useMemo(() => {
    if (saved?.branchSlug === selectedBranch.slug) return saved;
    return timetables.find((item) => item.branchSlug === selectedBranch.slug && item.isActive)
      || timetables.find((item) => item.branchSlug === selectedBranch.slug)
      || null;
  }, [saved, selectedBranch.slug, timetables]);

  const currentImageUrl = normalizeKarateMediaUrl(currentTimetable?.imageUrl || currentTimetable?.driveUrl || "");

  const loadTimetables = useCallback(async (forceRefresh = false) => {
    setError("");
    if (forceRefresh) setRefreshingTimetables(true);
    else setLoadingTimetables(true);

    try {
      const rows = await getBranchTimetables(forceRefresh);
      setTimetables(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the current timetables.");
    } finally {
      setLoadingTimetables(false);
      setRefreshingTimetables(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    const timeoutId = window.setTimeout(() => {
      void loadTimetables();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [checking, loadTimetables, user]);

  function handleFile(nextFile?: File | null) {
    setError("");
    setSaved(null);
    if (preview) URL.revokeObjectURL(preview);

    if (!nextFile) {
      setFile(null);
      setPreview("");
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(nextFile.type)) {
      setFile(null);
      setPreview("");
      setError("Upload a PNG, JPG, or WebP timetable image.");
      return;
    }

    if (nextFile.size > MAX_TIMETABLE_BYTES) {
      setFile(null);
      setPreview("");
      setError("Timetable image must be 8 MB or smaller.");
      return;
    }

    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose the timetable image first.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(null);
    try {
      const timetable = await uploadBranchTimetable({
        branch,
        image: file,
        monthLabel,
        notes,
      });
      setSaved(timetable);
      setTimetables((current) => [
        timetable,
        ...current.filter((item) => item.id !== timetable.id && item.branchSlug !== timetable.branchSlug),
      ]);
      setFile(null);
      setPreview("");
      setEditorOpen(false);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Timetable upload failed.");
    } finally {
      setSaving(false);
    }
  }

  function closeEditor() {
    if (saving) return;
    handleFile(null);
    setEditorOpen(false);
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
      <Navbar showBack title="Portal Timetable" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Portal Operations</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Branch Timetable
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
          >
            <Upload className="h-4 w-4" />
            Replace Timetable
          </button>
        </header>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {saved ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{selectedBranch.label} timetable replaced for {saved.monthLabel || monthLabel || "current month"}.</p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="card-panel h-fit p-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {BRANCHES.map((item) => {
                const branchTimetable = timetables.find((entry) => entry.branchSlug === item.slug && entry.isActive)
                  || timetables.find((entry) => entry.branchSlug === item.slug);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setBranch(item.value);
                      setSaved(null);
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors sm:p-4 ${
                      branch === item.value
                        ? "border-white/20 bg-white text-black"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.label}</p>
                        <p className={`mt-1 truncate text-xs ${branch === item.value ? "text-black/55" : "text-zinc-600"}`}>
                          {item.detail}
                        </p>
                      </div>
                      <span className={`mt-0.5 h-2 w-2 rounded-full ${branchTimetable ? "bg-emerald-400" : "bg-zinc-700"}`} />
                    </div>
                    <p className={`mt-3 truncate text-[10px] uppercase tracking-wider ${branch === item.value ? "text-black/45" : "text-zinc-600"}`}>
                      {branchTimetable?.monthLabel || "No active image"}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="card-panel p-4 sm:p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Monthly Replacement</p>
                    <h2 className="truncate text-lg font-semibold text-white">{selectedBranch.detail}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => loadTimetables(true)}
                    disabled={refreshingTimetables}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingTimetables ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Branch</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedBranch.label}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Active Month</p>
                  <p className="mt-2 truncate text-sm font-semibold text-white">
                    {currentTimetable?.monthLabel || monthLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Status</p>
                  <p className={`mt-2 text-sm font-semibold ${currentTimetable ? "text-emerald-300" : "text-zinc-400"}`}>
                    {loadingTimetables ? "Loading" : currentTimetable ? "Live in portal" : "Not configured"}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Current Timetable Image</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {currentTimetable?.title || `${selectedBranch.detail} Timetable`}
                  </h3>
                </div>
                {currentImageUrl ? (
                  <a
                    href={currentImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                ) : null}
              </div>

              <div className="bg-black p-3 sm:p-4">
                {loadingTimetables ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                  </div>
                ) : currentImageUrl ? (
                  <div className="mx-auto flex max-w-3xl justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImageUrl}
                      alt={`${selectedBranch.detail} current timetable`}
                      className="max-h-[78vh] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
                    <ImagePlus className="h-10 w-10 text-zinc-700" />
                    <p className="text-sm text-zinc-500">No active timetable image found for {selectedBranch.label}.</p>
                    <button
                      type="button"
                      onClick={() => setEditorOpen(true)}
                      className="btn-primary mt-2 inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Timetable
                    </button>
                  </div>
                )}
              </div>

              {currentTimetable?.notes ? (
                <div className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500 sm:px-5">
                  {currentTimetable.notes}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {editorOpen ? (
          <div
            className="glass-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeEditor();
            }}
          >
          <form onSubmit={handleSubmit} className="glass-modal !max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Monthly Replacement</p>
                  <h2 className="truncate text-lg font-semibold text-white">{selectedBranch.detail}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close timetable upload"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">New Timetable Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleFile(event.currentTarget.files?.[0] || null)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Month</span>
                    <input
                      value={monthLabel}
                      onChange={(event) => setMonthLabel(event.target.value)}
                      className="input-minimal"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Notes</span>
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input-minimal"
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
                    disabled={saving || !file}
                    className="btn-primary inline-flex min-h-11 items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Replace Timetable
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-black">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-zinc-600">
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-xs uppercase tracking-wider">No image selected</span>
                    </div>
                  )}
                </div>
                {file ? (
                  <p className="mt-3 truncate text-xs text-zinc-500">{file.name}</p>
                ) : null}
              </div>
            </div>
          </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
