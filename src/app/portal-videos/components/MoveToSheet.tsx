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
      <div className="glass-modal !max-w-md max-h-[80vh] overflow-y-auto p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Move item</p>
            <h2 className="mt-0.5 truncate text-base font-semibold text-white">{title}</h2>
            {currentLabel ? <p className="mt-0.5 text-xs text-zinc-500">Currently in: {currentLabel}</p> : null}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSelection(null)}
          className={`mb-2 flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold ${
            selection === null ? "border-white bg-white text-black" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          <FolderInput className="h-4 w-4" />
          <span className="flex-1">Unfiled — top level of library</span>
          {selection === null ? <Check className="h-4 w-4" /> : null}
        </button>

        <div className="rounded-xl border border-zinc-800 bg-black/40 p-1.5">
          <FolderTreePicker folders={folders} parentId={null} depth={0} selection={selection} onSelect={setSelection} />
          {folders.length === 0 ? <p className="px-3 py-4 text-center text-xs text-zinc-600">No folders yet.</p> : null}
        </div>

        <button
          type="button"
          disabled={busy || selection === currentFolderId}
          onClick={() => onMove(selection)}
          className="btn-primary mt-4 flex min-h-11 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
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
              className={`flex min-h-10 w-full items-center gap-2 rounded-lg pr-3 text-left text-sm ${
                selection === folder.id
                  ? "bg-white font-semibold text-black"
                  : isDisabled
                    ? "cursor-not-allowed text-zinc-700"
                    : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              <Folder className="h-4 w-4 flex-shrink-0 opacity-70" />
              <span className="flex-1 truncate">{folder.title}</span>
              {!folder.isPublished ? <span className="text-[10px] font-bold uppercase text-amber-400">Draft</span> : null}
              {isDisabled ? <span className="text-[10px] uppercase tracking-wider opacity-60">inside</span> : null}
            </button>
            <FolderTreePicker folders={folders} parentId={folder.id} depth={depth + 1} selection={selection} onSelect={onSelect} disabledIds={disabledIds} disabledReason={disabledReason} />
          </div>
        );
      })}
    </div>
  );
}
