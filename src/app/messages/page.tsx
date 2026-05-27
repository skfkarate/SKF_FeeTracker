"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HelpCircle,
  X,
  Send,
  Eye,
  CheckSquare,
  Square,
  Users,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { getStudents, Student } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import Navbar from "@/components/common/Navbar";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Placeholder definitions with descriptions
const PLACEHOLDERS = [
  {
    key: "{student_name}",
    label: "Student Name",
    description: "The name of the student",
    example: "Arjun Kumar",
  },
  {
    key: "{parent_name}",
    label: "Parent Name",
    description: "The name of the student's parent/guardian",
    example: "Mr. Sharma",
  },
  {
    key: "{pending_amount}",
    label: "Pending Amount",
    description: "The monthly fee amount that is pending",
    example: "₹500",
  },
  {
    key: "{month}",
    label: "Month",
    description: "The month for which fee is pending",
    example: "January",
  },
  {
    key: "{branch}",
    label: "Branch",
    description: "The branch name (Herohalli or MP Sports Club)",
    example: "HEROHALLI",
  },
  {
    key: "{skf_id}",
    label: "SKF ID",
    description: "The unique student ID",
    example: "HH-001",
  },
];

// Default message template
const DEFAULT_TEMPLATE = `Dear {parent_name},

This is a friendly reminder that the monthly training fee of {pending_amount} for {student_name} ({skf_id}) is pending for {month}.

Please clear the dues at your earliest convenience.

Thank you,
SKF Karate - {branch}`;

export default function MessagesPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [selectedBranch, setSelectedBranch] = useState("Herohalli");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set(),
  );
  const [selectAllPending, setSelectAllPending] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({
    current: 0,
    total: 0,
  });

  // Fetch students when branch/month changes
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await getStudents(selectedBranch, selectedMonth, false, feeYear);
        setStudents(data);
        // Auto-select pending students if toggle is on
        if (selectAllPending) {
          const pendingIds = new Set(
            data
              .filter(
                (s) => s.monthStatus === "Pending" && s.status === "Active",
              )
              .map((s) => s.id),
          );
          setSelectedStudents(pendingIds);
        }
      } catch {
        setLoadError("Unable to load students. Please retry.");
      } finally {
        setLoading(false);
      }
    };

    if (!checking && user) {
      fetchStudents();
    }
  }, [checking, selectedBranch, selectedMonth, user, selectAllPending, feeYear]);

  // Filter pending students - STRICT FILTER
  // ONLY show students where monthStatus is EXACTLY "Pending"
  // This automatically excludes: Paid, Break, Discontinued, N/A, or any other value
  const pendingStudents = useMemo(
    () =>
      students.filter((s) => {
        // Must have monthStatus exactly "Pending"
        if (s.monthStatus !== "Pending") return false;
        // Must have status exactly "Active" (not Discontinued, Break, etc.)
        if (s.status !== "Active") return false;
        return true;
      }),
    [students],
  );

  // Get selected students list
  const selectedStudentsList = useMemo(
    () => pendingStudents.filter((s) => selectedStudents.has(s.id)),
    [pendingStudents, selectedStudents],
  );

  // Calculate total pending amount for selected students
  const totalPendingAmount = useMemo(
    () => selectedStudentsList.reduce((sum, s) => sum + s.fee, 0),
    [selectedStudentsList],
  );

  // Replace placeholders in message
  const replacePlaceholders = (template: string, student: Student): string => {
    const branchName =
      selectedBranch === "Herohalli" ? "HEROHALLI" : "MP SPORTS CLUB";
    return template
      .replace(/{student_name}/g, student.name || "Student")
      .replace(/{parent_name}/g, student.parentName || "Parent")
      .replace(/{pending_amount}/g, `₹${student.fee}`)
      .replace(/{month}/g, MONTHS[selectedMonth])
      .replace(/{branch}/g, branchName)
      .replace(/{skf_id}/g, student.id);
  };

  // Check if message has unresolved placeholders
  const hasUnresolvedPlaceholders = (message: string): boolean => {
    return /{[^}]+}/g.test(message);
  };

  // Insert placeholder at cursor
  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById(
      "message-template",
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText =
        messageTemplate.substring(0, start) +
        placeholder +
        messageTemplate.substring(end);
      setMessageTemplate(newText);
      // Reset cursor position after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + placeholder.length,
          start + placeholder.length,
        );
      }, 0);
    }
  };

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    setSelectAllPending(false);
  };

  // Toggle select all pending
  const handleSelectAllToggle = () => {
    if (selectAllPending) {
      setSelectAllPending(false);
      setSelectedStudents(new Set());
    } else {
      setSelectAllPending(true);
      const pendingIds = new Set(pendingStudents.map((s) => s.id));
      setSelectedStudents(pendingIds);
    }
  };

  // Open WhatsApp Business with message
  // Using wa.me is faster and often defaults to correct app
  const openWhatsAppBusiness = (phone: string, message: string) => {
    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = String(phone).replace(/[\s\-\(\)]/g, "");

    // Add India country code if not present
    if (!cleanPhone.startsWith("+")) {
      if (cleanPhone.startsWith("91")) {
        cleanPhone = "+" + cleanPhone;
      } else {
        cleanPhone = "+91" + cleanPhone;
      }
    }

    // Remove + for the URL
    const phoneNoPlus = cleanPhone.replace("+", "");

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Use wa.me short link - faster resolution
    const whatsappUrl = `https://wa.me/${phoneNoPlus}?text=${encodedMessage}`;

    // Validate valid window
    const newWindow = window.open(whatsappUrl, "_blank");
    if (
      !newWindow ||
      newWindow.closed ||
      typeof newWindow.closed === "undefined"
    ) {
      window.location.href = whatsappUrl;
    }
  };

  // Preview message for a student
  const handlePreview = () => {
    if (selectedStudentsList.length > 0) {
      setPreviewStudent(selectedStudentsList[0]);
      setShowPreviewModal(true);
    }
  };

  // Send messages to all selected students
  const handleSendAll = async () => {
    if (selectedStudentsList.length === 0) return;

    setSending(true);
    setSendingProgress({ current: 0, total: selectedStudentsList.length });

    // Iterate
    for (let i = 0; i < selectedStudentsList.length; i++) {
      const student = selectedStudentsList[i];
      const message = replacePlaceholders(messageTemplate, student);

      const phone = String(student.whatsapp || student.phone || "");
      if (phone) {
        openWhatsAppBusiness(phone, message);
      }

      setSendingProgress({
        current: i + 1,
        total: selectedStudentsList.length,
      });

      // Reduced delay for faster sending - 500ms
      // Just enough to allow browser to open tab without crashing
      if (i < selectedStudentsList.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setSending(false);
  };

  if (checking || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* Header */}
      <Navbar
        title="FEE REMINDERS"
        showBack
        rightContent={
          <button
            onClick={() => setShowHelpModal(true)}
            className="text-[var(--text-muted)] hover:text-cyan-400 transition-colors p-2"
            title="Placeholder Guide"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        }
      />

      <main className="max-w-2xl mx-auto p-4 pt-24 space-y-6">
        {/* Message Template Section */}
        <section className="glass-card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-space)] text-lg tracking-wider text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              COMPOSE MESSAGE
            </h2>
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              Placeholder Guide
            </button>
          </div>

          <textarea
            id="message-template"
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="input-field h-48 resize-none font-mono text-sm"
            placeholder="Type your message here. Use placeholders like {student_name} to personalize..."
          />

          {/* Quick Insert Buttons */}
          <div className="mt-3">
            <p className="text-xs text-[var(--text-muted)] mb-2">Quick Insert:</p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => insertPlaceholder(p.key)}
                  className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-cyan-400 
                             hover:bg-white/10 hover:border-cyan-500/50 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Select Recipients Section */}
        <section className="glass-card p-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <h2 className="font-[family-name:var(--font-space)] text-lg tracking-wider text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            SELECT RECIPIENTS
          </h2>

          {/* Branch & Month Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor="message-branch" className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1 font-medium">
                Branch
              </label>
              <select
                id="message-branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input-field"
              >
                <option value="Herohalli">Herohalli</option>
                <option value="MPSC">MP Sports Club</option>
              </select>
            </div>
            <div>
              <label htmlFor="message-month" className="text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-1 font-medium">
                Month
              </label>
              <select
                id="message-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input-field"
              >
                {MONTHS_SHORT.map((m, i) => (
                  <option key={m} value={i}>
                    {m} {feeYear}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select All Toggle */}
          <button
            onClick={handleSelectAllToggle}
            className={`w-full mb-4 p-3 border rounded-lg flex items-center justify-between transition-all duration-200
                       ${selectAllPending
                ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                : "bg-white/5 border-white/10 text-[var(--text-muted)] hover:border-cyan-500/30"
              }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {selectAllPending ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              All Pending Students
            </span>
            <span className="text-sm opacity-70">({pendingStudents.length} students)</span>
          </button>

          {/* Student List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="spinner mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-sm">Loading students...</p>
            </div>
          ) : loadError ? (
            <div className="text-center py-8 text-red-400 text-sm">
              {loadError}
            </div>
          ) : pendingStudents.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              No pending students for this month.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 border border-[var(--border)] rounded-lg p-2 bg-[#000000]/20">
              {pendingStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between transition-all duration-200 text-left
                             ${selectedStudents.has(student.id)
                      ? "bg-cyan-500/10 border border-cyan-500/30"
                      : "bg-transparent border border-transparent hover:bg-white/5"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedStudents.has(student.id) ? (
                      <CheckSquare className="w-5 h-5 text-cyan-400 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                    )}
                    <div>
                      <p className="text-white font-medium text-sm">
                        {student.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{student.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-mono text-sm">₹{student.fee}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {student.whatsapp || student.phone || "No phone"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selection Summary */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-[var(--border)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Selected Students:</span>
              <span className="text-cyan-400 font-bold">
                {selectedStudentsList.length}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-[var(--text-muted)]">Total Pending:</span>
              <span className="text-cyan-400 font-mono font-bold">
                ₹{totalPendingAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <button
            onClick={handlePreview}
            disabled={selectedStudentsList.length === 0}
            className="p-4 rounded-lg text-gray-200 font-medium tracking-wide
                       border border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 text-sm"
          >
            <Eye className="w-5 h-5" />
            Preview Message
          </button>
          <button
            onClick={handleSendAll}
            disabled={selectedStudentsList.length === 0 || sending}
            className="p-4 bg-gradient-to-r from-cyan-600 to-cyan-700 border border-cyan-500/50 rounded-lg 
                       text-white font-bold hover:from-cyan-500 hover:to-cyan-600 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-900/20"
          >
            <Send className="w-5 h-5" />
            {sending
              ? `Sending (${sendingProgress.current}/${sendingProgress.total})`
              : "Send via WhatsApp"}
          </button>
        </div>

        {/* Note about WhatsApp Business */}
        <p className="text-center text-xs text-[var(--text-muted)] opacity-70">
          Messages will open in WhatsApp Business app on your device
        </p>
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="glass-modal-overlay">
          <div className="glass-modal !max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[#0F0F0F] z-10 backdrop-blur-xl">
              <h3 className="font-[family-name:var(--font-space)] text-lg tracking-wider text-cyan-400">
                PLACEHOLDER GUIDE
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Use these placeholders in your message. They will be
                automatically replaced with actual student data when sending.
              </p>

              {PLACEHOLDERS.map((p) => (
                <div
                  key={p.key}
                  className="bg-white/5 p-3 rounded-lg border border-white/10"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-cyan-400 text-sm font-mono bg-cyan-900/20 px-1 rounded">
                      {p.key}
                    </code>
                    <span className="text-xs text-[var(--text-muted)]">{p.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{p.description}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Example: <span className="text-green-400">{p.example}</span>
                  </p>
                </div>
              ))}

              <div className="mt-4 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/80">
                    Make sure placeholders are typed exactly as shown, including
                    the curly braces. The preview will show you how the message
                    will look before sending.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewStudent && (
        <div className="glass-modal-overlay">
          <div className="glass-modal !max-w-md">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-space)] text-lg tracking-wider text-cyan-400">
                MESSAGE PREVIEW
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-[var(--text-muted)] mb-2">
                Preview for:{" "}
                <span className="text-cyan-400">{previewStudent.name}</span>
              </p>

              {/* Check for unresolved placeholders */}
              {hasUnresolvedPlaceholders(
                replacePlaceholders(messageTemplate, previewStudent),
              ) && (
                  <div className="mb-3 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200/80">
                        Warning: Your message contains unrecognized placeholders
                        that won&apos;t be replaced. Please check your template.
                      </p>
                    </div>
                  </div>
                )}

              <div className="bg-white/5 p-4 rounded-lg border border-white/10 whitespace-pre-wrap text-[var(--text-secondary)] text-sm font-mono">
                {replacePlaceholders(messageTemplate, previewStudent)}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 p-3 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] 
                             hover:bg-white/5 transition-all text-sm"
                >
                  Edit Template
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleSendAll();
                  }}
                  className="flex-1 p-3 bg-gradient-to-r from-cyan-600 to-cyan-700 border border-cyan-500/50 
                             rounded-lg text-white font-bold hover:from-cyan-500 hover:to-cyan-600 transition-all
                             flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-900/20"
                >
                  <Send className="w-4 h-4" />
                  Send All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
