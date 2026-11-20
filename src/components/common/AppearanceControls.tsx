"use client";

import { useState } from "react";

import { cx } from "@/lib/cx";

type ThemeChoice = "night" | "day";
type EffectsChoice = "full" | "lite";

const optionClass =
  "tap-target min-w-[0px] flex-1 rounded-[var(--radius-pill)] border px-[8px] text-[12px] font-semibold transition-colors";

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "night";
  try {
    return localStorage.getItem("aurora-theme") === "day" ? "day" : "night";
  } catch {
    return "night";
  }
}

function readStoredEffects(): EffectsChoice {
  if (typeof window === "undefined") return "full";
  try {
    return localStorage.getItem("aurora-fx") === "lite" ? "lite" : "full";
  } catch {
    return "full";
  }
}

function Option({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        optionClass,
        active
          ? "border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-dim)] text-[color:var(--accent-text)]"
          : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]",
      )}
    >
      {label}
    </button>
  );
}

export default function AppearanceControls() {
  const [theme, setTheme] = useState<ThemeChoice>(readStoredTheme);
  const [effects, setEffects] = useState<EffectsChoice>(readStoredEffects);

  const chooseTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    if (choice === "day") {
      document.documentElement.dataset.theme = "day";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem("aurora-theme", choice);
    } catch {
      // Ignore storage failures.
    }
  };

  const chooseEffects = (choice: EffectsChoice) => {
    setEffects(choice);
    if (choice === "lite") {
      document.documentElement.dataset.fx = "lite";
    } else {
      delete document.documentElement.dataset.fx;
    }
    try {
      localStorage.setItem("aurora-fx", choice);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <div className="mb-[12px] space-y-[8px]">
      <p className="eyebrow text-[color:var(--color-text-faint)]">Appearance</p>
      <div role="group" aria-label="Color theme" className="flex gap-[8px]">
        <Option active={theme === "night"} label="Night" onClick={() => chooseTheme("night")} />
        <Option active={theme === "day"} label="Day" onClick={() => chooseTheme("day")} />
      </div>
      <div role="group" aria-label="Visual effects" className="flex gap-[8px]">
        <Option active={effects === "full"} label="Full" onClick={() => chooseEffects("full")} />
        <Option active={effects === "lite"} label="Lite" onClick={() => chooseEffects("lite")} />
      </div>
    </div>
  );
}
