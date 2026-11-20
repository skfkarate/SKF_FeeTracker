import { cx } from "@/lib/cx";

type MeterTone = "action" | "settled" | "overdue" | "brand";

const TONE_COLOR: Record<MeterTone, string> = {
  action: "var(--color-accent)",
  settled: "var(--color-paid)",
  overdue: "var(--color-overdue)",
  brand: "var(--color-accent)",
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
  const color = TONE_COLOR[tone];

  return (
    <div className={cx("flex items-center gap-3.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${clamped}%`}
        className="shrink-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="var(--color-well)"
          stroke="var(--color-hairline)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
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
          fill="var(--color-text)"
          className="font-mono"
          style={{ fontSize: size / 4 }}
        >
          {clamped}
        </text>
      </svg>
      {caption ? <p className="text-xs leading-snug text-[color:var(--color-text-faint)]">{caption}</p> : null}
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
  const color = TONE_COLOR[tone];

  return (
    <div
      className={cx("h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[color:var(--color-well)]", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "progress"}
    >
      <div
        className="h-full rounded-[var(--radius-pill)]"
        style={{
          width: `${clamped}%`,
          backgroundColor: color,
          transition: "width 220ms cubic-bezier(0.075, 0.82, 0.165, 1)",
        }}
      />
    </div>
  );
}
