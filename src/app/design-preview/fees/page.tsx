"use client";

import { useState } from "react";

import AmountInput from "@/components/ui/AmountInput";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";

type Section = "month" | "overdue" | "credits";

const SECTIONS: SegmentOption<Section>[] = [
  { value: "month", label: "Month" },
  { value: "overdue", label: "Overdue" },
  { value: "credits", label: "Credits" },
];

type FeeRow = {
  key: string;
  name: string;
  idLabel: string;
  status: LedgerStatus;
  statusText: string;
  amount: string;
  note: string;
};

const ROWS: Record<Section, FeeRow[]> = {
  month: [
    { key: "m1", name: "Rahul Kumar", idLabel: "SKF21HE003 · 6 PAID", status: "due", statusText: "Due", amount: "2,000", note: "Monthly fee" },
    { key: "m2", name: "Kiran S", idLabel: "SKF19HE004 · 9 PAID", status: "paid", statusText: "Paid", amount: "2,000", note: "Paid Oct 04" },
    { key: "m3", name: "Meera N", idLabel: "SKF22MP011 · 3 PAID", status: "partial", statusText: "Partial", amount: "1,200", note: "Credit 800" },
  ],
  overdue: [
    { key: "o1", name: "Ananya Rao", idLabel: "SKF20HE002 · 2 MONTHS", status: "overdue", statusText: "Overdue", amount: "4,000", note: "Sep + Oct" },
    { key: "o2", name: "Arjun P", idLabel: "SKF18MP007 · 1 MONTH", status: "overdue", statusText: "Overdue", amount: "2,000", note: "Sep" },
  ],
  credits: [
    { key: "c1", name: "Referral credit", idLabel: "RAHUL KUMAR · OCT", status: "credit", statusText: "Credit", amount: "500", note: "Applied to fee" },
    { key: "c2", name: "Sibling credit", idLabel: "MEERA N · OCT", status: "credit", statusText: "Credit", amount: "800", note: "Applied to fee" },
  ],
};

export default function FeesPreviewPage() {
  const [section, setSection] = useState<Section>("month");
  const [active, setActive] = useState<FeeRow | null>(null);
  const [amount, setAmount] = useState("2000");

  return (
    <>
      <PageShell
        hud={{
          title: "Fees",
          monthLabel: "Oct 2026",
          branchLabel: "MPSC",
          backHref: "/dashboard",
          onBranchClick: () => undefined,
          bell: <span className="font-mono text-[11px] text-[color:var(--color-text-dim)]">12</span>,
        }}
        mainClassName="py-[24px]"
      >
        <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
          <StatTile label="Collected" value="1,24,000" tone="settled" />
          <StatTile label="Pending" value="36,000" tone="action" />
          <StatTile label="Overdue" value="12,000" tone="overdue" />
          <StatTile label="Credits" value="3,250" tone="settled" />
        </div>

        <SegmentedTabs
          options={SECTIONS}
          value={section}
          onChange={setSection}
          ariaLabel="Fees section"
          className="mt-[24px]"
        />

        <div className="mt-[12px] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[color:var(--color-text)]">
            {section === "month" ? "October ledger" : section === "overdue" ? "Overdue ledger" : "Credit ledger"}
          </h2>
          <span className="eyebrow text-[color:var(--color-text-dim)]">MPSC</span>
        </div>

        <div className="mt-[12px] space-y-[8px]">
          {ROWS[section].map((row, index) => (
            <LedgerRow
              key={row.key}
              index={index}
              status={row.status}
              title={row.name}
              idLabel={row.idLabel}
              amount={row.amount}
              amountLabel={row.note}
              trailing={<StatusPill status={row.status} label={row.statusText} />}
              onClick={() => setActive(row)}
            />
          ))}
        </div>
      </PageShell>

      <Sheet
        open={Boolean(active)}
        title={active?.status === "credit" ? "Credit detail" : "Mark paid"}
        onClose={() => setActive(null)}
      >
        <div className="space-y-[16px] pt-[4px]">
          <p className="text-[15px] font-semibold text-[color:var(--color-text)]">{active?.name}</p>
          <AmountInput label="Amount received" value={amount} onChange={setAmount} hint="Stored charged amount is used for receipts." />
          <button
            type="button"
            className="tap-target w-full rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)]"
            onClick={() => setActive(null)}
          >
            Confirm payment
          </button>
        </div>
      </Sheet>
    </>
  );
}
