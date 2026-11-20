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
    { key: "", label: "All content", count: totalVideos, icon: LayoutGrid, accent: "text-[color:var(--color-text)]" },
    { key: "unfiled", label: "Unfiled", count: unfiledCount, icon: Inbox, accent: unfiledCount > 0 ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-dim)]" },
    { key: "drafts", label: "Drafts", count: draftsCount, icon: PencilLine, accent: draftsCount > 0 ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-dim)]" },
    { key: "watched", label: "Most watched", count: watchedCount || null, icon: Flame, accent: "text-[color:var(--color-accent)]" },
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
                ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
                : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
            }`}
          >
            <tile.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "" : tile.accent}`} strokeWidth={1.75} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{tile.label}</span>
              <span className={`block text-xs ${isActive ? "opacity-70" : "text-[color:var(--color-text-dim)]"}`}>
                {tile.count === null ? "90-day leaders" : `${tile.count} ${tile.count === 1 ? "video" : "videos"}`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
