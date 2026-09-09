"use client";

import { AlertCircle, Loader2, Save, X } from "lucide-react";
import type { PracticeFolderInput } from "@/lib/api";
import { FolderTreePicker } from "./MoveToSheet";

export function emptyFolderDraft(): PracticeFolderInput {
  return { title: "", description: "", branchSlugs: [], batchNames: [], beltLevels: [], isFeatured: false, isPublished: true, sortOrder: 0 };
}

export function FolderEditorSheet({
  draft,
  folders,
  saving,
  error,
  invalidParentIds,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: PracticeFolderInput;
  folders: Parameters<typeof FolderTreePicker>[0]["folders"];
  saving: boolean;
  error: string;
  invalidParentIds: Set<string>;
  onChange: (patch: Partial<PracticeFolderInput>) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="glass-modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <aside className="glass-modal !max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">{draft.id ? "Edit" : "New"}</p>
            <h2 className="text-lg font-semibold text-white">{draft.id ? "Update Folder" : "Create Practice Folder"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <input value={draft.title || ""} onChange={(event) => onChange({ title: event.target.value })} className="input-minimal" placeholder="Folder name, e.g. Yellow Belt Syllabus" />
          <textarea value={draft.description || ""} onChange={(event) => onChange({ description: event.target.value })} className="input-minimal min-h-24 resize-none" placeholder="What should students practise in this folder?" />

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Inside folder (optional)</label>
            <button
              type="button"
              onClick={() => onChange({ parentFolderId: "" })}
              className={`mb-1.5 flex min-h-11 w-full items-center rounded-xl border px-3 text-left text-sm font-semibold ${
                !draft.parentFolderId ? "border-white bg-white text-black" : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              Top-level practice folder
            </button>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-1.5">
              <FolderTreePicker
                folders={folders}
                parentId={null}
                depth={0}
                selection={draft.parentFolderId || null}
                onSelect={(folderId) => folderId !== null && onChange({ parentFolderId: folderId })}
                disabledIds={draft.id ? invalidParentIds : undefined}
                disabledReason="Cannot nest a folder inside itself or its subfolders"
              />
              {folders.length === 0 ? <p className="px-3 py-4 text-center text-xs text-zinc-600">No other folders yet.</p> : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">Use this to build syllabus paths such as Kumite → Techniques. Keep it empty for a main library folder.</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Shelves do not gate access</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Folders only organise the library and set the pre-order of the athlete portal. Who can see content is decided on each video audience (belts, branches, batches), never on the folder itself.</p>
          </div>

          <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <label className="flex items-center justify-between text-sm text-zinc-400">
              <span>Published</span>
              <input type="checkbox" checked={draft.isPublished !== false} onChange={(event) => onChange({ isPublished: event.target.checked })} className="h-4 w-4 accent-white" />
            </label>
          </div>

          <input type="number" value={draft.sortOrder || 0} onChange={(event) => onChange({ sortOrder: Number(event.target.value || 0) })} className="input-minimal" placeholder="Sort order" />

          <button type="button" onClick={onSubmit} disabled={saving} className="btn-primary flex min-h-11 w-full items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft.id ? "Save Folder" : "Create Folder"}
          </button>
        </div>
      </aside>
    </div>
  );
}
