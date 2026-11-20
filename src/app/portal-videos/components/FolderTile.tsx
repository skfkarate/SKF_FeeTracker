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
          ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] ring-2 ring-[color:var(--color-accent)]"
          : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--color-hairline)] bg-gradient-to-br from-[color:var(--color-panel)] to-[color:var(--color-panel)] text-[color:var(--color-text)] shadow-inner shadow-[0_18px_45px_rgba(0,0,0,0.28)] group-hover:border-[color:var(--color-hairline)]">
          <Folder className="h-5 w-5" strokeWidth={1.75} />
        </span>
        {!folder.isPublished ? (
          <span className="rounded-md border border-[color:var(--color-due-border)] bg-[color:var(--color-well)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text)]">Draft</span>
        ) : null}
      </div>
      <p className="truncate text-sm font-semibold text-[color:var(--color-text)]">{folder.title}</p>
      <p className="mt-0.5 truncate text-xs text-[color:var(--color-text-dim)]">{subtitleParts.join(" · ")}</p>
    </button>
  );
}

export function FolderSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]" aria-hidden />;
}
