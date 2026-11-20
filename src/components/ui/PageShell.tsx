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
    <div className={cx("min-h-dvh text-[color:var(--color-text)]", className)}>
      <div className={cx(showBottomNav && "md:pl-[72px]")}>
        <HudBar {...hud} />
        <main
          className={cx(
            "content-shell pb-[128px] pt-[20px] sm:pt-[28px] md:pb-[56px]",
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
