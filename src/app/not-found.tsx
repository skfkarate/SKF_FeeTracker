import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh text-[color:var(--color-text)] flex items-center justify-center px-[24px]">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-[12px]">Page not found</h1>
        <p className="text-[color:var(--color-text-dim)] mb-[24px]">The page you are looking for does not exist in FeeTrack.</p>
        <Link
          href="/"
          className="inline-block min-h-[44px] rounded-md bg-[color:var(--color-accent)] px-[20px] py-[8px] text-sm font-semibold text-[color:var(--color-accent-ink)]"
        >
          Go to Dashboard
        </Link>
      </section>
    </main>
  );
}
