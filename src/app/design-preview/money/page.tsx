"use client";

import { useState } from "react";
import { ArrowDownRight, BadgeCheck, Clock, HandCoins, Wallet } from "lucide-react";

import LedgerRow from "@/components/ui/LedgerRow";
import MeterRing, { MeterBar } from "@/components/ui/MeterRing";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";

type Section = "overview" | "activity" | "fund";

const SECTIONS: SegmentOption<Section>[] = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "fund", label: "Fund" },
];

type ActivityRow = {
  key: string;
  title: string;
  idLabel: string;
  status: LedgerStatus;
  statusText: string;
  amount: string;
  prefix: string;
};

const ACTIVITY: ActivityRow[] = [
  { key: "a1", title: "Fee cash", idLabel: "OCT 2026 · MPSC", status: "paid", statusText: "In", amount: "1,24,000", prefix: "+" },
  { key: "a2", title: "Development expense", idLabel: "MATS · OCT 04", status: "overdue", statusText: "Out", amount: "18,500", prefix: "-" },
  { key: "a3", title: "Other income", idLabel: "DONATION · OCT 02", status: "credit", statusText: "In", amount: "6,000", prefix: "+" },
  { key: "a4", title: "Custom removal", idLabel: "SAVINGS · OCT 01", status: "overdue", statusText: "Out", amount: "25,000", prefix: "-" },
];

export default function MoneyPreviewPage() {
  const [section, setSection] = useState<Section>("overview");
  const [active, setActive] = useState<ActivityRow | null>(null);

  return (
    <>
      <PageShell
        hud={{
          title: "Money",
          monthLabel: "Oct 2026",
          backHref: "/dashboard",
          bell: <span className="font-mono text-[11px] text-[color:var(--color-text-dim)]">12</span>,
        }}
        mainClassName="py-[24px]"
      >
        <SegmentedTabs options={SECTIONS} value={section} onChange={setSection} ariaLabel="Money section" />

        {section === "overview" ? (
          <>
            <section className="hud-panel mt-[12px] p-[20px]">
              <div className="flex items-start justify-between gap-[16px]">
                <div>
                  <p className="eyebrow text-[color:var(--color-text-dim)]">Available now</p>
                  <p className="numeric mt-[12px] text-[40px] leading-none text-[color:var(--color-text)]">3,42,500</p>
                  <p className="mt-[12px] text-xs text-[color:var(--color-text-dim)]">Opening reserve included · cash basis</p>
                </div>
                <MeterRing value={72} caption="of target" tone="action" />
              </div>
              <MeterBar value={72} label="Balance target" className="mt-[20px]" />
            </section>

            <div className="mt-[12px] grid grid-cols-2 gap-[12px] lg:grid-cols-4">
              <StatTile label="Opening reserve" value="50,000" icon={<Wallet className="h-[16px] w-[16px]" />} />
              <StatTile label="Fee cash" value="1,24,000" tone="settled" icon={<HandCoins className="h-[16px] w-[16px]" />} />
              <StatTile label="Money out" value="43,500" tone="neutral" icon={<ArrowDownRight className="h-[16px] w-[16px]" />} />
              <StatTile label="Pending dues" value="36,000" tone="action" icon={<Clock className="h-[16px] w-[16px]" />} />
            </div>
          </>
        ) : null}

        {section === "activity" ? (
          <section className="hud-panel mt-[12px] p-[16px]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">October activity</h2>
              <span className="eyebrow text-[color:var(--color-text-dim)]">Cash basis</span>
            </div>
            <div className="mt-[12px] space-y-[8px]">
              {ACTIVITY.map((row, index) => (
                <LedgerRow
                  key={row.key}
                  index={index}
                  status={row.status}
                  title={row.title}
                  idLabel={row.idLabel}
                  amount={
                    <span className={row.prefix === "-" ? "text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text-dim)]"}>
                      {row.prefix}{row.amount}
                    </span>
                  }
                  trailing={<StatusPill status={row.status} label={row.statusText} />}
                  onClick={() => setActive(row)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {section === "fund" ? (
          <section className="hud-panel mt-[12px] p-[20px]">
            <div className="flex items-start justify-between gap-[16px]">
              <div>
                <p className="eyebrow text-[color:var(--color-text-dim)]">Development fund</p>
                <p className="numeric mt-[12px] text-[40px] leading-none text-[color:var(--color-text)]">1,50,000</p>
                <p className="mt-[12px] text-xs text-[color:var(--color-text-dim)]">Target 3,00,000 · 45% collected</p>
              </div>
              <BadgeCheck className="h-[24px] w-[24px] text-[color:var(--color-text-dim)]" aria-hidden="true" />
            </div>
            <MeterBar value={45} label="Development fund" className="mt-[20px]" tone="action" />
          </section>
        ) : null}
      </PageShell>

      <Sheet
        open={Boolean(active)}
        title={active?.title ?? "Activity"}
        onClose={() => setActive(null)}
      >
        <div className="space-y-[16px] pt-[4px]">
          <p className="numeric text-[28px] leading-none text-[color:var(--color-text)]">
            {active?.prefix}{active?.amount}
          </p>
          <p className="font-mono text-[11px] text-[color:var(--color-text-dim)]">{active?.idLabel}</p>
          <p className="text-[13px] text-[color:var(--color-text-dim)]">Stored amount is authoritative. No recalculation.</p>
        </div>
      </Sheet>
    </>
  );
}
