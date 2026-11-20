import type { ComponentProps, ReactNode } from "react";

import { cx } from "@/lib/cx";
import BottomNav from "./BottomNav";
import HudBar from "./HudBar";

export default function PageShell({
  hud,
  children,
  showBottomNav = true,
  mainClassName,
  className,
}: {
  hud: ComponentProps<typeof HudBar>;
  children: ReactNode;
  showBottomNav?: boolean;
  mainClassName?: string;
  className?: string;
}) {
  return (
    <div className={cx("min-h-screen bg-black text-zinc-300", showBottomNav && "md:pl-16", className)}>
      <HudBar {...hud} />
      <main className={cx("mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6", mainClassName)}>
        {children}
      </main>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
