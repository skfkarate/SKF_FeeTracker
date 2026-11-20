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
        className="tap-target flex items-center gap-[8px] rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-[color:var(--color-text-faint)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)]"
      >
        <Search className="h-[16px] w-[16px] shrink-0" aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">Search…</span>
        <span className="ml-[4px] hidden items-center gap-[2px] rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-panel)] px-[6px] py-[2px] font-mono text-[10px] sm:inline-flex">
          <Command className="h-[12px] w-[12px]" aria-hidden="true" /> K
        </span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-[0px] z-[100] flex items-start justify-center bg-[color:var(--color-well)] pt-[12vh] backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Student search"
        >
          <button type="button" aria-label="Close student search" onClick={closeSearch} className="absolute inset-[0px] cursor-default" />
          <div className="aurora-glow card-panel relative mx-[16px] flex max-h-[76vh] w-full max-w-xl flex-col overflow-hidden animate-slide-up">
            <div className="flex min-h-[64px] shrink-0 items-center gap-[12px] border-b border-[color:var(--color-hairline)] px-[16px] sm:px-[20px]">
              <Search className="h-[20px] w-[20px] shrink-0 text-[color:var(--color-accent)]" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search by name or SKF ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or SKF ID…"
                className="min-w-[0px] flex-1 bg-transparent py-[16px] text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-faint)]"
              />
              {loading ? <Loader2 className="h-[16px] w-[16px] shrink-0 animate-spin text-[color:var(--color-text-faint)]" aria-hidden="true" /> : null}
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close student search"
                className="tap-target grid shrink-0 place-items-center rounded-full text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]"
              >
                <X className="h-[16px] w-[16px]" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-[0px] flex-1 overflow-y-auto p-[8px] sm:p-[12px]">
              {!search.trim() ? (
                <div className="px-[24px] py-[48px] text-center text-xs text-[color:var(--color-text-faint)]">
                  Type a name or SKF ID to search both branches.
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-[24px] py-[48px] text-center text-xs text-[color:var(--color-text-faint)]">
                  No athletes match “{search}”.
                </div>
              ) : (
                <div className="grid gap-[6px]">
                  {filtered.map((student) => (
                    <button
                      key={`${student.branch}-${student.id}`}
                      type="button"
                      onClick={() => {
                        closeSearch();
                        router.push(`/students/${student.branch}?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`);
                      }}
                      className="flex min-h-[64px] w-full items-center justify-between gap-[12px] rounded-[var(--radius-row)] border border-transparent px-[12px] text-left transition-colors hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
                    >
                      <span className="flex min-w-[0px] items-center gap-[12px]">
                        <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-xs font-semibold text-[color:var(--color-text-dim)]">
                          {student.name.charAt(0)}
                        </span>
                        <span className="min-w-[0px]">
                          <span className="block truncate text-sm font-semibold text-[color:var(--color-text)]">{student.name}</span>
                          <span className="mt-[2px] block truncate font-mono text-[11px] text-[color:var(--color-text-faint)]">{student.id}</span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[10px] py-[4px] font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-text-faint)]">
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
