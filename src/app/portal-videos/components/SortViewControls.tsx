"use client";

import { ArrowUpDown, LayoutGrid, List } from "lucide-react";
import type { SortMode, ViewMode } from "./library-shared";

const SORT_LABELS: Record<SortMode, string> = {
  auto: "Belt / custom order",
  name: "Name A–Z",
  newest: "Newest first",
};

export function SortViewControls({
  view,
  sort,
  onViewChange,
  onSortChange,
}: {
  view: ViewMode;
  sort: SortMode;
  onViewChange: (view: ViewMode) => void;
  onSortChange: (sort: SortMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative inline-flex items-center">
        <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[color:var(--color-text-faint)]" />
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortMode)}
          className="input-minimal min-h-10 !w-auto appearance-none py-0 pl-9 pr-8 text-xs font-semibold capitalize"
          aria-label="Sort content"
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>
          ))}
        </select>
      </label>
      <div className="flex rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-0.5" role="group" aria-label="View mode">
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewChange("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
