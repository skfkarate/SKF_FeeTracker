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
    <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Folder path">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const isDropTarget = dropTargetId != null && (crumb.id ? dropTargetId === crumb.id : dropTargetId === "__root__");
        return (
          <span key={crumb.id || "root"} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-zinc-700" /> : null}
            <button
              type="button"
              onClick={() => onNavigate(crumb.id)}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => onDragEnterNode?.(crumb.id)}
              onDrop={(event) => onDropOnNode?.(event, crumb.id)}
              className={`max-w-44 truncate rounded-md px-2 py-1 font-semibold transition-colors ${
                isLast
                  ? "text-white"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              } ${isDropTarget ? "ring-2 ring-cyan-400/70 bg-cyan-500/10 text-cyan-100" : ""}`}
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
