"use client";

import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div
      className="animate-page-in"
      style={{
        animation: "page-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {children}
      <style>{`
        @keyframes page-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
