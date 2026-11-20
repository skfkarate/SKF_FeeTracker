"use client";

import { Image as ImageIcon } from "lucide-react";
import type { PracticePhoto } from "@/lib/api";
import { practicePhotoUrl } from "@/lib/media-url";
import { useLongPress } from "./use-long-press";

export function PhotoGuideCard({
  photo,
  onContext,
}: {
  photo: PracticePhoto;
  onContext: (x: number, y: number) => void;
}) {
  const longPress = useLongPress(onContext);
  const src = practicePhotoUrl(photo.storagePath);

  return (
    <button
      type="button"
      onClick={() => window.open(src, "_blank")}
      onContextMenu={(event) => { event.preventDefault(); onContext(event.clientX, event.clientY); }}
      {...longPress}
      className="group relative overflow-hidden rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] transition-colors hover:border-[color:var(--color-hairline)] active:scale-[0.98]"
    >
      <div className="aspect-square bg-[color:var(--color-well)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={photo.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><ImageIcon className="h-[24px] w-[24px] text-[color:var(--color-text-faint)]" /></div>
        )}
      </div>
      <div className="absolute inset-x-[0px] bottom-[0px] bg-gradient-to-t from-[color:var(--color-panel)] via-[color:var(--color-panel)] to-transparent px-[8px] pb-[6px] pt-[24px]">
        <p className="truncate text-xs font-semibold text-[color:var(--color-text)]">{photo.title}</p>
        <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-text-dim)]">{photo.isPublished ? "Live" : "Draft"} guide</p>
      </div>
    </button>
  );
}
