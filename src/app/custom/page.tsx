import { Suspense } from "react";

import CustomPageClient from "./CustomPageClient";

export default function CustomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-[color:var(--color-text)]">
          <div className="flex min-h-screen items-center justify-center text-sm text-[color:var(--color-text-dim)]">
            Loading custom operations...
          </div>
        </div>
      }
    >
      <CustomPageClient />
    </Suspense>
  );
}
