import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/lib/cx";
import type { LedgerStatus } from "./StatusPill";
import { statusColor } from "./StatusPill";

export default function LedgerRow({
  status,
  title,
  subtitle,
  idLabel,
  amount,
  amountLabel,
  trailing,
  onClick,
  index = 0,
  className,
}: {
  status?: LedgerStatus;
  title: string;
  subtitle?: string;
  idLabel?: string;
  amount?: ReactNode;
  amountLabel?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  index?: number;
  className?: string;
}) {
  const spine = status ? (
    <span
      className="hud-spine"
      style={{ backgroundColor: statusColor(status) }}
      aria-hidden="true"
    />
  ) : null;

  const body = (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="min-w-0 flex-1 basis-[min(100%,200px)] pl-3.5">
        <p className="truncate text-[clamp(0.94rem,0.9rem+0.15vw,1rem)] font-semibold leading-snug text-[color:var(--color-text)]">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[13px] leading-snug text-[color:var(--color-text-dim)]">{subtitle}</p>
        ) : null}
        {idLabel ? (
          <p className="font-mono tnum mt-0.5 truncate text-[11px] leading-snug text-[color:var(--color-text-faint)]">
            {idLabel}
          </p>
        ) : null}
      </div>

      {amount || trailing ? (
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2.5 sm:gap-3">
          {amount ? (
            <div className="text-right">
              <p className="numeric text-[clamp(1.12rem,1rem+0.45vw,1.4rem)] text-[color:var(--color-text)]">
                {amount}
              </p>
              {amountLabel ? (
                <p className="eyebrow mt-1.5 text-[color:var(--color-text-faint)]">{amountLabel}</p>
              ) : null}
            </div>
          ) : null}
          {trailing}
        </div>
      ) : null}
    </div>
  );

  const sharedClassName = cx(
    "hud-row relative w-full py-3.5 pr-4 text-left",
    className,
  );
  const style: CSSProperties = { animationDelay: `${index * 18}ms` };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(sharedClassName, "tap-target transition-colors hover:bg-[color:var(--color-panel-strong)] active:scale-[0.995]")}
        style={style}
      >
        {spine}
        {body}
      </button>
    );
  }

  return (
    <div className={sharedClassName} style={style}>
      {spine}
      {body}
    </div>
  );
}
