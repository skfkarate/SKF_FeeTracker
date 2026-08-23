"use client";

import { Flame, Inbox, PencilLine, LayoutGrid } from "lucide-react";
import type { CollectionKey } from "./library-shared";

export function SmartCollections({
  unfiledCount,
  draftsCount,
  watchedCount,
  totalVideos,
  active,
  onSelect,
}: {
  unfiledCount: number;
  draftsCount: number;
  watchedCount: number;
  totalVideos: number;
  active: CollectionKey;
  onSelect: (key: CollectionKey) => void;
}) {
  const tiles: Array<{ key: CollectionKey; label: string; count: number | null; icon: typeof Inbox; accent: string }> = [
    { key: "", label: "All content", count: totalVideos, icon: LayoutGrid, accent: "text-zinc-300" },
    { key: "unfiled", label: "Unfiled", count: unfiledCount, icon: Inbox, accent: unfiledCount > 0 ? "text-amber-300" : "text-zinc-500" },
    { key: "drafts", label: "Drafts", count: draftsCount, icon: PencilLine, accent: draftsCount > 0 ? "text-sky-300" : "text-zinc-500" },
    { key: "watched", label: "Most watched", count: watchedCount || null, icon: Flame, accent: "text-orange-300" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {tiles.map((tile) => {
        const isActive = active === tile.key;
        return (
          <button
            key={tile.key || "all"}
            type="button"
            onClick={() => onSelect(tile.key)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
              isActive
                ? "border-white bg-white text-black"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
            }`}
          >
            <tile.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "" : tile.accent}`} strokeWidth={1.75} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{tile.label}</span>
              <span className={`block text-xs ${isActive ? "opacity-70" : "text-zinc-500"}`}>
                {tile.count === null ? "90-day leaders" : `${tile.count} ${tile.count === 1 ? "video" : "videos"}`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
