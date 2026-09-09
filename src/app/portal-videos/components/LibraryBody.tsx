"use client";

import { ChevronRight, Folder, FolderInput, Inbox, PlayCircle, SearchX } from "lucide-react";
import type { PracticeFolder, PracticePhoto, PortalVideo } from "@/lib/api";
import type { FolderCounts, SearchResults } from "./tree-utils";
import { FolderSkeleton, FolderTile } from "./FolderTile";
import { PhotoGuideCard } from "./PhotoGuideCard";
import { VideoCard } from "./VideoCard";
import { normalizeKarateMediaUrl } from "@/lib/media-url";
import type { CollectionKey, ViewMode } from "./library-shared";

export function LibraryBody({
  loading,
  query,
  searchResults,
  collection,
  activeFolderId,
  view,
  visibleFolders,
  countsByFolder,
  videos,
  photos,
  dragOverFolder,
  draggingVideoId,
  onOpenFolder,
  onFolderContext,
  onVideoOpen,
  onVideoContext,
  onPhotoContext,
  onDragStart,
  onDragEnd,
  onDragOverTile,
  onDragLeaveTile,
  onDropOnTile,
  onDropOnRoot,
  onVideoMoveUp,
  onVideoMoveDown,
}: {
  loading: boolean;
  query: string;
  searchResults: SearchResults | null;
  collection: CollectionKey;
  activeFolderId: string;
  view: ViewMode;
  visibleFolders: PracticeFolder[];
  countsByFolder: Map<string, FolderCounts>;
  videos: PortalVideo[];
  photos: PracticePhoto[];
  dragOverFolder: string | null;
  draggingVideoId: string | null;
  onOpenFolder: (folderId: string) => void;
  onFolderContext: (folder: PracticeFolder, x: number, y: number) => void;
  onVideoOpen: (video: PortalVideo) => void;
  onVideoContext: (video: PortalVideo, x: number, y: number, pathLabel?: string) => void;
  onPhotoContext: (photo: PracticePhoto, x: number, y: number) => void;
  onDragStart: (event: React.DragEvent, video: PortalVideo) => void;
  onDragEnd: () => void;
  onDragOverTile: (event: React.DragEvent, folderId: string) => void;
  onDragLeaveTile: (folderId: string) => void;
  onDropOnTile: (event: React.DragEvent, folderId: string) => void;
  onDropOnRoot: (event: React.DragEvent) => void;
  onVideoMoveUp?: (video: PortalVideo) => void;
  onVideoMoveDown?: (video: PortalVideo) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <FolderSkeleton key={index} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60" />
          ))}
        </div>
      </div>
    );
  }

  if (searchResults) {
    const total = searchResults.folders.length + searchResults.videos.length + searchResults.photos.length;
    if (!total) {
      return <EmptyState icon={SearchX} title="Nothing found" message={`No folders, lessons, or photo guides match “${query.trim()}”.`} />;
    }
    return (
      <div className="space-y-7">
        {searchResults.folders.length ? (
          <ResultGroup label="Folders">
            {searchResults.folders.map(({ folder, pathLabel }) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onOpenFolder(folder.id)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-left transition-colors hover:border-zinc-600"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                  <Folder className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{folder.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{pathLabel || "Top level"}</span>
                </span>
                {!folder.isPublished ? <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Draft</span> : null}
                <ChevronRight className="h-4 w-4 text-zinc-700" />
              </button>
            ))}
          </ResultGroup>
        ) : null}

        {searchResults.videos.length ? (
          <ResultGroup label="Lessons">
            {searchResults.videos.map(({ video, pathLabel }) => (
              <VideoCard
                key={video.id}
                video={video}
                variant="list"
                pathLabel={pathLabel}
                dragging={false}
                onOpen={() => onVideoOpen(video)}
                onContext={(x, y) => onVideoContext(video, x, y, pathLabel)}
              />
            ))}
          </ResultGroup>
        ) : null}

        {searchResults.photos.length ? (
          <ResultGroup label="Photo guides">
            {searchResults.photos.map(({ photo, pathLabel }) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => window.open(normalizeKarateMediaUrl(photo.storagePath), "_blank")}
                onContextMenu={(event) => { event.preventDefault(); onPhotoContext(photo, event.clientX, event.clientY); }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-left transition-colors hover:border-zinc-600"
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={normalizeKarateMediaUrl(photo.storagePath)} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{photo.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{pathLabel || "Unfiled"}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-700" />
              </button>
            ))}
          </ResultGroup>
        ) : null}
      </div>
    );
  }

  const showUnfiledTray = Boolean(draggingVideoId) && Boolean(activeFolderId);

  return (
    <div onDragOver={(event) => { if (draggingVideoId && !activeFolderId) event.preventDefault(); }} onDrop={(event) => { if (!activeFolderId) onDropOnRoot(event); }}>
      {showUnfiledTray ? (
        <button
          type="button"
          onClick={(event) => event.preventDefault()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropOnRoot}
          className="mb-5 flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-400/50 bg-cyan-500/5 text-sm font-semibold text-cyan-200"
        >
          <FolderInput className="h-4 w-4" /> Drop here to unfile this lesson
        </button>
      ) : null}

      {visibleFolders.length > 0 ? (
        <section className="mb-7">
          <SectionLabel>{activeFolderId ? "Subfolders" : "Practice folders"}</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleFolders.map((folder) => (
              <FolderTile
                key={folder.id}
                folder={folder}
                counts={countsByFolder.get(folder.id) || { folders: 0, videos: 0, photos: 0, total: 0 }}
                isDropTarget={dragOverFolder === folder.id}
                onOpen={() => onOpenFolder(folder.id)}
                onContext={(x, y) => onFolderContext(folder, x, y)}
                onDragOverTile={onDragOverTile}
                onDragLeaveTile={onDragLeaveTile}
                onDropOnTile={onDropOnTile}
              />
            ))}
          </div>
        </section>
      ) : null}

      {photos.length > 0 ? (
        <section className="mb-7">
          <SectionLabel>{activeFolderId ? "Photo guides" : "Unfiled photo guides"}</SectionLabel>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((photo) => (
              <PhotoGuideCard key={photo.id} photo={photo} onContext={(x, y) => onPhotoContext(photo, x, y)} />
            ))}
          </div>
        </section>
      ) : null}

      {videos.length > 0 ? (
        <section>
          <SectionLabel>{activeFolderId ? "Lessons" : collection === "unfiled" ? "Unfiled lessons" : "Lessons"}</SectionLabel>
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  variant="grid"
                  dragging={draggingVideoId === video.id}
                  onOpen={() => onVideoOpen(video)}
                  onContext={(x, y) => onVideoContext(video, x, y)}
                  onDragStart={(event) => onDragStart(event, video)}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  variant="list"
                  dragging={draggingVideoId === video.id}
                  onOpen={() => onVideoOpen(video)}
                  onContext={(x, y) => onVideoContext(video, x, y)}
                  onDragStart={(event) => onDragStart(event, video)}
                  onDragEnd={onDragEnd}
                  onMoveUp={onVideoMoveUp ? (index > 0 ? () => onVideoMoveUp(video) : undefined) : undefined}
                  onMoveDown={onVideoMoveDown ? (index < videos.length - 1 ? () => onVideoMoveDown(video) : undefined) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {visibleFolders.length === 0 && videos.length === 0 && photos.length === 0 ? (
        <EmptyState
          icon={collection === "unfiled" ? Inbox : PlayCircle}
          title={collection === "unfiled" ? "Everything is filed" : collection === "watched" ? "No watch data yet" : activeFolderId ? "This folder is empty" : "Your library is empty"}
          message={
            collection === "unfiled"
              ? "Every lesson lives inside a folder. Nice work."
              : activeFolderId
                ? "Add subfolders, upload a photo guide, or create the first lesson here."
                : "Create your first practice folder to start organising belt-based lessons."
          }
        />
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{children}</p>;
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: typeof PlayCircle; title: string; message: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center">
      <Icon className="mb-3 h-8 w-8 text-zinc-600" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">{message}</p>
    </div>
  );
}
