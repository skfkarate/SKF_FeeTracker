"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Command } from "lucide-react";
import { getStudents, Student } from "@/lib/api";

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 100);
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
            ...mpsc.map((s) => ({ ...s, branch: "MPSC" })),
            ...hero.map((s) => ({ ...s, branch: "Herohalli" })),
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
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.id.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open student search"
        className="flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs hidden sm:inline">Search...</span>
        <span className="hidden sm:inline-flex items-center gap-0.5 ml-2 text-[10px] bg-zinc-800 px-1.5 rounded font-mono">
          <Command className="w-3 h-3" /> K
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-[100] pt-[15vh]" role="dialog" aria-modal="true" aria-label="Student search">
          <div 
            className="fixed inset-0" 
            onClick={closeSearch} 
            aria-hidden="true"
          />
          <div className="card-panel max-w-xl w-full mx-4 shadow-2xl relative flex flex-col max-h-[70vh] overflow-hidden animate-slide-up">
            
            <div className="flex items-center border-b border-zinc-800 px-4 py-3 shrink-0">
              <Search className="w-5 h-5 text-zinc-500 mr-3" />
              <input
                ref={inputRef}
                type="text"
                aria-label="Search by name or SKF ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKF ID..."
                className="w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0 text-sm"
              />
              {loading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
            </div>

            <div className="overflow-y-auto">
              {!search.trim() ? (
                <div className="p-6 text-center text-zinc-600 text-xs">
                  Type to search across all branches
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  No students found matching &quot;{search}&quot;
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filtered.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        closeSearch();
                        router.push(`/students/${student.branch}?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400 group-hover:bg-zinc-700 transition-colors">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{student.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{student.id}</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
                        {student.branch}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
