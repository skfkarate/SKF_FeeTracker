"use client";

import { Folder } from "lucide-react";
import type { PracticeFolder } from "@/lib/api";
import type { FolderCounts } from "./tree-utils";
import { useLongPress } from "./use-long-press";

export function FolderTile({
  folder,
  counts,
  isDropTarget,
  onOpen,
  onContext,
  onDragOverTile,
  onDragLeaveTile,
  onDropOnTile,
}: {
  folder: PracticeFolder;
  counts: FolderCounts;
  isDropTarget: boolean;
  onOpen: () => void;
  onContext: (x: number, y: number) => void;
  onDragOverTile?: (event: React.DragEvent, folderId: string) => void;
  onDragLeaveTile?: (folderId: string) => void;
  onDropOnTile?: (event: React.DragEvent, folderId: string) => void;
}) {
  const longPress = useLongPress(onContext);
  const subtitleParts = [
    counts.total === 1 ? "1 item" : `${counts.total} items`,
    ...(counts.folders ? [`${counts.folders} ${counts.folders === 1 ? "folder" : "folders"}`] : []),
  ];

  return (
    <button
      type="button"
      onClick={onOpen}
      onContextMenu={(event) => {
        event.preventDefault();
        onContext(event.clientX, event.clientY);
      }}
      {...longPress}
      onDragOver={onDragOverTile ? (event) => onDragOverTile(event, folder.id) : undefined}
      onDragLeave={onDragLeaveTile ? () => onDragLeaveTile(folder.id) : undefined}
      onDrop={onDropOnTile ? (event) => onDropOnTile(event, folder.id) : undefined}
      className={`group relative flex flex-col rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
        isDropTarget
          ? "border-cyan-400/70 bg-cyan-500/10 ring-2 ring-cyan-400/50"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900"
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-300 shadow-inner shadow-black/40 group-hover:border-zinc-600">
          <Folder className="h-5 w-5" strokeWidth={1.75} />
        </span>
        {!folder.isPublished ? (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">Draft</span>
        ) : null}
      </div>
      <p className="truncate text-sm font-semibold text-white">{folder.title}</p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitleParts.join(" · ")}</p>
    </button>
  );
}

export function FolderSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" aria-hidden />;
}
