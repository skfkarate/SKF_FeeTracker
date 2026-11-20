import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";

export type StatTone = "neutral" | "action" | "settled" | "overdue" | "partial" | "brand";

const TONE_COLOR: Record<StatTone, string> = {
  neutral: "var(--text-2)",
  action: "var(--text)",
  settled: "var(--status-paid-text)",
  overdue: "var(--status-overdue-text)",
  partial: "var(--status-partial-text)",
  brand: "var(--accent-text)",
};

const GRADIENT_TONES = new Set<StatTone>(["settled", "brand"]);

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
  const valueStyle: CSSProperties = GRADIENT_TONES.has(tone) ? {} : { color: tint };

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
        style={valueStyle}
        className={cx(
          "display-number mt-auto break-words pt-[12px]",
          GRADIENT_TONES.has(tone) ? "amount-gradient" : "",
          size === "lg"
            ? "text-[36px] leading-[40px]"
            : "text-[24px] leading-[30px]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-[8px] text-xs leading-relaxed text-[color:var(--color-text-faint)]">{hint}</p> : null}
    </div>
  );
}
