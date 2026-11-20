"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="min-h-dvh bg-[color:var(--color-well)] text-[color:var(--color-text)] flex items-center justify-center px-6">
          <section className="max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
            <p className="text-[color:var(--color-text-dim)] mb-6">FeeTrack hit an unexpected error and the team has been notified.</p>
            <button
              type="button"
              onClick={() => reset()}
              className="min-h-11 rounded-md bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--color-accent-ink)]"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
