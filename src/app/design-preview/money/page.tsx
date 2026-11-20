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
        mainClassName="py-6"
      >
        <SegmentedTabs options={SECTIONS} value={section} onChange={setSection} ariaLabel="Money section" />

        {section === "overview" ? (
          <>
            <section className="hud-panel mt-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-[color:var(--color-text-dim)]">Available now</p>
                  <p className="numeric mt-3 text-[40px] leading-none text-[color:var(--color-text)]">3,42,500</p>
                  <p className="mt-3 text-xs text-[color:var(--color-text-dim)]">Opening reserve included · cash basis</p>
                </div>
                <MeterRing value={72} caption="of target" tone="action" />
              </div>
              <MeterBar value={72} label="Balance target" className="mt-5" />
            </section>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Opening reserve" value="50,000" icon={<Wallet className="h-4 w-4" />} />
              <StatTile label="Fee cash" value="1,24,000" tone="settled" icon={<HandCoins className="h-4 w-4" />} />
              <StatTile label="Money out" value="43,500" tone="neutral" icon={<ArrowDownRight className="h-4 w-4" />} />
              <StatTile label="Pending dues" value="36,000" tone="action" icon={<Clock className="h-4 w-4" />} />
            </div>
          </>
        ) : null}

        {section === "activity" ? (
          <section className="hud-panel mt-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">October activity</h2>
              <span className="eyebrow text-[color:var(--color-text-dim)]">Cash basis</span>
            </div>
            <div className="mt-3 space-y-2">
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
          <section className="hud-panel mt-3 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[color:var(--color-text-dim)]">Development fund</p>
                <p className="numeric mt-3 text-[40px] leading-none text-[color:var(--color-text)]">1,50,000</p>
                <p className="mt-3 text-xs text-[color:var(--color-text-dim)]">Target 3,00,000 · 45% collected</p>
              </div>
              <BadgeCheck className="h-6 w-6 text-[color:var(--color-text-dim)]" aria-hidden="true" />
            </div>
            <MeterBar value={45} label="Development fund" className="mt-5" tone="action" />
          </section>
        ) : null}
      </PageShell>

      <Sheet
        open={Boolean(active)}
        title={active?.title ?? "Activity"}
        onClose={() => setActive(null)}
      >
        <div className="space-y-4 pt-1">
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
