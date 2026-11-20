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
} from "lucide-react";

import AccountMenu from "@/components/common/AccountMenu";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill from "@/components/ui/StatusPill";
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
        title: "Settings",
        backHref: "/dashboard",
        actions: <AccountMenu />,
      }}
    >
      <div>
        <header className="mb-[32px] flex flex-col gap-[20px] md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-[12px] flex items-center gap-[12px]">
              <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--color-accent)]" />
              <p className="eyebrow text-[color:var(--color-text-dim)]">Portal Operations</p>
            </div>
            <h1 className="mt-[4px] text-[15px] font-semibold text-[color:var(--color-text)]">Branch Timetable</h1>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[16px] text-sm"
          >
            <Upload className="h-[16px] w-[16px]" />
            Replace Timetable
          </button>
        </header>

        {error ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {saved ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <CheckCircle2 className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{selectedBranch.label} timetable replaced for {saved.monthLabel || monthLabel || "current month"}.</p>
          </div>
        ) : null}

        <div className="grid min-w-[0px] gap-[20px] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <aside className="hud-panel h-fit min-w-[0px] overflow-hidden">
            <div className="divide-y divide-[color:var(--color-hairline)]">
              {BRANCHES.map((item, index) => {
                const branchTimetable = timetables.find((entry) => entry.branchSlug === item.slug && entry.isActive)
                  || timetables.find((entry) => entry.branchSlug === item.slug);
                return (
                  <LedgerRow
                    key={item.value}
                    index={index}
                    status="neutral"
                    title={item.label}
                    subtitle={item.detail}
                    idLabel={branchTimetable?.monthLabel || "NO ACTIVE IMAGE"}
                    trailing={<StatusPill status="neutral" label={branchTimetable ? "Live" : "Empty"} ariaLabel={`${item.label} timetable status`} />}
                    className={branch === item.value ? "bg-[color:var(--color-well)]" : undefined}
                    onClick={() => {
                      setBranch(item.value);
                      setSaved(null);
                    }}
                  />
                );
              })}
            </div>
          </aside>

          <section className="min-w-[0px] space-y-[20px]">
            <div className="hud-panel p-[16px] sm:p-[20px]">
              <div className="flex flex-col gap-[20px] lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-[12px]">
                  <div className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
                    <CalendarDays className="h-[20px] w-[20px]" />
                  </div>
                  <div className="min-w-[0px]">
                    <p className="text-xs uppercase tracking-widest text-[color:var(--color-text-dim)]">Monthly Replacement</p>
                    <h2 className="truncate text-lg font-semibold text-[color:var(--color-text)]">{selectedBranch.detail}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-[8px] sm:flex">
                  <button
                    type="button"
                    onClick={() => loadTimetables(true)}
                    disabled={refreshingTimetables}
                    className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)] disabled:opacity-60"
                  >
                    <RefreshCw className={`h-[16px] w-[16px] ${refreshingTimetables ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[16px] text-sm"
                  >
                    <Upload className="h-[16px] w-[16px]" />
                    Upload
                  </button>
                </div>
              </div>

              <div className="mt-[20px] grid grid-cols-2 gap-[12px] sm:grid-cols-3">
                <StatTile label="Branch" value={selectedBranch.label} />
                <StatTile label="Active Month" value={currentTimetable?.monthLabel || monthLabel || "—"} />
                <StatTile
                  label="Status"
                  value={loadingTimetables ? "Loading" : currentTimetable ? "LIVE" : "NONE"}
                  tone="neutral"
                />
              </div>
            </div>

            <div className="hud-panel overflow-hidden">
              <div className="flex flex-col gap-[12px] border-b border-[color:var(--color-hairline)] p-[16px] sm:flex-row sm:items-center sm:justify-between sm:p-[20px]">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[color:var(--color-text-dim)]">Current Timetable Image</p>
                  <h3 className="mt-[4px] text-lg font-semibold text-[color:var(--color-text)]">
                    {currentTimetable?.title || `${selectedBranch.detail} Timetable`}
                  </h3>
                </div>
                {currentImageUrl ? (
                  <a
                    href={currentImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-sm font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)]"
                  >
                    <ExternalLink className="h-[16px] w-[16px]" />
                    Open
                  </a>
                ) : null}
              </div>

              <div className="bg-[color:var(--color-well)] p-[12px] sm:p-[16px]">
                {loadingTimetables ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                    <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
                  </div>
                ) : currentImageUrl ? (
                  <div className="mx-auto flex max-w-3xl justify-center overflow-hidden rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImageUrl}
                      alt={`${selectedBranch.detail} current timetable`}
                      className="max-h-[78vh] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center gap-[12px] rounded-lg border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[32px] text-center">
                    <ImagePlus className="h-[44px] w-[44px] text-[color:var(--color-text-faint)]" />
                    <p className="text-sm text-[color:var(--color-text-dim)]">No active timetable image found for {selectedBranch.label}.</p>
                    <button
                      type="button"
                      onClick={() => setEditorOpen(true)}
                      className="btn-primary mt-[8px] inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[16px] text-sm"
                    >
                      <Upload className="h-[16px] w-[16px]" />
                      Upload Timetable
                    </button>
                  </div>
                )}
              </div>

              {currentTimetable?.notes ? (
                <div className="border-t border-[color:var(--color-hairline)] px-[16px] py-[12px] text-sm text-[color:var(--color-text-dim)] sm:px-[20px]">
                  {currentTimetable.notes}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <Sheet
          open={editorOpen}
          title={`Replace ${selectedBranch.label} timetable`}
          onClose={closeEditor}
          footer={
            <div className="grid grid-cols-2 gap-[8px]">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="tap-target inline-flex items-center justify-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-sm text-[color:var(--color-text)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="timetable-form"
                disabled={saving || !file}
                className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <Upload className="h-[16px] w-[16px]" />}
                Replace
              </button>
            </div>
          }
        >
          <form id="timetable-form" onSubmit={handleSubmit} className="grid gap-[16px] pt-[4px]">
            <div className="grid gap-[16px] lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-[16px]">
                <label className="block">
                  <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">New timetable image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleFile(event.currentTarget.files?.[0] || null)}
                    className="w-full rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[12px] text-sm text-[color:var(--color-text)] file:mr-[12px] file:rounded-md file:border-0 file:bg-[color:var(--color-well)] file:px-[12px] file:py-[6px] file:text-xs file:font-semibold file:text-[color:var(--color-text)]"
                    required
                  />
                </label>

                <div className="grid gap-[16px] sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Month</span>
                    <input
                      value={monthLabel}
                      onChange={(event) => setMonthLabel(event.target.value)}
                      className="input-minimal"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-[8px] block eyebrow text-[color:var(--color-text-dim)]">Notes</span>
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input-minimal"
                      placeholder="Optional"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-[color:var(--color-well)]">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={`${selectedBranch.label} timetable preview`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-[12px] text-[color:var(--color-text-faint)]">
                      <ImagePlus className="h-[32px] w-[32px]" />
                      <span className="text-xs uppercase tracking-wider">No image selected</span>
                    </div>
                  )}
                </div>
                {file ? (
                  <p className="mt-[12px] truncate text-xs text-[color:var(--color-text-dim)]">{file.name}</p>
                ) : null}
              </div>
            </div>
          </form>
        </Sheet>
      </div>
    </PageShell>
  );
}
