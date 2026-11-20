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
    <>
      {spine}
      <div className="min-w-0 flex-1 pl-3">
        <p className="truncate text-[15px] font-semibold text-white">{title}</p>
        {subtitle ? <p className="truncate text-[13px] text-zinc-400">{subtitle}</p> : null}
        {idLabel ? <p className="font-mono tnum truncate text-[11px] text-zinc-500">{idLabel}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {amount ? (
          <div className="text-right">
            <p className="font-pixel text-[20px] leading-none text-white">{amount}</p>
            {amountLabel ? <p className="mt-1 font-pixel-label text-zinc-500">{amountLabel}</p> : null}
          </div>
        ) : null}
        {trailing}
      </div>
    </>
  );

  const sharedClassName = cx(
    "hud-row relative flex w-full items-center gap-3 py-3 pr-3 text-left",
    className,
  );
  const style: CSSProperties = { animationDelay: `${index * 20}ms` };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(sharedClassName, "tap-target transition-colors hover:bg-[#141414] active:scale-[0.995]")}
        style={style}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={sharedClassName} style={style}>
      {body}
    </div>
  );
}