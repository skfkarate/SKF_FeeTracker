"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CopyPlus,
  FolderPlus,
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
  deletePracticeFolder,
  deletePracticePhoto,
  getPracticeLibraryAdmin,
  upsertPortalVideo,
  upsertPracticeFolder,
  uploadPracticePhoto,
  type PracticeFolder,
  type PracticeFolderInput,
  type PracticePhoto,
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

const BELT_OPTIONS = ["white", "yellow", "orange", "green-ii", "green-i", "blue", "purple", "brown-iii", "brown-ii", "brown-i", "black"];
const BELT_LABELS: Record<string, string> = {
  white: "White Belt · 10th Kyu",
  yellow: "Yellow Belt · 9th Kyu",
  orange: "Orange Belt · 8th Kyu",
  "green-ii": "Green II · 7th Kyu",
  "green-i": "Green I · 6th Kyu",
  blue: "Blue Belt · 5th Kyu",
  purple: "Purple Belt · 4th Kyu",
  "brown-iii": "Brown III · 3rd Kyu",
  "brown-ii": "Brown II · 2nd Kyu",
  "brown-i": "Brown I · 1st Kyu",
  black: "Black Belt · Dan",
};
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

type VideoDraft = {
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

function isYouTubeShort(value: string) {
  return /youtube\.com\/shorts\//i.test(value);
}

function emptyDraft(): VideoDraft {
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

function draftFromVideo(video: PortalVideo): VideoDraft {
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

function emptyFolderDraft(): PracticeFolderInput {
  return { title: "", description: "", branchSlugs: [], batchNames: [], beltLevels: [], isFeatured: false, isPublished: true, sortOrder: 0 };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function folderBeltCategory(folder: PracticeFolder) {
  if (!folder.beltLevels?.length) return "All belts / shared";
  return folder.beltLevels.map((belt) => BELT_LABELS[belt] || belt).join(" · ");
}

function parentFolderLabel(folder: PracticeFolder, folders: PracticeFolder[]) {
  const parent = folders.find((item) => item.id === folder.parentFolderId);
  return parent ? `${parent.title} / ${folder.title}` : folder.title;
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
  const [folders, setFolders] = useState<PracticeFolder[]>([]);
  const [photos, setPhotos] = useState<PracticePhoto[]>([]);
  const [draft, setDraft] = useState<VideoDraft>(() => emptyDraft());
  const [editorOpen, setEditorOpen] = useState(false);
  const [folderEditorOpen, setFolderEditorOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState<PracticeFolderInput>(() => emptyFolderDraft());
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmState, setConfirmState] = useState<{ video: PortalVideo } | null>(null);

  const loadVideos = useCallback(async (forceRefresh = false) => {
    setError("");
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const library = await getPracticeLibraryAdmin(forceRefresh);
      setVideos(library.videos);
      setFolders(library.folders);
      setPhotos(library.photos);
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
    const scoped = selectedFolderId === "all" ? videos : videos.filter((video) => video.folderId === selectedFolderId);
    if (!term) return scoped;
    return scoped.filter((video) =>
      [
        video.title,
        video.lessonNote,
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
  }, [query, selectedFolderId, videos]);

  const beltCategorisedFolders = useMemo(() => [...folders].sort((left, right) => {
    const leftBelt = BELT_OPTIONS.findIndex((belt) => left.beltLevels?.includes(belt));
    const rightBelt = BELT_OPTIONS.findIndex((belt) => right.beltLevels?.includes(belt));
    return (leftBelt < 0 ? 99 : leftBelt) - (rightBelt < 0 ? 99 : rightBelt) || left.sortOrder - right.sortOrder || left.title.localeCompare(right.title);
  }), [folders]);
  const draftFolder = folders.find((folder) => folder.id === draft.folderId);
  const effectiveVideoBelts = draft.beltLevels.length ? draft.beltLevels : (draftFolder?.beltLevels || []);
  const effectiveBranches = draft.branchSlugs.length ? draft.branchSlugs : (draftFolder?.branchSlugs || []);
  const effectiveBatches = splitCsv(draft.batchNamesText).length ? splitCsv(draft.batchNamesText) : (draftFolder?.batchNames || []);
  const audiencePreview = effectiveVideoBelts.length
    ? effectiveVideoBelts.map((belt) => BELT_LABELS[belt] || belt).join(" · ")
    : "All belts / shared";

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

  function duplicateVideo(video: PortalVideo) {
    setDraft({ ...draftFromVideo(video), id: "", title: `${video.title} (copy)`, isPublished: false });
    setEditorOpen(true);
    setNotice("Video copied as a draft. Review the audience and publish when ready.");
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
      contentFormat: isYouTubeShort(value) ? "short" : draft.contentFormat,
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

  function startNewFolder() {
    setFolderDraft(emptyFolderDraft());
    setFolderEditorOpen(true);
    setNotice("");
    setError("");
  }

  function openFolder(folder: PracticeFolder) {
    setFolderDraft({ ...folder });
    setFolderEditorOpen(true);
    setNotice("");
    setError("");
  }

  function duplicateFolder(folder: PracticeFolder) {
    setFolderDraft({ ...folder, id: undefined, title: `${folder.title} (copy)`, isPublished: false });
    setFolderEditorOpen(true);
    setNotice("Folder settings copied as a draft. Add or assign lessons after saving it.");
    setError("");
  }

  async function saveFolder() {
    if (!folderDraft.title?.trim()) {
      setError("Folder title is required.");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertPracticeFolder({ ...folderDraft, title: folderDraft.title.trim() });
      setFolders((current) => current.some((folder) => folder.id === saved.id)
        ? current.map((folder) => folder.id === saved.id ? saved : folder)
        : [saved, ...current]);
      setFolderEditorOpen(false);
      setNotice(folderDraft.id ? "Practice folder updated." : "Practice folder created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save practice folder.");
    } finally {
      setSaving(false);
    }
  }

  async function removeFolder(folder: PracticeFolder) {
    if (!window.confirm(`Delete "${folder.title}"? Videos in it will remain available as unfiled content.`)) return;
    setDeletingId(folder.id);
    try {
      await deletePracticeFolder(folder.id);
      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setVideos((current) => current.map((video) => video.folderId === folder.id ? { ...video, folderId: "" } : video));
      if (selectedFolderId === folder.id) setSelectedFolderId("all");
      setNotice("Practice folder deleted. Its videos are now unfiled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete practice folder.");
    } finally {
      setDeletingId("");
    }
  }

  async function uploadFolderPhoto(file: File | undefined) {
    const folder = folders.find((item) => item.id === selectedFolderId);
    if (!file || !folder || uploadingPhoto) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      await uploadPracticePhoto({ folderId: folder.id, file, title, branchSlugs: folder.branchSlugs, batchNames: folder.batchNames, beltLevels: folder.beltLevels });
      await loadVideos(true);
      setNotice(`Photo guide uploaded to ${folder.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload practice photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(photo: PracticePhoto) {
    if (!window.confirm(`Delete "${photo.title}"?`)) return;
    setDeletingId(photo.id);
    try {
      await deletePracticePhoto(photo.id);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice("Practice photo deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete practice photo.");
    } finally {
      setDeletingId("");
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

  async function copyLessonLink(video: PortalVideo) {
    const link = `https://www.skfkarate.org/portal/videos/${encodeURIComponent(video.id)}`;
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Secure athlete portal link copied. Students must sign in and meet the belt rules to view it.");
    } catch {
      setError("Unable to copy the lesson link. Please copy it from the browser address bar after opening the lesson.");
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
              Belt-Based Home Practice
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={startNewFolder} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-100 hover:border-zinc-500">
              <FolderPlus className="h-4 w-4" /> Create Folder
            </button>
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
        <button type="button" onClick={startNewFolder} className="fixed bottom-5 right-4 z-30 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-300/50 bg-amber-300 px-5 text-sm font-bold text-black shadow-xl shadow-black/50 md:hidden">
          <FolderPlus className="h-4 w-4" /> New Folder
        </button>

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

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase tracking-wider text-zinc-500">Practice folders</p><p className="mt-2 text-2xl font-semibold text-white">{folders.length}</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase tracking-wider text-zinc-500">Videos</p><p className="mt-2 text-2xl font-semibold text-white">{videos.length}</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase tracking-wider text-zinc-500">Photo guides</p><p className="mt-2 text-2xl font-semibold text-white">{photos.length}</p></div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><p className="text-xs uppercase tracking-wider text-amber-200/70">Needs organising</p><p className="mt-2 text-2xl font-semibold text-amber-200">{videos.filter((video) => !video.folderId).length}</p></div>
        </section>

        <section className="mb-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs uppercase tracking-widest text-zinc-500">Practice folders</p><h2 className="text-lg font-semibold text-white">Organise and assign content once</h2></div>
            <span className="rounded-md border border-zinc-800 px-2 py-1 font-mono text-xs text-zinc-500">{folders.length} folders</span>
          </div>
          <div className="flex gap-3 overflow-x-auto p-4">
            <button type="button" onClick={() => setSelectedFolderId("all")} className={`min-w-40 rounded-lg border p-3 text-left ${selectedFolderId === "all" ? "border-white bg-white text-black" : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600"}`}><p className="font-semibold">All content</p><p className="mt-1 text-xs opacity-60">{videos.length} lessons</p></button>
            {beltCategorisedFolders.map((folder) => <article key={folder.id} className={`min-w-52 rounded-lg border p-3 ${selectedFolderId === folder.id ? "border-white bg-zinc-900" : "border-zinc-800 bg-black"}`}>
              <button type="button" onClick={() => setSelectedFolderId(folder.id)} className="w-full text-left"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{folderBeltCategory(folder)}</p><p className="mt-1 truncate font-semibold text-white">{parentFolderLabel(folder, folders)}</p><p className="mt-1 text-xs text-zinc-500">{videos.filter((video) => video.folderId === folder.id).length + photos.filter((photo) => photo.folderId === folder.id).length} items · {folder.isPublished ? "Live" : "Draft"}</p></button>
              <div className="mt-3 flex gap-3"><button type="button" onClick={() => openFolder(folder)} className="text-xs font-semibold text-zinc-400 hover:text-white">Edit</button><button type="button" onClick={() => duplicateFolder(folder)} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100">Duplicate</button><button type="button" onClick={() => removeFolder(folder)} disabled={deletingId === folder.id} className="text-xs font-semibold text-red-300 hover:text-red-200">Delete</button></div>
            </article>)}
          </div>
          {selectedFolderId !== "all" ? <div className="border-t border-zinc-800 px-4 py-3"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500"><PlusCircle className="h-4 w-4" /> {uploadingPhoto ? "Uploading photo…" : "Add Photo Guide"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingPhoto} onChange={(event) => { void uploadFolderPhoto(event.target.files?.[0]); event.target.value = ""; }} /></label><p className="mt-2 text-xs text-zinc-600">Photos inherit this folder’s belt, branch, and batch access rules.</p></div> : null}
          {photos.some((photo) => selectedFolderId === "all" ? !photo.folderId : photo.folderId === selectedFolderId) ? <div className="border-t border-zinc-800 p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">{selectedFolderId === "all" ? "Unfiled photo guides" : "Photo guides"}</p><div className="grid gap-2 sm:grid-cols-2">{photos.filter((photo) => selectedFolderId === "all" ? !photo.folderId : photo.folderId === selectedFolderId).map((photo) => <div key={photo.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-200">{photo.title}</p><p className="text-xs text-zinc-600">{photo.isPublished ? "Live" : "Draft"}</p></div><button type="button" onClick={() => removePhoto(photo)} disabled={deletingId === photo.id} className="text-xs font-semibold text-red-300 hover:text-red-100">Delete</button></div>)}</div></div> : null}
        </section>

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
                          {video.showInTechniques ? (
                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300">
                              Techniques
                            </span>
                          ) : null}
                          <span className="rounded-md border border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">{video.contentFormat === "short" ? "Quick Drill" : "Full Lesson"}</span>
                        </div>
                      </button>
                      <div className="flex gap-2"><button type="button" onClick={() => copyLessonLink(video)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white" title="Copy secure lesson link"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => duplicateVideo(video)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-cyan-500/40 hover:text-cyan-200" title="Duplicate video as draft"><CopyPlus className="h-4 w-4" /></button><button type="button" onClick={() => handleDelete(video)} disabled={deletingId === video.id} className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50" title="Delete video">{deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div>
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
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <button type="button" onClick={() => updateDraft({ contentFormat: "short" })} className={`min-h-12 rounded-md border px-3 text-left text-sm font-semibold ${draft.contentFormat === "short" ? "border-white bg-white text-black" : "border-zinc-800 text-zinc-400"}`}><span className="block">Quick Drill</span><span className="text-xs font-normal opacity-70">Portrait 9:16 / Shorts</span></button>
                <button type="button" onClick={() => updateDraft({ contentFormat: "landscape" })} className={`min-h-12 rounded-md border px-3 text-left text-sm font-semibold ${draft.contentFormat === "landscape" ? "border-white bg-white text-black" : "border-zinc-800 text-zinc-400"}`}><span className="block">Full Lesson</span><span className="text-xs font-normal opacity-70">Landscape 16:9</span></button>
              </div>
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })}
                className="input-minimal min-h-24 resize-none"
                placeholder="Description"
              />
              <div>
                <textarea
                  value={draft.lessonNote}
                  onChange={(event) => updateDraft({ lessonNote: event.target.value.slice(0, 3000) })}
                  className="input-minimal min-h-24 resize-y"
                  placeholder="Instructor note shown below the athlete video"
                  maxLength={3000}
                />
                <p className="mt-1 text-xs text-zinc-500">Practice cues, safety reminders, or a repetition target. Visible only with this lesson.</p>
              </div>
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
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Practice folder</label>
                <select value={draft.folderId} onChange={(event) => updateDraft({ folderId: event.target.value })} className="input-minimal">
                  <option value="">No folder (legacy/unfiled)</option>
                  {beltCategorisedFolders.map((folder) => <option key={folder.id} value={folder.id}>{folderBeltCategory(folder)} — {folder.title}</option>)}
                </select>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">Choose a folder to organise this lesson. Folder rules form the outer audience boundary.</p>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">Athlete portal preview</p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">Visible to: {audiencePreview}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Branches: {effectiveBranches.length ? effectiveBranches.join(", ") : "All"} · Batches: {effectiveBatches.length ? effectiveBatches.join(", ") : "All"}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{draftFolder ? `Inside “${draftFolder.title}”. Folder rules remain enforced.` : "No folder selected. This video uses its own visibility rules."}</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className={`${draft.contentFormat === "short" ? "mx-auto aspect-[9/16] max-w-48" : "aspect-video"} overflow-hidden rounded-md bg-black`}>
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
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Video-specific belt rule</p>
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
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">Leave empty to inherit the folder’s belt audience. Choose one or more belts to limit this individual video further; a video cannot be shared beyond its folder’s belt category.</p>
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
                  <span>Technique Library</span>
                  <input
                    type="checkbox"
                    checked={draft.showInTechniques}
                    onChange={(event) => updateDraft({ showInTechniques: event.target.checked })}
                    className="h-4 w-4 accent-white"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ready-to-publish checklist</p>
                <div className="mt-2 grid gap-1.5 text-xs text-zinc-400">
                  <p>{draft.title.trim() ? "✓" : "○"} Lesson title</p>
                  <p>{draft.youtubeId ? "✓" : "○"} Valid YouTube link</p>
                  <p>{draftFolder ? "✓" : "○"} Practice folder</p>
                  <p>{effectiveVideoBelts.length ? "✓" : "○"} Belt audience</p>
                  <p>{draft.lessonNote.trim() ? "✓" : "○"} Instructor note (recommended)</p>
                  <p>{draft.isPublished ? "✓ Published" : "○ Draft — athletes cannot see it yet"}</p>
                </div>
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

        {folderEditorOpen ? (
          <div className="glass-modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !saving) setFolderEditorOpen(false); }}>
            <aside className="glass-modal !max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
              <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-zinc-500">{folderDraft.id ? "Edit" : "New"}</p><h2 className="text-lg font-semibold text-white">{folderDraft.id ? "Update Folder" : "Create Practice Folder"}</h2></div><button type="button" onClick={() => setFolderEditorOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button></div>
              <div className="space-y-4">
                <input value={folderDraft.title || ""} onChange={(event) => setFolderDraft((current) => ({ ...current, title: event.target.value }))} className="input-minimal" placeholder="Folder name, e.g. Yellow Belt Syllabus" />
                <textarea value={folderDraft.description || ""} onChange={(event) => setFolderDraft((current) => ({ ...current, description: event.target.value }))} className="input-minimal min-h-24 resize-none" placeholder="What should students practise in this folder?" />
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Inside folder (optional)</label>
                  <select value={folderDraft.parentFolderId || ""} onChange={(event) => setFolderDraft((current) => ({ ...current, parentFolderId: event.target.value }))} className="input-minimal">
                    <option value="">Top-level practice folder</option>
                    {beltCategorisedFolders.filter((folder) => folder.id !== folderDraft.id).map((folder) => <option key={folder.id} value={folder.id}>{parentFolderLabel(folder, folders)}</option>)}
                  </select>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">Use this to build syllabus paths such as Kumite → Techniques. Keep it empty for a main library folder.</p>
                </div>
                <input value={folderDraft.batchNames?.join(", ") || ""} onChange={(event) => setFolderDraft((current) => ({ ...current, batchNames: splitCsv(event.target.value) }))} className="input-minimal" placeholder="Optional batches, comma separated" />
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Belt category and visibility</p><div className="flex flex-wrap gap-2">{BELT_OPTIONS.map((belt) => <Chip key={belt} selected={Boolean(folderDraft.beltLevels?.includes(belt))} onClick={() => setFolderDraft((current) => ({ ...current, beltLevels: current.beltLevels?.includes(belt) ? current.beltLevels.filter((item) => item !== belt) : [...(current.beltLevels || []), belt] }))}>{BELT_LABELS[belt]}</Chip>)}</div><p className="mt-2 text-xs text-zinc-600">Selected belts are the category and the only belts that can see this folder. Leave empty only for shared, all-belt content.</p></div>
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Visible to branches</p><div className="flex flex-wrap gap-2">{BRANCH_OPTIONS.map((branch) => <Chip key={branch.slug} selected={Boolean(folderDraft.branchSlugs?.includes(branch.slug))} onClick={() => setFolderDraft((current) => ({ ...current, branchSlugs: current.branchSlugs?.includes(branch.slug) ? current.branchSlugs.filter((item) => item !== branch.slug) : [...(current.branchSlugs || []), branch.slug] }))}>{branch.label}</Chip>)}</div></div>
                <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3"><label className="flex items-center justify-between text-sm text-zinc-400"><span>Published</span><input type="checkbox" checked={folderDraft.isPublished !== false} onChange={(event) => setFolderDraft((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 accent-white" /></label></div>
                <input type="number" value={folderDraft.sortOrder || 0} onChange={(event) => setFolderDraft((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))} className="input-minimal" placeholder="Sort order" />
                <button type="button" onClick={saveFolder} disabled={saving} className="btn-primary flex min-h-11 w-full items-center justify-center gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{folderDraft.id ? "Save Folder" : "Create Folder"}</button>
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
