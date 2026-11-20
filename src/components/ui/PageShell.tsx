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
    <div className={cx("min-h-dvh bg-[color:var(--color-base)] text-[color:var(--color-text-dim)]", className)}>
      <div className={cx(showBottomNav && "md:pl-[72px]")}>
        <HudBar {...hud} />
        <main
          className={cx(
            "content-shell pb-32 pt-5 sm:pt-7 md:pb-14",
            mainClassName,
          )}
        >
          {children}
        </main>
      </div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
