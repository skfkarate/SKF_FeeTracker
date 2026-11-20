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
      className={cx(
        "flex items-center gap-1 overflow-x-auto rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-1",
        className,
      )}
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
              "tap-target min-w-max flex-1 rounded-[var(--radius-pill)] px-3.5 text-xs font-semibold transition-colors",
              active
                ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] shadow-[0_6px_18px_rgba(74,224,189,0.18)]"
                : "text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
