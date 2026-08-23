"use client";

import { Folder } from "lucide-react";
import type { PracticeFolder } from "@/lib/api";
import type { FolderCounts } from "./tree-utils";
import { folderBeltCategory } from "./library-shared";
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
      <span className="pointer-events-none absolute left-4 right-4 top-0 flex h-[3px] gap-1 overflow-hidden rounded-b-full">
        {(folder.beltLevels?.length ? folder.beltLevels : ["shared"]).slice(0, 6).map((belt, index) => (
          <span key={`${belt}-${index}`} className={`h-full flex-1 first:rounded-l-full last:rounded-r-full ${beltClass(belt)}`} />
        ))}
      </span>
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
      <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-zinc-600">{folderBeltCategory(folder.beltLevels)}</p>
    </button>
  );
}

function beltClass(belt: string) {
  switch (belt) {
    case "white": return "bg-zinc-200";
    case "yellow": return "bg-yellow-400";
    case "orange": return "bg-orange-500";
    case "green-ii": return "bg-emerald-700";
    case "green-i": return "bg-emerald-400";
    case "blue": return "bg-sky-500";
    case "purple": return "bg-purple-500";
    case "brown-iii": return "bg-amber-800";
    case "brown-ii": return "bg-amber-700";
    case "brown-i": return "bg-amber-600";
    default: return "bg-cyan-400";
  }
}

export function FolderSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" aria-hidden />;
}
