import { cx } from "@/lib/cx";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx("flex items-center gap-1 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "tap-target flex-1 rounded-[var(--radius-pill)] px-3 font-pixel-label transition-colors",
              active ? "bg-white text-black" : "text-zinc-400 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}