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
      <aside className="glass-modal !max-w-xl max-h-[90vh] overflow-y-auto p-[16px] sm:p-[20px]">
        <div className="mb-[20px] flex items-start justify-between gap-[12px]">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-text-dim)]">{draft.id ? "Edit" : "New"}</p>
            <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{draft.id ? "Update Folder" : "Create Practice Folder"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[color:var(--color-hairline)] text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]">
            <X className="h-[16px] w-[16px]" />
          </button>
        </div>

        <div className="space-y-[16px]">
          {error ? (
            <div className="flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[12px] text-sm text-[color:var(--color-text)]">
              <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <input value={draft.title || ""} onChange={(event) => onChange({ title: event.target.value })} className="input-minimal" placeholder="Folder name, e.g. Yellow Belt Syllabus" />
          <textarea value={draft.description || ""} onChange={(event) => onChange({ description: event.target.value })} className="input-minimal min-h-[96px] resize-none" placeholder="What should students practise in this folder?" />

          <div>
            <label className="mb-[8px] block text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-dim)]">Inside folder (optional)</label>
            <button
              type="button"
              onClick={() => onChange({ parentFolderId: "" })}
              className={`mb-[6px] flex min-h-[44px] w-full items-center rounded-xl border px-[12px] text-left text-sm font-semibold ${
                !draft.parentFolderId ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)] hover:border-[color:var(--color-hairline)]"
              }`}
            >
              Top-level practice folder
            </button>
            <div className="rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[6px]">
              <FolderTreePicker
                folders={folders}
                parentId={null}
                depth={0}
                selection={draft.parentFolderId || null}
                onSelect={(folderId) => folderId !== null && onChange({ parentFolderId: folderId })}
                disabledIds={draft.id ? invalidParentIds : undefined}
                disabledReason="Cannot nest a folder inside itself or its subfolders"
              />
              {folders.length === 0 ? <p className="px-[12px] py-[16px] text-center text-xs text-[color:var(--color-text-faint)]">No other folders yet.</p> : null}
            </div>
            <p className="mt-[4px] text-xs leading-relaxed text-[color:var(--color-text-faint)]">Use this to build syllabus paths such as Kumite → Techniques. Keep it empty for a main library folder.</p>
          </div>

          <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-dim)]">Shelves do not gate access</p>
            <p className="mt-[4px] text-xs leading-relaxed text-[color:var(--color-text-dim)]">Folders only organise the library and set the pre-order of the athlete portal. Who can see content is decided on each video audience (belts, branches, batches), never on the folder itself.</p>
          </div>

          <div className="grid gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
            <label className="flex items-center justify-between text-sm text-[color:var(--color-text-dim)]">
              <span>Published</span>
              <input type="checkbox" checked={draft.isPublished !== false} onChange={(event) => onChange({ isPublished: event.target.checked })} className="h-[16px] w-[16px] accent-[color:var(--color-accent)]" />
            </label>
          </div>

          <input type="number" value={draft.sortOrder || 0} onChange={(event) => onChange({ sortOrder: Number(event.target.value || 0) })} className="input-minimal" placeholder="Sort order" />

          <button type="button" onClick={onSubmit} disabled={saving} className="btn-primary flex min-h-[44px] w-full items-center justify-center gap-[8px]">
            {saving ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <Save className="h-[16px] w-[16px]" />}
            {draft.id ? "Save Folder" : "Create Folder"}
          </button>
        </div>
      </aside>
    </div>
  );
}
