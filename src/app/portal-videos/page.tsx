"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  FolderInput,
  FolderOpen,
  FolderPlus,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  PlusCircle,
  RefreshCw,
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
  getHomePracticeAnalytics,
  getPracticeLibraryAdmin,
  reorderPracticeContent,
  upsertPortalVideo,
  upsertPracticeFolder,
  uploadPracticePhoto,
  type PracticeFolder,
  type PracticeFolderInput,
  type PracticePhoto,
  type PortalVideo,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { ConfirmModal } from "@/components/common/ConfirmModal";

import { SmartCollections } from "./components/SmartCollections";
import { SortViewControls } from "./components/SortViewControls";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { ContextMenuSurface, useContextMenu } from "./components/ContextMenu";
import { MoveToSheet } from "./components/MoveToSheet";
import { VideoEditorSheet, draftFromVideo, draftToInput, emptyVideoDraft, type VideoDraft } from "./components/VideoEditorSheet";
import { FolderEditorSheet, emptyFolderDraft } from "./components/FolderEditorSheet";
import { LibraryBody } from "./components/LibraryBody";
import { useFolderNavigation } from "./components/use-folder-navigation";
import { childrenOf, countSubtree, flattenVideoScopeIds, getAncestorChain, getDescendantIds, searchLibrary, sortVideos } from "./components/tree-utils";
import type { CollectionKey, SortMode, ViewMode } from "./components/library-shared";

const VIEW_PREF_KEY = "portal-videos-view-prefs";
const WATCHED_LIMIT = 8;

type ConfirmState = { kind: "video" | "folder" | "photo"; id: string; title: string; message: string } | null;

export default function PortalVideosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-300">
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        </div>
      }
    >
      <PortalVideosLibrary />
    </Suspense>
  );
}

function PortalVideosLibrary() {
  const { user, checking } = useFeeTrackAuth();
  const { rawFolderId, navigate } = useFolderNavigation();

  const [videos, setVideos] = useState<PortalVideo[]>([]);
  const [folders, setFolders] = useState<PracticeFolder[]>([]);
  const [photos, setPhotos] = useState<PracticePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [view, setView] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("auto");
  const [collection, setCollection] = useState<CollectionKey>("");
  const [query, setQuery] = useState("");
  const [watchedIds, setWatchedIds] = useState<string[]>([]);

  const [videoDraft, setVideoDraft] = useState<VideoDraft | null>(null);
  const [folderDraft, setFolderDraft] = useState<PracticeFolderInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const [moveState, setMoveState] = useState<{ video: PortalVideo } | null>(null);
  const [movingBusy, setMovingBusy] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [deletingId, setDeletingId] = useState("");

  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggingVideoId, setDraggingVideoId] = useState<string | null>(null);

  const { menu, open: openMenu, close: closeMenu } = useContextMenu();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadingPhotoRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(VIEW_PREF_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as { view?: ViewMode; sort?: SortMode };
        if (parsed.view === "grid" || parsed.view === "list") setView(parsed.view);
        if (parsed.sort === "auto" || parsed.sort === "name" || parsed.sort === "newest") setSortMode(parsed.sort);
      } catch {}
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const updatePrefs = useCallback((nextView: ViewMode, nextSort: SortMode) => {
    setView(nextView);
    setSortMode(nextSort);
    try {
      window.localStorage.setItem(VIEW_PREF_KEY, JSON.stringify({ view: nextView, sort: nextSort }));
    } catch {}
  }, []);

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
      if (!cancelled) void loadVideos();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checking, loadVideos, user]);

  useEffect(() => {
    if (checking || !user) return;
    let cancelled = false;
    getHomePracticeAnalytics(90)
      .then((analytics) => {
        if (cancelled) return;
        const ranked = [...(analytics.videos || [])]
          .sort((left, right) => right.watches - left.watches)
          .slice(0, WATCHED_LIMIT);
        setWatchedIds(ranked.map((item) => item.videoId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [checking, user]);

  const currentFolder = useMemo(() => folders.find((folder) => folder.id === rawFolderId) || null, [folders, rawFolderId]);
  const activeFolderId = currentFolder?.id || "";
  const chain = useMemo(() => getAncestorChain(activeFolderId || null, folders), [activeFolderId, folders]);

  const [lastFolderId, setLastFolderId] = useState(activeFolderId);
  if (lastFolderId !== activeFolderId) {
    setLastFolderId(activeFolderId);
    setCollection("");
  }

  const countsByFolder = useMemo(() => {
    const map = new Map<string, ReturnType<typeof countSubtree>>();
    for (const folder of folders) map.set(folder.id, countSubtree(folder.id, folders, videos, photos));
    return map;
  }, [folders, videos, photos]);

  const visibleFolders = useMemo(
    () => (collection || query.trim() ? [] : childrenOf(folders, activeFolderId || null)),
    [collection, query, folders, activeFolderId],
  );

  const searchResults = useMemo(() => (query.trim() ? searchLibrary(query, folders, videos, photos) : null), [query, folders, videos, photos]);

  const collectionVideos = useMemo(() => {
    if (collection === "unfiled") return sortVideos(videos.filter((video) => !video.folderId), sortMode);
    if (collection === "drafts") return sortVideos(videos.filter((video) => !video.isPublished), sortMode);
    if (collection === "watched") {
      const byId = new Map(videos.map((video) => [video.id, video]));
      return watchedIds.map((id) => byId.get(id)).filter((video): video is PortalVideo => Boolean(video));
    }
    return [];
  }, [collection, videos, watchedIds, sortMode]);

  const locationVideos = useMemo(() => {
    const scoped = activeFolderId ? videos.filter((video) => video.folderId === activeFolderId) : videos.filter((video) => !video.folderId);
    return sortVideos(scoped, sortMode);
  }, [activeFolderId, videos, sortMode]);

  const locationPhotos = useMemo(() => {
    return activeFolderId ? photos.filter((photo) => photo.folderId === activeFolderId) : photos.filter((photo) => !photo.folderId);
  }, [activeFolderId, photos]);

  const unfiledCount = videos.filter((video) => !video.folderId).length;
  const draftsCount = videos.filter((video) => !video.isPublished).length;
  const bodyVideos = collection ? collectionVideos : locationVideos;

  function flashNotice(message: string) {
    setError("");
    setNotice(message);
  }

  function startNewVideo(folderId = "") {
    setEditorError("");
    setVideoDraft({ ...emptyVideoDraft(), folderId });
  }

  function openVideoEditor(video: PortalVideo) {
    setEditorError("");
    setVideoDraft(draftFromVideo(video));
  }

  function duplicateVideo(video: PortalVideo) {
    setEditorError("");
    setVideoDraft({ ...draftFromVideo(video), id: "", title: `${video.title} (copy)`, isPublished: false });
    flashNotice("Video copied as a draft. Review the audience and publish when ready.");
  }

  async function submitVideo() {
    if (!videoDraft) return;
    if (!videoDraft.title.trim()) {
      setEditorError("Video title is required.");
      return;
    }
    if (!videoDraft.youtubeId) {
      setEditorError("Paste a valid YouTube URL or 11-character video ID.");
      return;
    }
    setSaving(true);
    setEditorError("");
    const wasEditing = Boolean(videoDraft.id);
    try {
      const saved = await upsertPortalVideo(draftToInput(videoDraft));
      setVideos((currentList) => {
        const exists = currentList.some((item) => item.id === saved.id);
        return exists ? currentList.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...currentList];
      });
      setVideoDraft(null);
      flashNotice(wasEditing ? "Portal video updated." : "Portal video created.");
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Unable to save portal video.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVideoPublished(video: PortalVideo) {
    setSaving(true);
    setError("");
    try {
      const saved = await upsertPortalVideo(draftToInput({ ...draftFromVideo(video), isPublished: !video.isPublished }));
      setVideos((currentList) => currentList.map((item) => (item.id === saved.id ? saved : item)));
      flashNotice(saved.isPublished ? `“${saved.title}” is live.` : `“${saved.title}” moved to drafts.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the video.");
    } finally {
      setSaving(false);
    }
  }

  function startNewFolder(parentId = "") {
    setEditorError("");
    setFolderDraft({ ...emptyFolderDraft(), parentFolderId: parentId || "" });
  }

  function openFolderEditor(folder: PracticeFolder) {
    setEditorError("");
    setFolderDraft({ ...folder });
  }

  function duplicateFolder(folder: PracticeFolder) {
    setEditorError("");
    setFolderDraft({ ...folder, id: undefined, title: `${folder.title} (copy)`, isPublished: false });
    flashNotice("Folder settings copied as a draft. Add or assign lessons after saving it.");
  }

  async function submitFolder() {
    if (!folderDraft) return;
    if (!folderDraft.title?.trim()) {
      setEditorError("Folder title is required.");
      return;
    }
    setSaving(true);
    setEditorError("");
    try {
      const saved = await upsertPracticeFolder({ ...folderDraft, branchSlugs: [], batchNames: [], beltLevels: [], title: folderDraft.title.trim() });
      setFolders((currentList) =>
        currentList.some((folder) => folder.id === saved.id)
          ? currentList.map((folder) => (folder.id === saved.id ? saved : folder))
          : [...currentList, saved],
      );
      setFolderDraft(null);
      flashNotice(folderDraft.id ? "Practice folder updated." : "Practice folder created.");
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Unable to save practice folder.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFolderPublished(folder: PracticeFolder) {
    setSaving(true);
    setError("");
    try {
      const saved = await upsertPracticeFolder({ ...folder, isPublished: !folder.isPublished });
      setFolders((currentList) => currentList.map((item) => (item.id === saved.id ? saved : item)));
      flashNotice(saved.isPublished ? `“${saved.title}” is live.` : `“${saved.title}” moved to drafts.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the folder.");
    } finally {
      setSaving(false);
    }
  }

  async function moveVideoTo(video: PortalVideo, targetFolderId: string | null) {
    if ((video.folderId || null) === targetFolderId) return;
    const previous = videos;
    setVideos((currentList) => currentList.map((item) => (item.id === video.id ? { ...item, folderId: targetFolderId || "" } : item)));
    setMovingBusy(true);
    setError("");
    try {
      const saved = await upsertPortalVideo({
        id: video.id,
        title: video.title,
        description: video.description,
        lessonNote: video.lessonNote,
        category: video.category,
        durationLabel: video.durationLabel,
        youtubeId: video.youtubeId,
        contentFormat: video.contentFormat,
        folderId: targetFolderId || undefined,
        branchSlugs: video.branchSlugs,
        batchNames: video.batchNames,
        beltLevels: video.beltLevels,
        isFeatured: video.isFeatured,
        isPublished: video.isPublished,
        showInTechniques: video.showInTechniques,
        sortOrder: video.sortOrder,
      });
      setVideos((currentList) => currentList.map((item) => (item.id === saved.id ? saved : item)));
      flashNotice(`“${saved.title}” moved.`);
    } catch (err) {
      setVideos(previous);
      setError(err instanceof Error ? err.message : "Unable to move the video.");
    } finally {
      setMovingBusy(false);
    }
  }

  function requestDelete(kind: "video" | "folder" | "photo", id: string, title: string, message: string) {
    setConfirmState({ kind, id, title, message });
  }

  async function handleConfirmDelete() {
    const state = confirmState;
    if (!state) return;
    setConfirmState(null);
    setDeletingId(state.id);
    setError("");
    setNotice("");
    try {
      if (state.kind === "video") {
        await deletePortalVideo(state.id);
        setVideos((currentList) => currentList.filter((item) => item.id !== state.id));
        if (videoDraft?.id === state.id) setVideoDraft(null);
        flashNotice("Portal video removed.");
      } else if (state.kind === "folder") {
        await deletePracticeFolder(state.id);
        setFolders((currentList) => currentList.filter((item) => item.id !== state.id));
        setVideos((currentList) => currentList.map((item) => (item.folderId === state.id ? { ...item, folderId: "" } : item)));
        if (activeFolderId === state.id) navigate(null);
        flashNotice("Practice folder deleted. Its videos are now unfiled.");
      } else {
        await deletePracticePhoto(state.id);
        setPhotos((currentList) => currentList.filter((item) => item.id !== state.id));
        flashNotice("Practice photo deleted.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete the deletion.");
    } finally {
      setDeletingId("");
    }
  }

  async function copyLessonLink(video: PortalVideo) {
    const link = `https://www.skfkarate.org/portal/videos/${encodeURIComponent(video.id)}`;
    try {
      await navigator.clipboard.writeText(link);
      flashNotice("Secure athlete portal link copied. Students must sign in and meet the belt rules to view it.");
    } catch {
      setError("Unable to copy the lesson link. Please copy it from the browser address bar after opening the lesson.");
    }
  }

  async function uploadFolderPhoto(file: File | undefined) {
    if (!file || !currentFolder || uploadingPhotoRef.current) return;
    uploadingPhotoRef.current = true;
    setError("");
    setNotice("");
    try {
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      await uploadPracticePhoto({
        folderId: currentFolder.id,
        file,
        title,
        branchSlugs: [],
        batchNames: [],
        beltLevels: [],
      });
      await loadVideos(true);
      flashNotice(`Photo guide uploaded to ${currentFolder.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload practice photo.");
    } finally {
      uploadingPhotoRef.current = false;
    }
  }

  const openFolderMenu = (folder: PracticeFolder, x: number, y: number) => {
    const counts = countsByFolder.get(folder.id);
    openMenu(
      x,
      y,
      folder.title,
      [
        { label: "Open", icon: FolderOpen, onSelect: () => navigate(folder.id) },
        { label: "Edit", icon: Pencil, onSelect: () => openFolderEditor(folder) },
        { label: "New subfolder here", icon: FolderPlus, onSelect: () => startNewFolder(folder.id) },
        { label: "Duplicate", icon: Copy, onSelect: () => duplicateFolder(folder) },
        { label: folder.isPublished ? "Move to drafts" : "Publish", icon: folder.isPublished ? EyeOff : Eye, onSelect: () => void toggleFolderPublished(folder) },
        {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onSelect: () =>
            requestDelete(
              "folder",
              folder.id,
              folder.title,
              `Delete “${folder.title}”? Videos and photo guides inside stay available as unfiled content.`,
            ),
        },
      ],
      counts ? `${counts.total} items · ${counts.folders} subfolders` : undefined,
    );
  };

  const openVideoMenu = (video: PortalVideo, x: number, y: number, pathLabel?: string) => {
    openMenu(
      x,
      y,
      video.title,
      [
        { label: "Edit lesson", icon: Pencil, onSelect: () => openVideoEditor(video) },
        { label: "Move to…", icon: FolderInput, onSelect: () => setMoveState({ video }) },
        { label: "Duplicate as draft", icon: CopyPlus, onSelect: () => duplicateVideo(video) },
        { label: "Copy secure link", icon: Link2, onSelect: () => void copyLessonLink(video) },
        { label: video.isPublished ? "Unpublish" : "Publish now", icon: video.isPublished ? EyeOff : Eye, onSelect: () => void toggleVideoPublished(video) },
        {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onSelect: () => requestDelete("video", video.id, video.title, `Delete “${video.title}”? Athletes will lose access immediately.`),
        },
      ],
      pathLabel || (video.durationLabel ? `${video.category} · ${video.durationLabel}` : video.category),
    );
  };

  const openPhotoMenu = (photo: PracticePhoto, x: number, y: number) => {
    openMenu(
      x,
      y,
      photo.title,
      [
        {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          onSelect: () => requestDelete("photo", photo.id, photo.title, `Delete the photo guide “${photo.title}”?`),
        },
      ],
      photo.isPublished ? "Live guide" : "Draft guide",
    );
  };

  const invalidParentIds = useMemo(() => {
    if (!folderDraft?.id) return new Set<string>();
    return new Set([folderDraft.id, ...getDescendantIds(folderDraft.id, folders)]);
  }, [folderDraft, folders]);

  const handleDragStart = useCallback((event: React.DragEvent, video: PortalVideo) => {
    event.dataTransfer.setData("text/plain", video.id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingVideoId(video.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingVideoId(null);
    setDragOverFolder(null);
  }, []);

  const handleDragOverTile = useCallback((event: React.DragEvent, folderId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverFolder((current) => (current === folderId ? current : folderId));
  }, []);

  const handleDragLeaveTile = useCallback((folderId: string) => {
    setDragOverFolder((current) => (current === folderId ? null : current));
  }, []);

  const handleDropOnTile = useCallback(
    (event: React.DragEvent, folderId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const id = event.dataTransfer.getData("text/plain");
      setDraggingVideoId(null);
      setDragOverFolder(null);
      const video = videos.find((item) => item.id === id);
      if (video) void moveVideoTo(video, folderId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videos],
  );

  const handleDropOnRoot = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain");
      setDraggingVideoId(null);
      setDragOverFolder(null);
      const video = videos.find((item) => item.id === id);
      if (video) void moveVideoTo(video, null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videos],
  );

  async function handleVideoReorder(video: PortalVideo, direction: "up" | "down") {
    if (searchResults || collection) return;
    const shelf = bodyVideos;
    const from = shelf.findIndex((item) => item.id === video.id);
    const to = from + (direction === "up" ? -1 : 1);
    if (from < 0 || to < 0 || to >= shelf.length) return;

    const nextShelf = [...shelf];
    const [moved] = nextShelf.splice(from, 1);
    nextShelf.splice(to, 0, moved);

    const previous = videos;
    setError("");
    setSaving(true);
    try {
      const orderedIds = flattenVideoScopeIds(folders, videos, {
        folderId: activeFolderId || null,
        ids: nextShelf.map((item) => item.id),
      });
      await reorderPracticeContent("videos", orderedIds);
      const orderBy = new Map(orderedIds.map((id, index) => [id, index * 10]));
      setVideos((currentList) => currentList.map((item) => ({ ...item, sortOrder: orderBy.get(item.id) ?? item.sortOrder })));
      flashNotice(`“${video.title}” reordered within the belt shelf.`);
    } catch (err) {
      setVideos(previous);
      setError(err instanceof Error ? err.message : "Unable to reorder the shelf.");
    } finally {
      setSaving(false);
    }
  }

  const handleBreadcrumbDrop = useCallback(
    (event: React.DragEvent, folderId: string | null) => {
      if (folderId) handleDropOnTile(event, folderId);
      else handleDropOnRoot(event);
    },
    [handleDropOnTile, handleDropOnRoot],
  );

  const headingTitle = query.trim()
    ? `Search results`
    : collection === "unfiled"
      ? "Unfiled lessons"
      : collection === "drafts"
        ? "Draft lessons"
        : collection === "watched"
          ? "Most watched · last 90 days"
          : currentFolder
            ? currentFolder.title
            : "Belt-Based Home Practice";

  const browsing = !searchResults;

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

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Portal Operations</p>
            </div>
            <h1 className={`font-[family-name:var(--font-space)] font-semibold tracking-tight text-white ${currentFolder && browsing && !collection ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>
              {currentFolder && browsing && !collection ? (
                <button type="button" onClick={() => navigate(chain.length > 1 ? chain[chain.length - 2].id : null)} className="truncate text-left transition-colors hover:text-zinc-300">
                  {headingTitle}
                </button>
              ) : (
                headingTitle
              )}
            </h1>
            {!query.trim() && !collection && currentFolder?.description ? (
              <p className="mt-1 line-clamp-1 text-sm text-zinc-500">{currentFolder.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => startNewFolder(activeFolderId)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-100 hover:border-zinc-500">
              <FolderPlus className="h-4 w-4" /> Folder
            </button>
            <button type="button" onClick={() => startNewVideo(activeFolderId)} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm">
              <PlusCircle className="h-4 w-4" /> Video
            </button>
            <button
              type="button"
              onClick={() => loadVideos(true)}
              disabled={refreshing}
              aria-label="Refresh library"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {browsing && chain.length > 0 ? (
            <Breadcrumbs
              chain={chain}
              onNavigate={navigate}
              dropTargetId={dragOverFolder}
              onDragEnterNode={(folderId) => setDragOverFolder(folderId ?? "__root__")}
              onDropOnNode={handleBreadcrumbDrop}
            />
          ) : (
            <span />
          )}
          {browsing ? (
            <SortViewControls view={view} sort={sortMode} onViewChange={(nextView) => updatePrefs(nextView, sortMode)} onSortChange={(nextSort) => updatePrefs(view, nextSort)} />
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="flex-1">{error}</p>
            <button type="button" onClick={() => setError("")} className="flex-shrink-0 text-red-300/70 hover:text-red-100" aria-label="Dismiss error"><X className="h-4 w-4" /></button>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="flex-1">{notice}</p>
            <button type="button" onClick={() => setNotice("")} className="flex-shrink-0 text-emerald-300/70 hover:text-emerald-100" aria-label="Dismiss notice"><X className="h-4 w-4" /></button>
          </div>
        ) : null}

        <div className="relative mb-6 sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-minimal min-h-11 pl-11 pr-10"
            placeholder="Search all folders and lessons…"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-white" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {!loading && browsing && !activeFolderId ? (
          <div className="mb-7">
            <SmartCollections
              unfiledCount={unfiledCount}
              draftsCount={draftsCount}
              watchedCount={watchedIds.length}
              totalVideos={videos.length}
              active={collection}
              onSelect={setCollection}
            />
          </div>
        ) : null}

        {browsing && activeFolderId ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => startNewFolder(activeFolderId)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white">
              <FolderPlus className="h-3.5 w-3.5" /> Subfolder
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Photo guide
            </button>
            <p className="ml-auto hidden text-xs text-zinc-600 sm:block">Tip: drag lessons onto a folder or breadcrumb to re-file them.</p>
          </div>
        ) : null}

        <LibraryBody
          loading={loading}
          query={query}
          searchResults={searchResults}
          collection={collection}
          activeFolderId={activeFolderId}
          view={view}
          visibleFolders={visibleFolders}
          countsByFolder={countsByFolder}
          videos={bodyVideos}
          photos={locationPhotos}
          dragOverFolder={dragOverFolder}
          draggingVideoId={draggingVideoId}
          onOpenFolder={(folderId) => navigate(folderId)}
          onFolderContext={openFolderMenu}
          onVideoOpen={openVideoEditor}
          onVideoContext={openVideoMenu}
          onPhotoContext={openPhotoMenu}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverTile={handleDragOverTile}
          onDragLeaveTile={handleDragLeaveTile}
          onDropOnTile={handleDropOnTile}
          onDropOnRoot={handleDropOnRoot}
          onVideoMoveUp={view === "list" && sortMode === "auto" && !collection && !searchResults ? (video) => void handleVideoReorder(video, "up") : undefined}
          onVideoMoveDown={view === "list" && sortMode === "auto" && !collection && !searchResults ? (video) => void handleVideoReorder(video, "down") : undefined}
        />

        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            void uploadFolderPhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {videoDraft ? (
          <VideoEditorSheet
            draft={videoDraft}
            folders={[...folders].sort((left, right) => left.title.localeCompare(right.title))}
            saving={saving}
            error={editorError}
            onChange={(patch) => {
              setEditorError("");
              setNotice("");
              setVideoDraft((current) => (current ? { ...current, ...patch } : current));
            }}
            onSubmit={() => void submitVideo()}
            onClose={() => setVideoDraft(null)}
          />
        ) : null}

        {folderDraft ? (
          <FolderEditorSheet
            draft={folderDraft}
            folders={folders}
            saving={saving}
            error={editorError}
            invalidParentIds={invalidParentIds}
            onChange={(patch) => {
              setEditorError("");
              setNotice("");
              setFolderDraft((current) => (current ? { ...current, ...patch } : current));
            }}
            onSubmit={() => void submitFolder()}
            onClose={() => setFolderDraft(null)}
          />
        ) : null}

        {moveState ? (
          <MoveToSheet
            key={moveState.video.id}
            title={moveState.video.title}
            currentLabel={folders.find((folder) => folder.id === moveState.video.folderId)?.title || "Unfiled"}
            currentFolderId={moveState.video.folderId || null}
            folders={folders}
            busy={movingBusy}
            onClose={() => setMoveState(null)}
            onMove={(target) => {
              const video = moveState.video;
              setMoveState(null);
              void moveVideoTo(video, target);
            }}
          />
        ) : null}

        <ContextMenuSurface menu={menu} onClose={closeMenu} />

        <ConfirmModal
          open={confirmState !== null}
          title={confirmState?.kind === "video" ? "Delete Video" : confirmState?.kind === "folder" ? "Delete Folder" : "Delete Photo Guide"}
          message={confirmState?.message || ""}
          variant="danger"
          confirmLabel="Delete"
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setConfirmState(null)}
          loading={Boolean(confirmState && deletingId === confirmState.id)}
        />
      </main>
    </div>
  );
}
