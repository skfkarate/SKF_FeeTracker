"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContextMenuItem } from "./library-shared";

type MenuState = { x: number; y: number; title: string; subtitle?: string; items: ContextMenuItem[] } | null;

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState>(null);
  const open = useCallback((x: number, y: number, title: string, items: ContextMenuItem[], subtitle?: string) => {
    setMenu({ x, y, title, subtitle, items });
  }, []);
  const close = useCallback(() => setMenu(null), []);
  return { menu, open, close };
}

export function ContextMenuSurface({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const isCoarse = useMemo(() => (menu ? window.matchMedia("(pointer: coarse)").matches : true), [menu]);

  useEffect(() => {
    if (!menu) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menu, onClose]);

  if (!menu) return null;

  const width = 240;
  const left = isCoarse ? 0 : Math.min(Math.max(menu.x - width / 2, 12), window.innerWidth - width - 12);
  const top = Math.min(menu.y + 8, window.innerHeight - menu.items.length * 46 - 80);

  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose} onContextMenu={(event) => { event.preventDefault(); onClose(); }}>
      {isCoarse ? (
        <div
          className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-2xl border-t border-zinc-800 bg-zinc-950/95 p-3 pb-6 shadow-2xl shadow-black/60 backdrop-blur-xl"
          onClick={(event) => event.stopPropagation()}
          style={{ left: 0, right: 0 }}
        >
          <div className="mb-2 px-2 pt-1 text-center">
            <p className="truncate text-sm font-semibold text-white">{menu.title}</p>
            {menu.subtitle ? <p className="truncate text-xs text-zinc-500">{menu.subtitle}</p> : null}
          </div>
          <div className="grid gap-1">
            {menu.items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { onClose(); item.onSelect(); }}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold ${
                  item.destructive ? "text-red-400 hover:bg-red-500/10" : "text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {item.icon ? <item.icon className="h-4 w-4" /> : null}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="absolute overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/95 py-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
          style={{ left, top, width }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-zinc-800 px-3 py-2">
            <p className="truncate text-xs font-semibold text-white">{menu.title}</p>
            {menu.subtitle ? <p className="truncate text-[11px] text-zinc-500">{menu.subtitle}</p> : null}
          </div>
          {menu.items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { onClose(); item.onSelect(); }}
              className={`flex min-h-9 w-full items-center gap-2.5 px-3 text-left text-[13px] font-medium ${
                item.destructive ? "text-red-400 hover:bg-red-500/10" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {item.icon ? <item.icon className="h-3.5 w-3.5" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
