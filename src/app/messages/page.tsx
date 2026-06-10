"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bold,
  CheckCircle2,
  CheckSquare,
  Code2,
  Copy,
  Eye,
  HelpCircle,
  Italic,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  Strikethrough,
  Users,
  X,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { getStudents, type Student } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import {
  cleanIndianPhone,
  feeReminderWhatsAppUrl,
  MONTHS,
  MONTHS_SHORT,
  phoneValue,
  readFeeReminderTemplate,
  replaceFeeReminderPlaceholders,
  studentName,
  unresolvedPlaceholders,
  writeFeeReminderTemplate,
} from "@/lib/fee-reminder-message";

const BRANCH_OPTIONS = [
  { value: "Herohalli", label: "Herohalli" },
  { value: "MPSC", label: "MP" },
];

const PLACEHOLDERS = [
  { key: "{student_name}", label: "Student", example: "Arjun Kumar" },
  { key: "{parent_name}", label: "Parent", example: "Mr. Sharma" },
  { key: "{pending_amount}", label: "Amount", example: "₹500" },
  { key: "{month}", label: "Month", example: "June" },
  { key: "{branch}", label: "Branch", example: "HEROHALLI" },
  { key: "{skf_id}", label: "SKF ID", example: "HH-001" },
];

const MESSAGE_GENERATION_PROMPT = `Create a WhatsApp message template for SKF Karate.

Purpose: [write the exact purpose here, for example monthly fee reminder, event notice, timetable update, result announcement, portal video update, admission follow-up].

Audience: parents or athletes connected to SKF Karate.

Rules:
- Output only the final WhatsApp message template. Do not add explanation.
- Keep the message clear, respectful, and short enough to send manually on WhatsApp.
- Use WhatsApp formatting where useful: *bold* for key details, _italic_ for student names or gentle emphasis, ~strikethrough~ only when correcting old information, and \`\`\`monospace\`\`\` only for codes or IDs.
- Keep placeholders exactly as written when needed: {student_name}, {parent_name}, {pending_amount}, {month}, {branch}, {skf_id}.
- Do not invent dates, fees, links, phone numbers, venues, or results. Use placeholders or ask me for the missing detail.
- Start politely, make the action needed very clear, and end with "SKF Karate - {branch}".
- Avoid overexplaining, excessive emojis, and marketing-style language.

Current draft or details:
[paste the rough message or required details here]`;

const BATCH_SIZE = 5;

export default function MessagesPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<string>("");

  useEffect(() => {
    setMessageTemplate(readFeeReminderTemplate());
  }, []);
  const [selectedBranch, setSelectedBranch] = useState("Herohalli");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [autoSelectPending, setAutoSelectPending] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  const loadStudents = useCallback(async (forceRefresh = false) => {
    setError("");
    setNotice("");
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const rows = await getStudents(selectedBranch, selectedMonth, forceRefresh, feeYear);
      setStudents(rows);
      if (autoSelectPending) {
        setSelectedStudents(new Set(
          rows
            .filter((student) => student.monthStatus === "Pending" && student.status === "Active")
            .map((student) => student.id),
        ));
      }
      setQueueIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [autoSelectPending, feeYear, selectedBranch, selectedMonth]);

  useEffect(() => {
    if (checking || !user) return;
    const timeoutId = window.setTimeout(() => {
      void loadStudents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [checking, loadStudents, user]);

  useEffect(() => {
    writeFeeReminderTemplate(messageTemplate);
  }, [messageTemplate]);

  const pendingStudents = useMemo(
    () => students.filter((student) => student.monthStatus === "Pending" && student.status === "Active"),
    [students],
  );

  const visibleStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return pendingStudents;
    return pendingStudents.filter((student) =>
      [
        student.name,
        student.parentName,
        student.id,
        student.phone,
        student.whatsapp,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [pendingStudents, query]);

  const selectedStudentsList = useMemo(
    () => pendingStudents.filter((student) => selectedStudents.has(student.id)),
    [pendingStudents, selectedStudents],
  );

  const sendableStudents = useMemo(
    () => selectedStudentsList.filter((student) => Boolean(cleanIndianPhone(phoneValue(student)))),
    [selectedStudentsList],
  );

  const missingPhoneCount = selectedStudentsList.length - sendableStudents.length;
  const totalPendingAmount = selectedStudentsList.reduce((sum, student) => sum + Number(student.fee || 0), 0);
  const selectedMonthLabel = `${MONTHS[selectedMonth]} ${feeYear}`;
  const queueDone = sendableStudents.length === 0 ? 0 : Math.min(queueIndex, sendableStudents.length);

  function replacePlaceholders(template: string, student: Student) {
    return replaceFeeReminderPlaceholders(template, student, {
      branch: selectedBranch,
      monthIndex: selectedMonth,
    });
  }

  function whatsAppUrl(student: Student) {
    return feeReminderWhatsAppUrl(messageTemplate, student, {
      branch: selectedBranch,
      monthIndex: selectedMonth,
    });
  }

  function insertText(text: string) {
    const textarea = textAreaRef.current;
    if (!textarea) {
      setMessageTemplate((current) => `${current}${text}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${messageTemplate.slice(0, start)}${text}${messageTemplate.slice(end)}`;
    setMessageTemplate(next);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }

  function wrapSelection(prefix: string, suffix = prefix) {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = messageTemplate.slice(start, end) || "text";
    const wrapped = `${prefix}${selected}${suffix}`;
    const next = `${messageTemplate.slice(0, start)}${wrapped}${messageTemplate.slice(end)}`;
    setMessageTemplate(next);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
    setAutoSelectPending(false);
    setQueueIndex(0);
  }

  function toggleAllPending() {
    if (selectedStudents.size === pendingStudents.length && pendingStudents.length > 0) {
      setSelectedStudents(new Set());
      setAutoSelectPending(false);
    } else {
      setSelectedStudents(new Set(pendingStudents.map((student) => student.id)));
      setAutoSelectPending(true);
    }
    setQueueIndex(0);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(successMessage);
    } catch {
      setError("Clipboard access failed. Select and copy the text manually.");
    }
  }

  function openSingle(student: Student) {
    const url = whatsAppUrl(student);
    if (!url) {
      setError(`${studentName(student)} does not have a WhatsApp number.`);
      return false;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
      return false;
    }
    return true;
  }

  function openNextBatch() {
    if (!sendableStudents.length) return;
    const batch = sendableStudents.slice(queueIndex, queueIndex + BATCH_SIZE);
    let openedCount = 0;
    for (const student of batch) {
      if (openSingle(student)) openedCount += 1;
    }
    setQueueIndex((current) => Math.min(current + batch.length, sendableStudents.length));
    setNotice(`Opened ${openedCount} WhatsApp chat${openedCount === 1 ? "" : "s"}.`);
  }

  const firstPreviewStudent = selectedStudentsList[0] || pendingStudents[0] || null;
  const previewMessage = previewStudent ? replacePlaceholders(messageTemplate, previewStudent) : "";
  const previewIssues = unresolvedPlaceholders(previewMessage);

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-black text-zinc-300">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar
        showBack
        title="Messages"
        rightContent={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-white"
              title="Message prompt"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-white"
              title="Placeholder guide"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <NavMenu />
          </div>
        }
      />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-28">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Manual WhatsApp Queue</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Fee Reminders
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-center text-xs">
            <div className="px-3 py-2">
              <p className="font-semibold text-white">{pendingStudents.length}</p>
              <p className="mt-1 text-zinc-600">Pending</p>
            </div>
            <div className="border-x border-zinc-800 px-3 py-2">
              <p className="font-semibold text-white">{selectedStudentsList.length}</p>
              <p className="mt-1 text-zinc-600">Selected</p>
            </div>
            <div className="px-3 py-2">
              <p className="font-semibold text-white">₹{totalPendingAmount.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-zinc-600">Amount</p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            <div className="card-panel p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Message Template</p>
                  <h2 className="text-lg font-semibold text-white">Composer</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => wrapSelection("*")} className="btn-ghost flex h-10 w-10 items-center justify-center p-0" title="Bold">
                    <Bold className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => wrapSelection("_")} className="btn-ghost flex h-10 w-10 items-center justify-center p-0" title="Italic">
                    <Italic className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => wrapSelection("~")} className="btn-ghost flex h-10 w-10 items-center justify-center p-0" title="Strikethrough">
                    <Strikethrough className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => wrapSelection("```", "```")} className="btn-ghost flex h-10 w-10 items-center justify-center p-0" title="Monospace">
                    <Code2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <textarea
                ref={textAreaRef}
                id="message-template"
                value={messageTemplate}
                onChange={(event) => setMessageTemplate(event.target.value)}
                className="input-minimal min-h-72 resize-y font-mono text-sm leading-relaxed"
                placeholder="Type the message template"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder.key}
                    type="button"
                    onClick={() => insertText(placeholder.key)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-400 hover:border-zinc-600 hover:text-white"
                  >
                    {placeholder.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-panel p-4 sm:p-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input-minimal min-h-11 pl-11"
                    placeholder="Search student, SKF ID or phone"
                  />
                </div>
                <select
                  value={selectedBranch}
                  onChange={(event) => {
                    setSelectedBranch(event.target.value);
                    setQueueIndex(0);
                  }}
                  className="input-minimal min-h-11"
                >
                  {BRANCH_OPTIONS.map((branchOption) => (
                    <option key={branchOption.value} value={branchOption.value}>
                      {branchOption.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(Number.parseInt(event.target.value, 10));
                    setQueueIndex(0);
                  }}
                  className="input-minimal min-h-11"
                >
                  {MONTHS_SHORT.map((month, index) => (
                    <option key={month} value={index}>
                      {month} {feeYear}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => loadStudents(true)}
                  disabled={refreshing}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-zinc-400 hover:border-zinc-600 hover:text-white disabled:opacity-60"
                  title="Refresh students"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>

              <button
                type="button"
                onClick={toggleAllPending}
                className={`mb-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition-colors ${
                  selectedStudents.size === pendingStudents.length && pendingStudents.length > 0
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {selectedStudents.size === pendingStudents.length && pendingStudents.length > 0
                    ? <CheckSquare className="h-4 w-4" />
                    : <Square className="h-4 w-4" />}
                  All pending students
                </span>
                <span>{pendingStudents.length}</span>
              </button>

              {loading ? (
                <div className="flex min-h-72 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : visibleStudents.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
                  <Users className="h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">No pending students found for {selectedMonthLabel}.</p>
                </div>
              ) : (
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {visibleStudents.map((student) => {
                    const selected = selectedStudents.has(student.id);
                    const hasPhone = Boolean(cleanIndianPhone(phoneValue(student)));
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selected
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            {selected ? (
                              <CheckSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                            ) : (
                              <Square className="mt-0.5 h-5 w-5 flex-shrink-0 text-zinc-600" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{studentName(student)}</p>
                              <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-zinc-500">
                                {student.id} • {student.parentName || "Parent"}
                              </p>
                              <p className={`mt-1 truncate text-xs ${hasPhone ? "text-zinc-500" : "text-amber-300"}`}>
                                {phoneValue(student) || "No WhatsApp number"}
                              </p>
                            </div>
                          </div>
                          <span className="whitespace-nowrap font-mono text-sm font-semibold text-white">
                            ₹{Number(student.fee || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="card-panel p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Preview</p>
                  <h2 className="text-lg font-semibold text-white">
                    {firstPreviewStudent ? studentName(firstPreviewStudent) : "No student"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => firstPreviewStudent && setPreviewStudent(firstPreviewStudent)}
                  disabled={!firstPreviewStudent}
                  className="btn-ghost flex h-10 w-10 items-center justify-center p-0 disabled:opacity-50"
                  title="Open preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-72 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                {firstPreviewStudent ? replacePlaceholders(messageTemplate, firstPreviewStudent) : "Select a pending student to preview the message."}
              </div>
            </div>

            <div className="card-panel p-4 sm:p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Queue</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{sendableStudents.length} Ready</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-zinc-600">Missing Phone</p>
                  <p className="mt-1 text-lg font-semibold text-amber-300">{missingPhoneCount}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-zinc-600">Opened</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">{queueDone}/{sendableStudents.length}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQueueOpen(true);
                    setQueueIndex(0);
                  }}
                  disabled={sendableStudents.length === 0}
                  className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Open Queue
                </button>
                <button
                  type="button"
                  onClick={() => sendableStudents[0] && copyText(replacePlaceholders(messageTemplate, sendableStudents[0]), "Preview message copied.")}
                  disabled={!sendableStudents[0]}
                  className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy Preview
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showHelpModal ? (
        <div className="glass-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowHelpModal(false)}>
          <div className="glass-modal !max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Message Fields</p>
                <h2 className="text-lg font-semibold text-white">Placeholders</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              {PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder.key}
                  type="button"
                  onClick={() => insertText(placeholder.key)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <code className="rounded bg-zinc-900 px-2 py-1 text-xs text-emerald-300">{placeholder.key}</code>
                    <span className="text-xs text-zinc-500">{placeholder.example}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{placeholder.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showPromptModal ? (
        <div className="glass-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowPromptModal(false)}>
          <div className="glass-modal !max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">AI Prompt</p>
                <h2 className="text-lg font-semibold text-white">Message Guidelines</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              readOnly
              value={MESSAGE_GENERATION_PROMPT}
              className="input-minimal min-h-96 resize-y font-mono text-xs leading-relaxed"
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => copyText(MESSAGE_GENERATION_PROMPT, "Message prompt copied.")}
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Prompt
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPromptModal(false);
                  setShowHelpModal(true);
                }}
                className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Placeholders
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewStudent ? (
        <div className="glass-modal-overlay" onClick={(event) => event.target === event.currentTarget && setPreviewStudent(null)}>
          <div className="glass-modal !max-w-lg p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Preview</p>
                <h2 className="text-lg font-semibold text-white">{studentName(previewStudent)}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {previewIssues.length ? (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                Unknown placeholders: {previewIssues.join(", ")}
              </div>
            ) : null}
            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {previewMessage}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => copyText(previewMessage, "Message copied.")}
                className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                type="button"
                onClick={() => openSingle(previewStudent)}
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {queueOpen ? (
        <div className="glass-modal-overlay" onClick={(event) => event.target === event.currentTarget && setQueueOpen(false)}>
          <div className="glass-modal !max-w-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Bulk Queue</p>
                <h2 className="text-lg font-semibold text-white">{queueDone}/{sendableStudents.length} Opened</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openNextBatch}
                  disabled={queueIndex >= sendableStudents.length}
                  className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Open Next {BATCH_SIZE}
                </button>
                <button
                  type="button"
                  onClick={() => setQueueOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {sendableStudents.map((student, index) => {
                const opened = index < queueIndex;
                return (
                  <div
                    key={student.id}
                    className={`rounded-lg border p-3 ${
                      opened ? "border-emerald-500/20 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{studentName(student)}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">{student.id} • {phoneValue(student)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <button
                          type="button"
                          onClick={() => copyText(replacePlaceholders(messageTemplate, student), `${studentName(student)} message copied.`)}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openSingle(student)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
