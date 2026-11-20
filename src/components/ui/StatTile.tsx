import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type StatTone = "neutral" | "action" | "settled" | "overdue" | "brand";

const TONE_COLOR: Record<StatTone, string> = {
  neutral: "var(--color-text-dim)",
  action: "var(--color-accent)",
  settled: "var(--color-paid)",
  overdue: "var(--color-overdue)",
  brand: "var(--color-accent)",
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
    <div className={cx("hud-panel flex min-w-[0px] flex-col p-[20px]", className)}>
      <div className="flex min-w-[0px] items-center gap-[8px] eyebrow text-[color:var(--color-text-faint)]">
        {icon ? (
          <span style={iconStyle} className="flex shrink-0 items-center">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cx(
          "numeric mt-auto break-words pt-[12px] text-[color:var(--color-text)]",
          size === "lg"
            ? "text-[clamp(1.7rem,1.4rem+1vw,2.2rem)]"
            : "text-[clamp(1.2rem,1.08rem+0.5vw,1.55rem)]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-[8px] text-xs leading-relaxed text-[color:var(--color-text-faint)]">{hint}</p> : null}
    </div>
  );
}
