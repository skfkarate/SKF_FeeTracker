import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type StatTone = "neutral" | "action" | "settled" | "overdue" | "brand";

const TONE_COLOR: Record<StatTone, string> = {
  neutral: "#a1a1aa",
  action: "var(--color-action)",
  settled: "var(--color-settled)",
  overdue: "var(--color-overdue)",
  brand: "var(--color-brand)",
};

export default function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  size = "sm",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  icon?: ReactNode;
  size?: "sm" | "lg";
  className?: string;
}) {
  const tint = TONE_COLOR[tone];
  const iconStyle: CSSProperties = { color: tint };

  return (
    <div className={cx("hud-panel p-4", className)}>
      <div className="flex items-center gap-2 font-pixel-label text-zinc-400">
        {icon ? <span style={iconStyle} className="flex items-center">{icon}</span> : null}
        {label}
      </div>
      <p
        className={cx(
          "font-pixel mt-3 leading-none text-white",
          size === "lg" ? "text-[32px]" : "text-[20px]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-zinc-500">{hint}</p> : null}
    </div>
  );
}