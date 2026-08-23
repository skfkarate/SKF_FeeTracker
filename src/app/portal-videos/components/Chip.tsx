"use client";

import type { ReactNode } from "react";

export function Chip({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${
        selected
          ? "border-white bg-white text-black"
          : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
