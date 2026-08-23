"use client";

import { ChevronRight, MoreHorizontal, Smartphone, MonitorPlay } from "lucide-react";
import type { PortalVideo } from "@/lib/api";
import { thumbnailUrl } from "./library-shared";
import { useLongPress } from "./use-long-press";

export function VideoCard({
  video,
  variant,
  dragging,
  pathLabel,
  onOpen,
  onContext,
  onDragStart,
  onDragEnd,
}: {
  video: PortalVideo;
  variant: "grid" | "list";
  dragging?: boolean;
  pathLabel?: string;
  onOpen: () => void;
  onContext: (x: number, y: number) => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const longPress = useLongPress(onContext);

  if (variant === "list") {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 transition-colors hover:border-zinc-700 ${dragging ? "opacity-40" : ""}`}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        onContextMenu={(event) => { event.preventDefault(); onContext(event.clientX, event.clientY); }}
        {...longPress}
      >
        <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl(video.youtubeId)} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{video.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-500">
            <StatusDot published={video.isPublished} />
            {pathLabel ? <span className="truncate text-cyan-300/70">{pathLabel} · </span> : null}
            {video.category}{video.durationLabel ? ` · ${video.durationLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="More actions"
          onClick={(event) => {
            event.stopPropagation();
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            onContext(rect.left, rect.bottom);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-900 hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-700" />
      </div>
    );
  }

  return (
    <div
      className={`group cursor-pointer select-none rounded-2xl border border-zinc-800 bg-zinc-950 p-2 transition-all hover:border-zinc-600 active:scale-[0.98] ${dragging ? "opacity-40" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onContextMenu={(event) => { event.preventDefault(); onContext(event.clientX, event.clientY); }}
      {...longPress}
    >
      <div className={`relative overflow-hidden rounded-xl bg-black ${video.contentFormat === "short" ? "aspect-[3/4]" : "aspect-video"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnailUrl(video.youtubeId)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white">
          {video.contentFormat === "short" ? <Smartphone className="h-3 w-3" /> : <MonitorPlay className="h-3 w-3" />}
        </span>
        {video.durationLabel ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">{video.durationLabel}</span>
        ) : null}
        <span
          role="button"
          aria-label="More actions"
          onClick={(event) => {
            event.stopPropagation();
            onContext(event.clientX, event.clientY);
          }}
          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-zinc-300 opacity-0 transition-opacity hover:bg-black/90 hover:text-white group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </span>
      </div>
      <div className="px-1 pb-1 pt-2">
        <p className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-tight text-white">{video.title}</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-zinc-500">
          <StatusDot published={video.isPublished} />
          {video.category}
        </p>
      </div>
    </div>
  );
}

export function StatusDot({ published }: { published: boolean }) {
  return (
    <span
      title={published ? "Live" : "Draft"}
      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${published ? "bg-emerald-400" : "bg-amber-400"}`}
    />
  );
}
