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
          bell: <span className="font-mono text-[11px] text-zinc-400">12</span>,
        }}
        mainClassName="py-6"
      >
        <section className="hud-panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-zinc-400">Needs action</p>
              <p className="numeric mt-2 text-[40px] leading-none text-white">12</p>
              <p className="mt-2 text-xs text-zinc-500">4 payment proofs · 3 admissions · 5 orders</p>
            </div>
            <MeterRing value={68} caption="collection rate" tone="settled" />
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Collected" value="1,24,000" tone="settled" icon={<Wallet className="h-4 w-4" />} />
          <StatTile label="Overdue" value="8" tone="overdue" icon={<Clock className="h-4 w-4" />} />
          <StatTile label="Streak" value="3 months" tone="action" icon={<BadgeCheck className="h-4 w-4" />} />
          <StatTile label="Events" value="2" icon={<CalendarCheck className="h-4 w-4" />} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Run list</h2>
          <span className="eyebrow text-zinc-500">Urgency first</span>
        </div>

        <div className="mt-3 space-y-2">
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
                  <span className={item.status === "overdue" ? "text-red-400" : "text-white"}>
                    {item.amount}
                  </span>
                }
                trailing={
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
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
        <div className="space-y-4 pt-1">
          <p className="numeric text-[28px] leading-none text-white">{active?.amount ?? "—"}</p>
          <p className="text-[13px] text-zinc-400">{active?.subtitle}</p>
          <p className="font-mono text-[11px] text-zinc-500">{active?.idLabel}</p>
          <button
            type="button"
            className="tap-target w-full rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-black"
            onClick={() => setActive(null)}
          >
            Resolve
          </button>
        </div>
      </Sheet>
    </>
  );
}
