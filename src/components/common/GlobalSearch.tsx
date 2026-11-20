"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Command, X } from "lucide-react";

import { getStudents, type Student } from "@/lib/api";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<(Student & { branch: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const closeSearch = () => {
    setIsOpen(false);
    setSearch("");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    let cancelled = false;

    if (students.length === 0) {
      async function loadSearchStudents() {
        setLoading(true);
        const currentMonth = new Date().getMonth();
        try {
          const [mpsc, hero] = await Promise.all([
            getStudents("MPSC", currentMonth),
            getStudents("Herohalli", currentMonth),
          ]);
          if (cancelled) return;
          setStudents([
            ...mpsc.map((student) => ({ ...student, branch: "MPSC" })),
            ...hero.map((student) => ({ ...student, branch: "Herohalli" })),
          ]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      void loadSearchStudents();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, students.length]);

  const filtered = search.trim()
    ? students
        .filter((student) =>
          student.name.toLowerCase().includes(search.toLowerCase()) ||
          student.id.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open student search"
        className="tap-target flex items-center gap-2 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-3 text-[color:var(--color-text-faint)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)]"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">Search…</span>
        <span className="ml-1 hidden items-center gap-0.5 rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
          <Command className="h-3 w-3" aria-hidden="true" /> K
        </span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-[color:var(--color-well)] pt-[12vh] backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Student search"
        >
          <button type="button" aria-label="Close student search" onClick={closeSearch} className="absolute inset-0 cursor-default" />
          <div className="aurora-glow card-panel relative mx-4 flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden animate-slide-up">
            <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[color:var(--color-hairline)] px-4 sm:px-5">
              <Search className="h-5 w-5 shrink-0 text-[color:var(--color-accent)]" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search by name or SKF ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or SKF ID…"
                className="min-w-0 flex-1 bg-transparent py-4 text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)]"
              />
              {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[color:var(--color-text-faint)]" aria-hidden="true" /> : null}
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close student search"
                className="tap-target grid shrink-0 place-items-center rounded-full text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
              {!search.trim() ? (
                <div className="px-6 py-12 text-center text-xs text-[color:var(--color-text-faint)]">
                  Type a name or SKF ID to search both branches.
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-12 text-center text-xs text-[color:var(--color-text-faint)]">
                  No athletes match “{search}”.
                </div>
              ) : (
                <div className="grid gap-1.5">
                  {filtered.map((student) => (
                    <button
                      key={`${student.branch}-${student.id}`}
                      type="button"
                      onClick={() => {
                        closeSearch();
                        router.push(`/students/${student.branch}?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`);
                      }}
                      className="flex min-h-16 w-full items-center justify-between gap-3 rounded-[var(--radius-row)] border border-transparent px-3 text-left transition-colors hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-xs font-semibold text-[color:var(--color-text-dim)]">
                          {student.name.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[color:var(--color-text)]">{student.name}</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-[color:var(--color-text-faint)]">{student.id}</span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-text-faint)]">
                        {student.branch}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
