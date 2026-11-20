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
    <label className={cx("block min-w-[0px]", className)}>
      {label ? (
        <span className="mb-[8px] block eyebrow text-[color:var(--color-text-faint)]">{label}</span>
      ) : null}
      <span
        className={cx(
          "aurora-well flex min-h-[60px] items-center gap-[12px] px-[16px] transition-colors",
          invalid
            ? "border-[color:var(--color-hairline-strong)]"
            : "focus-within:border-[color:var(--color-accent-border)]",
        )}
      >
        <span aria-hidden="true" className="display-number text-sm text-[color:var(--color-text-faint)]">
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
          className="display-number min-h-[44px] w-full min-w-[0px] bg-transparent py-[12px] text-right text-[clamp(1.35rem,1.2rem+0.6vw,1.75rem)] text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)] disabled:opacity-60"
        />
      </span>
      {hint ? <span className="mt-[8px] block text-[13px] leading-relaxed text-[color:var(--color-text-faint)]">{hint}</span> : null}
    </label>
  );
}
