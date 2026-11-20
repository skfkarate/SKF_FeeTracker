"use client";

import { useState } from "react";
import { Check, ChevronRight, Folder, FolderInput, X } from "lucide-react";
import type { PracticeFolder } from "@/lib/api";
import { childrenOf } from "./tree-utils";

export function MoveToSheet({
  title,
  currentLabel,
  currentFolderId,
  folders,
  busy,
  onClose,
  onMove,
}: {
  title: string;
  currentLabel?: string;
  currentFolderId: string | null;
  folders: PracticeFolder[];
  busy?: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => void;
}) {
  const [selection, setSelection] = useState<string | null>(currentFolderId);

  return (
    <div className="glass-modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="glass-modal !max-w-md max-h-[80vh] overflow-y-auto p-[16px] sm:p-[20px]">
        <div className="mb-[16px] flex items-start justify-between gap-[12px]">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-text-dim)]">Move item</p>
            <h2 className="mt-[2px] truncate text-base font-semibold text-[color:var(--color-text)]">{title}</h2>
            {currentLabel ? <p className="mt-[2px] text-xs text-[color:var(--color-text-dim)]">Currently in: {currentLabel}</p> : null}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]">
            <X className="h-[16px] w-[16px]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSelection(null)}
          className={`mb-[8px] flex min-h-[44px] w-full items-center gap-[12px] rounded-xl border px-[12px] text-left text-sm font-semibold ${
            selection === null ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)]"
          }`}
        >
          <FolderInput className="h-[16px] w-[16px]" />
          <span className="flex-1">Unfiled — top level of library</span>
          {selection === null ? <Check className="h-[16px] w-[16px]" /> : null}
        </button>

        <div className="rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[6px]">
          <FolderTreePicker folders={folders} parentId={null} depth={0} selection={selection} onSelect={setSelection} />
          {folders.length === 0 ? <p className="px-[12px] py-[16px] text-center text-xs text-[color:var(--color-text-faint)]">No folders yet.</p> : null}
        </div>

        <button
          type="button"
          disabled={busy || selection === currentFolderId}
          onClick={() => onMove(selection)}
          className="btn-primary mt-[16px] flex min-h-[44px] w-full items-center justify-center gap-[8px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-[16px] w-[16px]" />
          {selection === currentFolderId ? "Already here" : "Move Here"}
        </button>
      </div>
    </div>
  );
}

export function FolderTreePicker({
  folders,
  parentId,
  depth,
  selection,
  onSelect,
  disabledIds,
  disabledReason,
}: {
  folders: PracticeFolder[];
  parentId: string | null;
  depth: number;
  selection: string | null;
  onSelect: (folderId: string | null) => void;
  disabledIds?: Set<string>;
  disabledReason?: string;
}) {
  const kids = childrenOf(folders, parentId);
  if (!kids.length) return null;
  return (
    <div>
      {kids.map((folder) => {
        const isDisabled = disabledIds?.has(folder.id);
        return (
          <div key={folder.id}>
            <button
              type="button"
              onClick={() => !isDisabled && onSelect(folder.id)}
              title={isDisabled ? disabledReason : undefined}
              style={{ paddingLeft: `${depth * 16 + 12}px` }}
              className={`flex min-h-[44px] w-full items-center gap-[8px] rounded-lg pr-[12px] text-left text-sm ${
                selection === folder.id
                  ? "bg-[color:var(--color-accent)] font-semibold text-[color:var(--color-accent-ink)]"
                  : isDisabled
                    ? "cursor-not-allowed text-[color:var(--color-text-faint)]"
                    : "text-[color:var(--color-text)] hover:bg-[color:var(--color-well)]"
              }`}
            >
              <Folder className="h-[16px] w-[16px] flex-shrink-0 opacity-70" />
              <span className="flex-1 truncate">{folder.title}</span>
              {!folder.isPublished ? <span className="text-[10px] font-bold uppercase text-[color:var(--color-text-dim)]">Draft</span> : null}
              {isDisabled ? <span className="text-[10px] uppercase tracking-wider opacity-60">inside</span> : null}
            </button>
            <FolderTreePicker folders={folders} parentId={folder.id} depth={depth + 1} selection={selection} onSelect={onSelect} disabledIds={disabledIds} disabledReason={disabledReason} />
          </div>
        );
      })}
    </div>
  );
}
