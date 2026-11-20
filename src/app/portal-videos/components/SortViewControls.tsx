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
    <div className="flex min-w-[0px] flex-wrap items-center gap-[8px]">
      <label className="relative inline-flex min-w-[0px] max-w-full items-center">
        <ArrowUpDown className="pointer-events-none absolute left-[12px] h-[14px] w-[14px] text-[color:var(--color-text-faint)]" />
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortMode)}
          className="input-minimal min-h-[44px] min-w-[0px] max-w-full appearance-none py-[0px] pl-[36px] pr-[32px] text-xs font-semibold capitalize sm:!w-auto"
          aria-label="Sort content"
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>
          ))}
        </select>
      </label>
      <div className="flex rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[2px]" role="group" aria-label="View mode">
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={`flex h-[44px] w-[44px] items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
        >
          <LayoutGrid className="h-[16px] w-[16px]" />
        </button>
        <button
          type="button"
          onClick={() => onViewChange("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={`flex h-[44px] w-[44px] items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"}`}
        >
          <List className="h-[16px] w-[16px]" />
        </button>
      </div>
    </div>
  );
}
