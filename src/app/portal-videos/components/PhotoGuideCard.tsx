"use client";

import { Image as ImageIcon } from "lucide-react";
import type { PracticePhoto } from "@/lib/api";
import { normalizeKarateMediaUrl } from "@/lib/media-url";
import { useLongPress } from "./use-long-press";

export function PhotoGuideCard({
  photo,
  onContext,
}: {
  photo: PracticePhoto;
  onContext: (x: number, y: number) => void;
}) {
  const longPress = useLongPress(onContext);
  const src = normalizeKarateMediaUrl(photo.storagePath);

  return (
    <button
      type="button"
      onClick={() => window.open(src, "_blank")}
      onContextMenu={(event) => { event.preventDefault(); onContext(event.clientX, event.clientY); }}
      {...longPress}
      className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600 active:scale-[0.98]"
    >
      <div className="aspect-square bg-black">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={photo.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-zinc-700" /></div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 pb-1.5 pt-6">
        <p className="truncate text-xs font-semibold text-white">{photo.title}</p>
        <p className="text-[10px] uppercase tracking-wider text-zinc-400">{photo.isPublished ? "Live" : "Draft"} guide</p>
      </div>
    </button>
  );
}
