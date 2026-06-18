import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-black text-white flex items-center justify-center px-6">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Page not found</h1>
        <p className="text-zinc-400 mb-6">The page you are looking for does not exist in FeeTrack.</p>
        <Link
          href="/"
          className="inline-block min-h-11 rounded-md bg-white px-5 py-2 text-sm font-semibold text-black"
        >
          Go to Dashboard
        </Link>
      </section>
    </main>
  );
}
