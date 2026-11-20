import { cx } from "@/lib/cx";

export default function MeterRing({
  value,
  size = 72,
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
  tone?: "action" | "settled" | "overdue" | "brand";
  caption?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    tone === "settled"
      ? "var(--color-settled)"
      : tone === "overdue"
        ? "var(--color-overdue)"
        : tone === "brand"
          ? "var(--color-brand)"
          : "var(--color-action)";

  return (
    <div className={cx("flex items-center gap-3", className)}>
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
          fill="none"
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
          fill="#ffffff"
          className="font-pixel"
          style={{ fontSize: size / 4 }}
        >
          {clamped}
        </text>
      </svg>
      {caption ? <p className="font-pixel-label text-zinc-400">{caption}</p> : null}
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
  tone?: "action" | "settled" | "overdue" | "brand";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    tone === "settled"
      ? "var(--color-settled)"
      : tone === "overdue"
        ? "var(--color-overdue)"
        : tone === "brand"
          ? "var(--color-brand)"
          : "var(--color-action)";

  return (
    <div
      className={cx("h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[#141414]", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "progress"}
    >
      <div className="h-full rounded-[var(--radius-pill)]" style={{ width: `${clamped}%`, backgroundColor: color }} />
    </div>
  );
}