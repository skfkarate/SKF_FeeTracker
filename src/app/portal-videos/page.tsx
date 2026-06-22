"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  deletePortalVideo,
  getPortalVideos,
  upsertPortalVideo,
  type PortalVideo,
  type PortalVideoInput,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { ConfirmModal } from "@/components/common/ConfirmModal";

const VIDEO_CATEGORIES = [
  { value: "techniques", label: "Techniques" },
  { value: "kata", label: "Kata" },
  { value: "kumite", label: "Kumite" },
  { value: "bunkai", label: "Bunkai" },
  { value: "fitness", label: "Conditioning" },
  { value: "seminar", label: "Seminar" },
];

const BRANCH_OPTIONS = [
  { slug: "m-p-sports-club", label: "MP" },
  { slug: "herohalli", label: "Herohalli" },
];

const BELT_OPTIONS = ["white", "yellow", "orange", "green", "blue", "brown", "black"];
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

type VideoDraft = {
  id: string;
  title: string;
  description: string;
  category: string;
  durationLabel: string;
  youtubeInput: string;
  youtubeId: string;
  branchSlugs: string[];
  batchNamesText: string;
  beltLevels: string[];
  isFeatured: boolean;
  isPublished: boolean;
  showInTechniques: boolean;
  sortOrder: number;
};

function extractYouTubeId(value: string) {
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

function emptyDraft(): VideoDraft {
  return {
    id: "",
    title: "",
    description: "",
    category: "techniques",
    durationLabel: "",
    youtubeInput: "",
    youtubeId: "",
    branchSlugs: [],
    batchNamesText: "",
    beltLevels: [],
    isFeatured: false,
    isPublished: true,
    showInTechniques: false,
    sortOrder: 0,
  };
}

function draftFromVideo(video: PortalVideo): VideoDraft {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    category: video.category,
    durationLabel: video.durationLabel,
    youtubeInput: video.youtubeId,
    youtubeId: video.youtubeId,
    branchSlugs: video.branchSlugs || [],
    batchNamesText: (video.batchNames || []).join(", "),
    beltLevels: video.beltLevels || [],
    isFeatured: video.isFeatured,
    isPublished: video.isPublished,
    showInTechniques: video.showInTechniques,
    sortOrder: video.sortOrder || 0,
  };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function thumbnailUrl(youtubeId: string) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

function Chip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${
        selected
          ? "border-white bg-white text-black"
          : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function PortalVideosPage() {
  const { user, checking } = useFeeTrackAuth();
  const [videos, setVideos] = useState<PortalVideo[]>([]);
  const [draft, setDraft] = useState<VideoDraft>(() => emptyDraft());
  const [editorOpen, setEditorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmState, setConfirmState] = useState<{ video: PortalVideo } | null>(null);

  const loadVideos = useCallback(async (forceRefresh = false) => {
    setError("");
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const rows = await getPortalVideos(forceRefresh);
      setVideos(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load portal videos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      void loadVideos();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checking, loadVideos, user]);

  const filteredVideos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return videos;
    return videos.filter((video) =>
      [
        video.title,
        video.category,
        video.youtubeId,
        ...(video.branchSlugs || []),
        ...(video.batchNames || []),
        ...(video.beltLevels || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, videos]);

  function startNewVideo() {
    setDraft(emptyDraft());
    setEditorOpen(true);
    setNotice("");
    setError("");
  }

  function openVideo(video: PortalVideo) {
    setDraft(draftFromVideo(video));
    setEditorOpen(true);
    setNotice("");
    setError("");
  }

  function updateDraft(input: Partial<VideoDraft>) {
    setDraft((current) => ({ ...current, ...input }));
    setNotice("");
    setError("");
  }

  function updateYouTubeInput(value: string) {
    updateDraft({
      youtubeInput: value,
      youtubeId: extractYouTubeId(value),
    });
  }

  function toggleList(key: "branchSlugs" | "beltLevels", value: string) {
    setDraft((current) => {
      const existing = current[key];
      return {
        ...current,
        [key]: existing.includes(value)
          ? existing.filter((item) => item !== value)
          : [...existing, value],
      };
    });
  }

  async function handleSubmit() {
    if (!draft.title.trim()) {
      setError("Video title is required.");
      return;
    }
    if (!draft.youtubeId) {
      setError("Paste a valid YouTube URL or 11-character video ID.");
      return;
    }

    const input: PortalVideoInput = {
      id: draft.id || undefined,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      durationLabel: draft.durationLabel.trim(),
      youtubeInput: draft.youtubeInput || draft.youtubeId,
      youtubeId: draft.youtubeId,
      branchSlugs: draft.showInTechniques ? [] : draft.branchSlugs,
      batchNames: draft.showInTechniques ? [] : splitCsv(draft.batchNamesText),
      beltLevels: draft.beltLevels,
      isFeatured: draft.isFeatured,
      isPublished: draft.isPublished,
      showInTechniques: draft.showInTechniques,
      sortOrder: Number(draft.sortOrder || 0),
    };

    setSaving(true);
    setError("");
    setNotice("");
    const wasEditing = Boolean(draft.id);
    try {
      const saved = await upsertPortalVideo(input);
      setVideos((current) => {
        const exists = current.some((video) => video.id === saved.id);
        return exists
          ? current.map((video) => (video.id === saved.id ? saved : video))
          : [saved, ...current];
      });
      setDraft(draftFromVideo(saved));
      setEditorOpen(false);
      setNotice(wasEditing ? "Portal video updated." : "Portal video created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save portal video.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(video: PortalVideo) {
    setConfirmState({ video });
  }

  async function handleConfirmDelete() {
    const state = confirmState;
    if (!state) return;
    const { video } = state;
    setConfirmState(null);
    setDeletingId(video.id);
    setError("");
    setNotice("");
    try {
      await deletePortalVideo(video.id);
      setVideos((current) => current.filter((item) => item.id !== video.id));
      if (draft.id === video.id) {
        setDraft(emptyDraft());
        setEditorOpen(false);
      }
      setNotice("Portal video removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete portal video.");
    } finally {
      setDeletingId("");
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
      <Navbar showBack title="Portal Videos" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Portal Operations</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Home Practice Videos
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={startNewVideo}
              className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Create Video
            </button>
            <button
              type="button"
              onClick={() => loadVideos(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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

        {notice ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        <section className="card-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Library</p>
                <h2 className="text-lg font-semibold text-white">{videos.length} Videos</h2>
              </div>
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="input-minimal min-h-11 pl-11"
                  placeholder="Search"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/60" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-center">
                <PlayCircle className="mb-3 h-8 w-8 text-zinc-600" />
                <p className="text-sm text-zinc-500">No portal videos found.</p>
                <button
                  type="button"
                  onClick={startNewVideo}
                  className="btn-primary mt-4 inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Video
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredVideos.map((video) => (
                  <article
                    key={video.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-700"
                  >
                    <div className="grid gap-3 sm:grid-cols-[132px_1fr_auto] sm:items-start">
                      <button
                        type="button"
                        onClick={() => openVideo(video)}
                        className="relative aspect-video overflow-hidden rounded-md bg-black text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbnailUrl(video.youtubeId)} alt="" className="h-full w-full object-cover" />
                        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wider text-white">
                          {video.isPublished ? "Live" : "Draft"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openVideo(video)}
                        className="min-w-0 text-left"
                      >
                        <h3 className="truncate text-sm font-semibold text-white">{video.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {video.description || "No description"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-md border border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                            {video.category}
                          </span>
                          {video.isFeatured ? (
                            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300">
                              Featured
                            </span>
                          ) : null}
                          {video.showInTechniques ? (
                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300">
                              Techniques
                            </span>
                          ) : null}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(video)}
                        disabled={deletingId === video.id}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        title="Delete video"
                      >
                        {deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>

        {editorOpen ? (
          <div
            className="glass-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget && !saving) setEditorOpen(false);
            }}
          >
          <aside className="glass-modal !max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">{draft.id ? "Edit" : "New"}</p>
                <h2 className="text-lg font-semibold text-white">{draft.id ? "Update Video" : "Create Video"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title="Close editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                className="input-minimal"
                placeholder="Video title"
              />
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })}
                className="input-minimal min-h-24 resize-none"
                placeholder="Description"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={draft.category}
                  onChange={(event) => updateDraft({ category: event.target.value })}
                  className="input-minimal"
                >
                  {VIDEO_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <input
                  value={draft.durationLabel}
                  onChange={(event) => updateDraft({ durationLabel: event.target.value })}
                  className="input-minimal"
                  placeholder="Duration"
                />
              </div>
              <input
                value={draft.youtubeInput}
                onChange={(event) => updateYouTubeInput(event.target.value)}
                className="input-minimal"
                placeholder="YouTube URL or ID"
              />

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="aspect-video overflow-hidden rounded-md bg-black">
                  {draft.youtubeId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl(draft.youtubeId)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-zinc-600">
                      YouTube Preview
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate font-mono text-xs text-zinc-500">
                  {draft.youtubeId || "No video ID"}
                </p>
              </div>

              <input
                value={draft.batchNamesText}
                onChange={(event) => updateDraft({ batchNamesText: event.target.value })}
                className="input-minimal"
                placeholder="Batches"
                disabled={draft.showInTechniques}
              />

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Branches</p>
                <div className="flex flex-wrap gap-2">
                  {BRANCH_OPTIONS.map((branch) => (
                    <Chip
                      key={branch.slug}
                      selected={draft.branchSlugs.includes(branch.slug)}
                      onClick={() => toggleList("branchSlugs", branch.slug)}
                    >
                      {branch.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Belts</p>
                <div className="flex flex-wrap gap-2">
                  {BELT_OPTIONS.map((belt) => (
                    <Chip
                      key={belt}
                      selected={draft.beltLevels.includes(belt)}
                      onClick={() => toggleList("beltLevels", belt)}
                    >
                      {belt}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
                  <span>Published</span>
                  <input
                    type="checkbox"
                    checked={draft.isPublished}
                    onChange={(event) => updateDraft({ isPublished: event.target.checked })}
                    className="h-4 w-4 accent-white"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
                  <span>Featured</span>
                  <input
                    type="checkbox"
                    checked={draft.isFeatured}
                    onChange={(event) => updateDraft({ isFeatured: event.target.checked })}
                    className="h-4 w-4 accent-white"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
                  <span>Technique Library</span>
                  <input
                    type="checkbox"
                    checked={draft.showInTechniques}
                    onChange={(event) => updateDraft({ showInTechniques: event.target.checked })}
                    className="h-4 w-4 accent-white"
                  />
                </label>
              </div>

              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) => updateDraft({ sortOrder: Number(event.target.value || 0) })}
                className="input-minimal"
                placeholder="Sort order"
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary flex min-h-11 w-full items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {draft.id ? "Save Video" : "Create Video"}
              </button>
            </div>
          </aside>
          </div>
        ) : null}

        <ConfirmModal
          open={confirmState !== null}
          title="Delete Video"
          message={`Delete "${confirmState?.video.title}"?`}
          variant="danger"
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmState(null)}
          loading={deletingId === confirmState?.video.id}
        />
      </main>
    </div>
  );
}
