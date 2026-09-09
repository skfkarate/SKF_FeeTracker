"use client";

import { AlertCircle, Loader2, MonitorPlay, Save, Smartphone, X } from "lucide-react";
import type { PortalVideo, PortalVideoInput, PracticeFolder } from "@/lib/api";
import { getAncestorChain } from "./tree-utils";
import { BELT_LABELS, BELT_OPTIONS, BRANCH_OPTIONS, VIDEO_CATEGORIES, thumbnailUrl, splitCsv } from "./library-shared";
import { Chip } from "./Chip";

export type VideoDraft = {
  id: string;
  title: string;
  description: string;
  lessonNote: string;
  category: string;
  durationLabel: string;
  youtubeInput: string;
  youtubeId: string;
  contentFormat: "landscape" | "short";
  folderId: string;
  branchSlugs: string[];
  batchNamesText: string;
  beltLevels: string[];
  isFeatured: boolean;
  isPublished: boolean;
  showInTechniques: boolean;
  sortOrder: number;
};

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(value: string) {
  const input = value.trim();
  if (YOUTUBE_ID_PATTERN.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return YOUTUBE_ID_PATTERN.test(id) ? id : "";
    }
    const watchId = url.searchParams.get("v") || "";
    if (YOUTUBE_ID_PATTERN.test(watchId)) return watchId;
    const embedMatch = url.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    return embedMatch?.[1] || "";
  } catch {
    return "";
  }
}

export function isYouTubeShort(value: string) {
  return /youtube\.com\/shorts\//i.test(value);
}

export function emptyVideoDraft(): VideoDraft {
  return {
    id: "",
    title: "",
    description: "",
    lessonNote: "",
    category: "techniques",
    durationLabel: "",
    youtubeInput: "",
    youtubeId: "",
    contentFormat: "landscape",
    folderId: "",
    branchSlugs: [],
    batchNamesText: "",
    beltLevels: [],
    isFeatured: false,
    isPublished: true,
    showInTechniques: false,
    sortOrder: 0,
  };
}

export function draftFromVideo(video: PortalVideo): VideoDraft {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    lessonNote: video.lessonNote || "",
    category: video.category,
    durationLabel: video.durationLabel,
    youtubeInput: video.youtubeId,
    youtubeId: video.youtubeId,
    contentFormat: video.contentFormat || "landscape",
    folderId: video.folderId || "",
    branchSlugs: video.branchSlugs || [],
    batchNamesText: (video.batchNames || []).join(", "),
    beltLevels: video.beltLevels || [],
    isFeatured: video.isFeatured,
    isPublished: video.isPublished,
    showInTechniques: video.showInTechniques,
    sortOrder: video.sortOrder || 0,
  };
}

export function draftToInput(draft: VideoDraft): PortalVideoInput {
  return {
    id: draft.id || undefined,
    title: draft.title.trim(),
    description: draft.description.trim(),
    lessonNote: draft.lessonNote.trim(),
    category: draft.category,
    durationLabel: draft.durationLabel.trim(),
    youtubeInput: draft.youtubeInput || draft.youtubeId,
    youtubeId: draft.youtubeId,
    contentFormat: draft.contentFormat,
    folderId: draft.folderId || undefined,
    branchSlugs: draft.showInTechniques ? [] : draft.branchSlugs,
    batchNames: draft.showInTechniques ? [] : splitCsv(draft.batchNamesText),
    beltLevels: draft.beltLevels,
    isFeatured: draft.isFeatured,
    isPublished: draft.isPublished,
    showInTechniques: draft.showInTechniques,
    sortOrder: Number(draft.sortOrder || 0),
  };
}

export function VideoEditorSheet({
  draft,
  folders,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: VideoDraft;
  folders: PracticeFolder[];
  saving: boolean;
  error: string;
  onChange: (patch: Partial<VideoDraft>) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const draftFolder = folders.find((folder) => folder.id === draft.folderId);
  const effectiveBelts = draft.beltLevels;
  const effectiveBranches = draft.branchSlugs;
  const effectiveBatches = splitCsv(draft.batchNamesText);
  const audiencePreview = effectiveBelts.length
    ? effectiveBelts.map((belt) => BELT_LABELS[belt] || belt).join(" · ")
    : "All belts / shared";

  function updateYouTubeInput(value: string) {
    onChange({
      youtubeInput: value,
      youtubeId: extractYouTubeId(value),
      contentFormat: isYouTubeShort(value) ? "short" : draft.contentFormat,
    });
  }

  function toggleList(key: "branchSlugs" | "beltLevels", value: string) {
    const existing = draft[key];
    onChange({
      [key]: existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value],
    } as Partial<VideoDraft>);
  }

  return (
    <div className="glass-modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <aside className="glass-modal !max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">{draft.id ? "Edit" : "New"}</p>
            <h2 className="text-lg font-semibold text-white">{draft.id ? "Update Video" : "Create Video"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50" title="Close editor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <input value={draft.title} onChange={(event) => onChange({ title: event.target.value })} className="input-minimal" placeholder="Video title" />

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
            <button type="button" onClick={() => onChange({ contentFormat: "short" })} className={`min-h-12 rounded-md border px-3 text-left text-sm font-semibold ${draft.contentFormat === "short" ? "border-white bg-white text-black" : "border-zinc-800 text-zinc-400"}`}><span className="block">Quick Drill</span><span className="text-xs font-normal opacity-70">Portrait 9:16 / Shorts</span></button>
            <button type="button" onClick={() => onChange({ contentFormat: "landscape" })} className={`min-h-12 rounded-md border px-3 text-left text-sm font-semibold ${draft.contentFormat === "landscape" ? "border-white bg-white text-black" : "border-zinc-800 text-zinc-400"}`}><span className="block">Full Lesson</span><span className="text-xs font-normal opacity-70">Landscape 16:9</span></button>
          </div>

          <textarea value={draft.description} onChange={(event) => onChange({ description: event.target.value })} className="input-minimal min-h-24 resize-none" placeholder="Description" />

          <div>
            <textarea value={draft.lessonNote} onChange={(event) => onChange({ lessonNote: event.target.value.slice(0, 3000) })} className="input-minimal min-h-24 resize-y" placeholder="Instructor note shown below the athlete video" maxLength={3000} />
            <p className="mt-1 text-xs text-zinc-500">Practice cues, safety reminders, or a repetition target. Visible only with this lesson.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={draft.category} onChange={(event) => onChange({ category: event.target.value })} className="input-minimal">
              {VIDEO_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
            <input value={draft.durationLabel} onChange={(event) => onChange({ durationLabel: event.target.value })} className="input-minimal" placeholder="Duration" />
          </div>

          <input value={draft.youtubeInput} onChange={(event) => updateYouTubeInput(event.target.value)} className="input-minimal" placeholder="YouTube URL or ID" />

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Practice folder</label>
            <select value={draft.folderId} onChange={(event) => onChange({ folderId: event.target.value })} className="input-minimal">
              <option value="">Unfiled — top level of library</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folderPathLabel(folder, folders)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">Choose a folder to organise this lesson. Folders are just shelves — who sees this video is decided only by the audience below.</p>
          </div>

          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">Athlete portal preview</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">Visible to: {audiencePreview}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">Branches: {effectiveBranches.length ? effectiveBranches.join(", ") : "All"} · Batches: {effectiveBatches.length ? effectiveBatches.join(", ") : "All"}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{draftFolder ? `Filed under “${folderPathLabel(draftFolder, folders)}”. This video's own audience decides who sees it.` : "No folder selected. Unfiled lessons appear at the end of the belt shelf."}</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className={`${draft.contentFormat === "short" ? "mx-auto aspect-[9/16] max-w-48" : "aspect-video"} overflow-hidden rounded-md bg-black`}>
              {draft.youtubeId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl(draft.youtubeId)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center gap-2 text-xs uppercase tracking-wider text-zinc-600">
                  {draft.contentFormat === "short" ? <Smartphone className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
                  YouTube Preview
                </div>
              )}
            </div>
            <p className="mt-2 truncate font-mono text-xs text-zinc-500">{draft.youtubeId || "No video ID"}</p>
          </div>

          <input value={draft.batchNamesText} onChange={(event) => onChange({ batchNamesText: event.target.value })} className="input-minimal" placeholder="Batches" disabled={draft.showInTechniques} />

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Branches</p>
            <div className="flex flex-wrap gap-2">
              {BRANCH_OPTIONS.map((branch) => (
                <Chip key={branch.slug} selected={draft.branchSlugs.includes(branch.slug)} onClick={() => toggleList("branchSlugs", branch.slug)}>
                  {branch.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Belt audience</p>
            <div className="flex flex-wrap gap-2">
              {BELT_OPTIONS.map((belt) => (
                <Chip key={belt} selected={draft.beltLevels.includes(belt)} onClick={() => toggleList("beltLevels", belt)}>
                  {BELT_LABELS[belt]}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">Empty = all belts (shared, leads the shelf). Choose belts to limit who sees this lesson — content climbs White to Black, so keep shared syllabus lessons unrestricted.</p>
          </div>

          <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
              <span>Published</span>
              <input type="checkbox" checked={draft.isPublished} onChange={(event) => onChange({ isPublished: event.target.checked })} className="h-4 w-4 accent-white" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
              <span>Technique Library</span>
              <input type="checkbox" checked={draft.showInTechniques} onChange={(event) => onChange({ showInTechniques: event.target.checked })} className="h-4 w-4 accent-white" />
            </label>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ready-to-publish checklist</p>
            <div className="mt-2 grid gap-1.5 text-xs text-zinc-400">
              <p>{draft.title.trim() ? "✓" : "○"} Lesson title</p>
              <p>{draft.youtubeId ? "✓" : "○"} Valid YouTube link</p>
              <p>{draftFolder ? "✓" : "○"} Practice folder</p>
              <p>{effectiveBelts.length ? "✓" : "○"} Belt audience</p>
              <p>{draft.lessonNote.trim() ? "✓" : "○"} Instructor note (recommended)</p>
              <p>{draft.isPublished ? "✓ Published" : "○ Draft — athletes cannot see it yet"}</p>
            </div>
          </div>

          <input type="number" value={draft.sortOrder} onChange={(event) => onChange({ sortOrder: Number(event.target.value || 0) })} className="input-minimal" placeholder="Sort order" />

          <button type="button" onClick={onSubmit} disabled={saving} className="btn-primary flex min-h-11 w-full items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft.id ? "Save Video" : "Create Video"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function folderPathLabel(folder: PracticeFolder, folders: PracticeFolder[]) {
  const chain = getAncestorChain(folder.parentFolderId || null, folders);
  const label = [...chain.map((item) => item.title), folder.title].join(" / ");
  return label.length > 64 ? `…${label.slice(-63)}` : label;
}
