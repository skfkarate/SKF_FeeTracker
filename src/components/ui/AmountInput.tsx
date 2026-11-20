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
        <span className="mb-2 block eyebrow text-[color:var(--color-text-faint)]">{label}</span>
      ) : null}
      <span
        className={cx(
          "aurora-well flex min-h-[60px] items-center gap-3 px-4 transition-colors",
          invalid
            ? "border-[color:var(--color-overdue-border)]"
            : "focus-within:border-[color:var(--color-accent-border)]",
        )}
      >
        <span aria-hidden="true" className="numeric text-sm text-[color:var(--color-text-faint)]">
          ₹
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className="numeric w-full min-w-0 bg-transparent py-3 text-right text-[clamp(1.35rem,1.2rem+0.6vw,1.75rem)] text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)] disabled:opacity-60"
        />
      </span>
      {hint ? <span className="mt-2 block text-[13px] leading-relaxed text-[color:var(--color-text-faint)]">{hint}</span> : null}
    </label>
  );
}
