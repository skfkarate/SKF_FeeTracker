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
    <label className={cx("block", className)}>
      {label ? <span className="mb-2 block font-pixel-label text-zinc-400">{label}</span> : null}
      <span
        className={cx(
          "flex items-center gap-2 rounded-[var(--radius-row)] border bg-[#121214] px-3 py-3",
          invalid ? "border-[color:var(--color-overdue)]" : "border-[color:var(--color-hairline)]",
        )}
      >
        <span aria-hidden="true" className="font-pixel text-[18px] text-zinc-500">
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
          className="font-pixel w-full bg-transparent text-right text-[24px] leading-none text-white outline-none placeholder:text-zinc-700"
        />
      </span>
      {hint ? <span className="mt-2 block text-[13px] text-zinc-500">{hint}</span> : null}
    </label>
  );
}