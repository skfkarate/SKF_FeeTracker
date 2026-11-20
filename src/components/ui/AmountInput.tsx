import { cx } from "@/lib/cx";

export default function AmountInput({
  value,
  onChange,
  label,
  hint,
  invalid = false,
  disabled = false,
  placeholder = "0",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cx("block min-w-0", className)}>
      {label ? (
        <span className="mb-2 block font-pixel-label text-[color:var(--color-text-faint)]">{label}</span>
      ) : null}
      <span
        className={cx(
          "flex min-h-[56px] items-center gap-2 rounded-[var(--radius-row)] border bg-[color:var(--color-panel)] px-3",
          invalid ? "border-[color:var(--color-overdue)]" : "border-[color:var(--color-hairline)]",
        )}
      >
        <span aria-hidden="true" className="font-pixel text-sm text-[color:var(--color-text-faint)]">
          Rs.
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="font-pixel w-full min-w-0 bg-transparent py-3 text-right text-[clamp(1.25rem,1.1rem+0.6vw,1.65rem)] text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)]/60"
        />
      </span>
      {hint ? <span className="mt-2 block text-[13px] text-[color:var(--color-text-faint)]">{hint}</span> : null}
    </label>
  );
}
