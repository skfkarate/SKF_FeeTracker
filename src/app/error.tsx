"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
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
    <main className="min-h-dvh bg-black text-white flex items-center justify-center px-6">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
        <p className="text-zinc-400 mb-6">FeeTrack hit an unexpected error and the team has been notified.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-11 rounded-md bg-white px-5 py-2 text-sm font-semibold text-black cursor-pointer"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
