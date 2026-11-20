"use client";

import { useState } from "react";
import { BadgeCheck, CalendarCheck, Clock, Package, ShieldCheck, UserPlus, Wallet } from "lucide-react";

import LedgerRow from "@/components/ui/LedgerRow";
import MeterRing from "@/components/ui/MeterRing";
import PageShell from "@/components/ui/PageShell";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";

type QueueItem = {
  key: string;
  title: string;
  subtitle: string;
  idLabel: string;
  status: LedgerStatus;
  statusText: string;
  amount: string;
  icon: typeof Clock;
};

const QUEUE: QueueItem[] = [
  {
    key: "proof-1",
    title: "Payment proof",
    subtitle: "Rahul Kumar · UPI · 4 min ago",
    idLabel: "SKF21HE003 · OCT 2026",
    status: "verifying",
    statusText: "Verify",
    amount: "2,000",
    icon: ShieldCheck,
  },
  {
    key: "admission-1",
    title: "New admission",
    subtitle: "Ananya Rao · awaits branch approval",
    idLabel: "APP-1042 · TODAY",
    status: "due",
    statusText: "Review",
    amount: "—",
    icon: UserPlus,
  },
  {
    key: "shop-1",
    title: "Shop order",
    subtitle: "Dojo gi · M P Sports Club",
    idLabel: "ORD-221 · 18 MIN AGO",
    status: "due",
    statusText: "Pack",
    amount: "1,450",
    icon: Package,
  },
  {
    key: "callback-1",
    title: "Callback",
    subtitle: "Parent asked about October dues",
    idLabel: "Kiran S · 2 HRS AGO",
    status: "overdue",
    statusText: "Call",
    amount: "—",
    icon: Clock,
  },
];

export default function TodayPreviewPage() {
  const [active, setActive] = useState<QueueItem | null>(null);

  return (
    <>
      <PageShell
        hud={{
          title: "Today",
          monthLabel: "Oct 2026",
          backHref: "/dashboard",
          bell: <span className="font-mono text-[11px] text-[color:var(--color-text-dim)]">12</span>,
        }}
        mainClassName="py-[24px]"
      >
        <section className="hud-panel p-[16px]">
          <div className="flex items-center justify-between gap-[16px]">
            <div>
              <p className="eyebrow text-[color:var(--color-text-dim)]">Needs action</p>
              <p className="numeric mt-[8px] text-[40px] leading-none text-[color:var(--color-text)]">12</p>
              <p className="mt-[8px] text-xs text-[color:var(--color-text-dim)]">4 payment proofs · 3 admissions · 5 orders</p>
            </div>
            <MeterRing value={68} caption="collection rate" tone="action" />
          </div>
        </section>

        <div className="mt-[12px] grid grid-cols-2 gap-[12px] sm:grid-cols-4">
          <StatTile label="Collected" value="1,24,000" tone="settled" icon={<Wallet className="h-[16px] w-[16px]" />} />
          <StatTile label="Overdue" value="8" tone="overdue" icon={<Clock className="h-[16px] w-[16px]" />} />
          <StatTile label="Streak" value="3 months" tone="action" icon={<BadgeCheck className="h-[16px] w-[16px]" />} />
          <StatTile label="Events" value="2" icon={<CalendarCheck className="h-[16px] w-[16px]" />} />
        </div>

        <div className="mt-[24px] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">Run list</h2>
          <span className="eyebrow text-[color:var(--color-text-dim)]">Urgency first</span>
        </div>

        <div className="mt-[12px] space-y-[8px]">
          {QUEUE.map((item, index) => {
            const Icon = item.icon;
            return (
              <LedgerRow
                key={item.key}
                index={index}
                status={item.status}
                title={item.title}
                subtitle={item.subtitle}
                idLabel={item.idLabel}
                amount={
                  <span className={item.status === "overdue" ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text)]"}>
                    {item.amount}
                  </span>
                }
                trailing={
                  <div className="flex items-center gap-[8px]">
                    <Icon className="h-[16px] w-[16px] text-[color:var(--color-text-dim)]" aria-hidden="true" />
                    <StatusPill status={item.status} label={item.statusText} />
                  </div>
                }
                onClick={() => setActive(item)}
              />
            );
          })}
        </div>
      </PageShell>

      <Sheet
        open={Boolean(active)}
        title={active?.title ?? "Queue item"}
        onClose={() => setActive(null)}
      >
        <div className="space-y-[16px] pt-[4px]">
          <p className="numeric text-[28px] leading-none text-[color:var(--color-text)]">{active?.amount ?? "—"}</p>
          <p className="text-[13px] text-[color:var(--color-text-dim)]">{active?.subtitle}</p>
          <p className="font-mono text-[11px] text-[color:var(--color-text-dim)]">{active?.idLabel}</p>
          <button
            type="button"
            className="tap-target w-full rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)]"
            onClick={() => setActive(null)}
          >
            Resolve
          </button>
        </div>
      </Sheet>
    </>
  );
}
