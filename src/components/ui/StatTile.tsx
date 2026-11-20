import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type StatTone = "neutral" | "action" | "settled" | "overdue" | "brand";

const TONE_COLOR: Record<StatTone, string> = {
  neutral: "var(--color-text-dim)",
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
    <div className={cx("hud-panel p-3.5 sm:p-4", className)}>
      <div className="flex items-center gap-2 eyebrow text-[color:var(--color-text-faint)]">
        {icon ? (
          <span style={iconStyle} className="flex items-center">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cx(
          "numeric mt-3 break-words text-[color:var(--color-text)]",
          size === "lg"
            ? "text-[clamp(1.6rem,1.35rem+1vw,2.15rem)]"
            : "text-[clamp(1.15rem,1.05rem+0.45vw,1.5rem)]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-text-faint)]">{hint}</p> : null}
    </div>
  );
}
