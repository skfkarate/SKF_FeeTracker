import { Suspense } from "react";

import CustomPageClient from "./CustomPageClient";

export default function CustomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-300">
          <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
            Loading custom operations...
          </div>
        </div>
      }
    >
      <CustomPageClient />
    </Suspense>
  );
}
