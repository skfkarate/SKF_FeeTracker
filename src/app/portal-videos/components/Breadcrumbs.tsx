"use client";

import { ChevronRight } from "lucide-react";
import type { PracticeFolder } from "@/lib/api";

export function Breadcrumbs({
  chain,
  onNavigate,
  dropTargetId,
  onDragEnterNode,
  onDropOnNode,
}: {
  chain: PracticeFolder[];
  onNavigate: (folderId: string | null) => void;
  dropTargetId?: string | null;
  onDragEnterNode?: (folderId: string | null) => void;
  onDropOnNode?: (event: React.DragEvent, folderId: string | null) => void;
}) {
  const crumbs: Array<{ id: string | null; label: string }> = [
    { id: null, label: "Library" },
    ...chain.map((folder) => ({ id: folder.id, label: folder.title })),
  ];

  return (
    <nav className="flex flex-wrap items-center gap-[4px] text-sm" aria-label="Folder path">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const isDropTarget = dropTargetId != null && (crumb.id ? dropTargetId === crumb.id : dropTargetId === "__root__");
        return (
          <span key={crumb.id || "root"} className="flex items-center gap-[4px]">
            {index > 0 ? <ChevronRight className="h-[14px] w-[14px] text-[color:var(--color-text-faint)]" /> : null}
            <button
              type="button"
              onClick={() => onNavigate(crumb.id)}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => onDragEnterNode?.(crumb.id)}
              onDrop={(event) => onDropOnNode?.(event, crumb.id)}
              className={`max-w-[176px] truncate rounded-md px-[8px] py-[4px] font-semibold transition-colors ${
                isLast
                  ? "text-[color:var(--color-text)]"
                  : "text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] hover:text-[color:var(--color-text)]"
              } ${isDropTarget ? "ring-2 ring-[color:var(--color-accent)] bg-[color:var(--color-well)] text-[color:var(--color-text)]" : ""}`}
              title={crumb.label}
            >
              {crumb.label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
