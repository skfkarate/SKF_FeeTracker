import { useId } from "react";

import { cx } from "@/lib/cx";

type MeterTone = "action" | "settled" | "overdue" | "partial" | "brand";

const TONE_COLOR: Record<MeterTone, string> = {
  action: "var(--accent)",
  settled: "var(--status-paid-solid)",
  overdue: "var(--status-overdue-solid)",
  partial: "var(--status-partial-solid)",
  brand: "var(--accent)",
};

export default function MeterRing({
  value,
  size = 76,
  thickness = 6,
  label = "progress",
  tone = "action",
  caption,
  className,
}: {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  tone?: MeterTone;
  caption?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const gradientId = `aurora-ring-${useId().replace(/:/g, "")}`;
  const useGradient = tone === "action" || tone === "brand";
  const stroke = useGradient ? `url(#${gradientId})` : TONE_COLOR[tone];

  return (
    <div className={cx("flex min-w-[0px] flex-wrap items-center gap-[14px]", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${clamped}%`}
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="var(--chart-track)"
          stroke="var(--chart-track)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="var(--text)"
          className="font-display"
          style={{ fontSize: size / 4 }}
        >
          {clamped}
        </text>
      </svg>
      {caption ? <p className="min-w-[0px] flex-1 basis-[110px] break-words text-[13px] leading-[20px] text-[color:var(--text-3)]">{caption}</p> : null}
    </div>
  );
}

export function MeterBar({
  value,
  label,
  tone = "action",
  className,
}: {
  value: number;
  label?: string;
  tone?: MeterTone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const useGradient = tone === "action" || tone === "brand";
  const fill = useGradient ? "var(--chart-current)" : TONE_COLOR[tone];

  return (
    <div
      className={cx("h-[8px] w-full overflow-hidden rounded-[var(--radius-pill)] bg-[color:var(--chart-track)]", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "progress"}
    >
      <div
        className="h-full rounded-[var(--radius-pill)]"
        style={{ width: `${clamped}%`, background: fill, transition: "width 220ms cubic-bezier(0.075, 0.82, 0.165, 1)" }}
      />
    </div>
  );
}
