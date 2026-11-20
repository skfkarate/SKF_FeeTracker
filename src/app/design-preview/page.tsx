"use client";

import { useState } from "react";

import LedgerRow from "@/components/ui/LedgerRow";
import MeterRing, { MeterBar } from "@/components/ui/MeterRing";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import AmountInput from "@/components/ui/AmountInput";
import PageShell from "@/components/ui/PageShell";

type TabValue = "month" | "overdue" | "credits";

const TABS: { value: TabValue; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "overdue", label: "Overdue" },
  { value: "credits", label: "Credits" },
];

export default function DesignPreviewPage() {
  const [tab, setTab] = useState<TabValue>("month");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState("2000");

  return (
    <>
      <PageShell
        hud={{
          title: "Fees",
          monthLabel: "Oct 2026",
          branchLabel: "MPSC",
          onBranchClick: () => undefined,
          onSearchClick: () => undefined,
          bell: <span className="font-mono text-[11px] text-[color:var(--color-text-dim)]">12</span>,
        }}
        mainClassName="py-6"
      >
        <section className="hud-panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-[color:var(--color-text-dim)]">Collected</p>
              <p className="numeric mt-2 text-[40px] leading-none text-[color:var(--color-text)]">Rs. 1,24,000</p>
            </div>
            <MeterRing value={68} label="Collection rate" caption="of monthly fees" />
          </div>
        </section>

        <section className="mt-3 hud-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-[color:var(--color-text-dim)]">Fund target</p>
              <p className="numeric mt-2 text-[20px] leading-none text-[color:var(--color-text)]">Rs. 1,50,000</p>
            </div>
            <span className="eyebrow text-[color:var(--color-text-dim)]">45%</span>
          </div>
          <MeterBar value={45} label="Fund target" className="mt-3" />
        </section>

        <section className="mt-6 hud-panel p-4">
          <p className="eyebrow text-[color:var(--color-text-dim)]">Money type</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <p className="numeric text-[20px] text-[color:var(--color-text)]">2,000</p>
            <p className="numeric text-[20px] text-[color:var(--color-text)]">1,24,000</p>
            <p className="numeric text-[20px] text-[color:var(--color-text)]">10,25,500</p>
          </div>
        </section>

        <div className="mt-6">
          <SegmentedTabs options={TABS} value={tab} onChange={setTab} ariaLabel="Fees sections" />
        </div>

        <section className="mt-6 space-y-2">
          <LedgerRow
            index={0}
            status="due"
            title="Rahul Kumar"
            subtitle="Herohalli"
            idLabel="SKF21HE003"
            amount="2,000"
            amountLabel="Monthly fee"
            trailing={<StatusPill status="due" />}
            onClick={() => setSheetOpen(true)}
          />
          <LedgerRow
            index={1}
            status="overdue"
            title="Ananya Rao"
            subtitle="M P Sports Club"
            idLabel="SKF20HE002"
            amount="2,000"
            amountLabel="Overdue 2 months"
            trailing={<StatusPill status="overdue" />}
            onClick={() => setSheetOpen(true)}
          />
          <LedgerRow
            index={2}
            status="paid"
            title="Kiran S"
            subtitle="M P Sports Club"
            idLabel="SKF19HE004"
            amount="2,000"
            amountLabel="Paid Oct 04"
            trailing={<StatusPill status="paid" />}
            onClick={() => setSheetOpen(true)}
          />
        </section>

        <section className="mt-6 hud-panel p-4">
          <AmountInput label="Amount received" value={amount} onChange={setAmount} hint="Prorated rows keep the explanation in metadata." />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="tap-target mt-4 w-full rounded-[var(--radius-row)] bg-[color:var(--color-brand)] px-4 eyebrow text-[color:var(--color-accent-ink)]"
          >
            Open sheet
          </button>
        </section>
      </PageShell>

      <Sheet open={sheetOpen} title="Mark paid" onClose={() => setSheetOpen(false)}>
        <div className="space-y-4">
          <p className="numeric text-[28px] leading-none text-[color:var(--color-text)]">Rs. {amount || "0"}</p>
          <p className="text-[13px] text-[color:var(--color-text-dim)]">Payment receipt will snapshot the stored charged amount.</p>
          <LedgerRow
            status="partial"
            title="Rahul Kumar"
            idLabel="SKF21HE003"
            amount={amount || "0"}
            trailing={<StatusPill status="partial" />}
          />
        </div>
      </Sheet>
    </>
  );
}