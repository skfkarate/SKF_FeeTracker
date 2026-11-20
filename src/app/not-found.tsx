import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-[color:var(--color-well)] text-[color:var(--color-text)] flex items-center justify-center px-6">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Page not found</h1>
        <p className="text-[color:var(--color-text-dim)] mb-6">The page you are looking for does not exist in FeeTrack.</p>
        <Link
          href="/"
          className="inline-block min-h-11 rounded-md bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--color-accent-ink)]"
        >
          Go to Dashboard
        </Link>
      </section>
    </main>
  );
}
