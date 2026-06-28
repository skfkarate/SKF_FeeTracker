"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useToast } from "@/lib/use-toast";
import {
  Award,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  ExternalLink,
  FilePlus2,
  Image as ImageIcon,
  IndianRupee,
  Loader2,
  PencilLine,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import {
  addEventDeposit,
  addEventExpense,
  assignEventStudent,
  createEvent,
  deleteEvent,
  EventAthleteSearchResult,
  EventCertificateSummary,
  EventCollectionItem,
  EventFeeConfig,
  EventFeeOverride,
  EventFeePreviewRow,
  EventResultRecord,
  generateEventFees,
  getEventCollections,
  getEventCertificates,
  getStudents,
  previewEventFees,
  prepareEventCertificates,
  publishEventCertificates,
  publishEventResults,
  removeEventStudent,
  saveEventResults,
  searchEventAthletes,
  syncBeltExamParticipants,
  updateEvent,
  upsertEventFeeConfig,
  getEventGalleryPhotos,
  uploadGalleryPhoto,
  upsertGalleryPhoto,
  deleteGalleryPhoto,
  GalleryPhoto,
  type Student,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getCurrentFeeYear } from "@/lib/fee-year";
import { normalizeKarateMediaUrl } from "@/lib/media-url";
import { ConfirmModal } from "@/components/common/ConfirmModal";

type EventStep = "details" | "students" | "fees" | "results" | "photos";

const BRANCHES = [
  { value: "Overall", label: "All Branches", admin: "" },
  { value: "MPSC", label: "MPSC", admin: "M P Sports Club" },
  { value: "Herohalli", label: "Herohalli", admin: "Herohalli" },
];

const EVENT_FILTERS = [
  { value: "all", label: "All" },
  { value: "belt_exam", label: "Belt Exams" },
  { value: "tournament", label: "Tournaments" },
  { value: "event", label: "Events" },
  { value: "other", label: "Other" },
];

const EVENT_CREATE_TYPES = [
  { value: "tournament", label: "Tournament" },
  { value: "grading", label: "Grading" },
  { value: "seminar", label: "Seminar" },
  { value: "camp", label: "Camp" },
  { value: "fun", label: "Fun Event" },
  { value: "other", label: "Other" },
];

const TOURNAMENT_LEVELS = [
  { value: "inter-dojo", label: "Inter-Dojo" },
  { value: "district", label: "District" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const EVENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

const BELTS = ["white", "yellow", "orange", "green", "blue", "brown", "black"];
const BELT_OPTIONS = [
  { value: "white", label: "White Belt" },
  { value: "yellow", label: "Yellow Belt" },
  { value: "orange", label: "Orange Belt" },
  { value: "green", label: "Green Belt" },
  { value: "blue", label: "Blue Belt" },
  { value: "brown", label: "Brown Belt" },
  { value: "black", label: "Black Belt" },
];

const UNIFIED_BELT_PRICES = {
  yellow: 1000,
  orange: 1100,
  "green-ii": 1200,
  "green-i": 1300,
  blue: 1400,
  purple: 1500,
  "brown-iii": 1750,
  "brown-ii": 2000,
  "brown-i": 2500,
};

const BELT_EXAM_PRICE_PRESETS: Record<string, {
  defaultAmount: number;
  beltPrices: Record<string, number>;
  notes: string;
}> = {
  "M P Sports Club": {
    defaultAmount: 1000,
    beltPrices: UNIFIED_BELT_PRICES,
    notes: "Belt examination fee includes grading assessment, certificate, belt, gift and snacks.",
  },
  Herohalli: {
    defaultAmount: 1000,
    beltPrices: UNIFIED_BELT_PRICES,
    notes: "Belt examination fee includes grading assessment, certificate, belt, gift and snacks.",
  },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function adminBranch(value: string) {
  return BRANCHES.find((branch) => branch.value === value)?.admin || "";
}

function eventBranchLabel(value?: string | null) {
  const branch = String(value || "").trim();
  const normalized = branch.toLowerCase();

  if (!branch || ["overall", "all", "all branch", "all branches", "both"].includes(normalized)) {
    return "All Branch";
  }

  return BRANCHES.find((item) => item.value === branch || item.admin === branch)?.label || branch;
}

function freshEventForm(branch = "Overall") {
  return {
    name: "",
    type: "grading",
    level: "district",
    status: "upcoming",
    date: today(),
    endDate: "",
    venue: "",
    city: "Bengaluru",
    state: "Karnataka",
    description: "",
    affiliatedBody: "",
    totalParticipants: "",
    skfParticipants: "",
    hostingBranch: adminBranch(branch),
    isPublished: false,
    showInJourney: true,
  };
}

function currency(amount: number) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function studentName(student: EventAthleteSearchResult) {
  return `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.skfId || "SKF Student";
}

function activeStudent(student: Student) {
  return String(student.status || "").toLowerCase() === "active";
}

function branchNameForRoster(value?: string | null): Array<"MPSC" | "Herohalli"> {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "mpsc" || normalized.includes("sports") || normalized.includes("mp")) return ["MPSC"];
  if (normalized.includes("herohalli")) return ["Herohalli"];
  return ["MPSC", "Herohalli"];
}

function studentToEventAthlete(student: Student, branchName: "MPSC" | "Herohalli"): EventAthleteSearchResult {
  const [firstName, ...lastParts] = String(student.name || student.id || "SKF Student").trim().split(/\s+/);
  const beltSource = student as Student & { belt?: string; currentBelt?: string };
  return {
    id: student.id,
    skfId: student.id,
    firstName: firstName || student.id,
    lastName: lastParts.join(" "),
    branchName,
    currentBelt: beltSource.currentBelt || beltSource.belt || student.trainingExperience || "",
    photoUrl: student.photoUrl,
  };
}

function athleteKey(athlete: Pick<EventAthleteSearchResult, "id" | "skfId">) {
  return athlete.id || athlete.skfId;
}

function eventTypeLabel(type?: string) {
  if (type === "tournament") return "Tournament";
  if (type === "grading") return "Grading";
  if (type === "seminar") return "Seminar";
  if (type === "camp") return "Camp";
  if (type === "fun") return "Fun Event";
  return type ? type.replace(/[-_]/g, " ") : "Event";
}

function isBeltEvent(type?: string) {
  const value = String(type || "").toLowerCase();
  return value.includes("belt") || value.includes("grading");
}

function isTournament(type?: string) {
  return String(type || "").toLowerCase() === "tournament";
}

function normalizeBeltValue(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  return BELTS.find((belt) => normalized.includes(belt)) || "";
}

function nextBeltValue(value?: string | null) {
  const current = normalizeBeltValue(value);
  const index = BELTS.indexOf(current);
  if (index < 0) return "";
  return BELTS[Math.min(index + 1, BELTS.length - 1)] || "";
}

function defaultConfig(event: EventCollectionItem): EventFeeConfig {
  const branchName = String(event.event.hostingBranch || "").trim();
  const preset = BELT_EXAM_PRICE_PRESETS[branchName] || null;
  const isBeltExam = isBeltEvent(event.event.type);
  return {
    eventId: event.event.id,
    feeCategory:
      event.config?.feeCategory ||
      (event.event.type === "tournament"
        ? "tournament"
        : isBeltExam
          ? "belt_exam"
          : "event"),
    targetingMode: event.config?.targetingMode || (isBeltExam ? "branch_and_eligibility" : "participants_only"),
    pricingMode: event.config?.pricingMode || "branch_belt",
    defaultAmount: event.config?.defaultAmount || preset?.defaultAmount || 0,
    dueDate: event.config?.dueDate || event.event.date || today(),
    branchScope: event.config?.branchScope?.length
      ? event.config.branchScope
      : event.event.hostingBranch
        ? [event.event.hostingBranch]
        : [],
    beltScope: event.config?.beltScope || [],
    branchPrices: event.config?.branchPrices || {},
    beltPrices: {
      ...(preset?.beltPrices || {}),
      ...(event.config?.beltPrices || {}),
    },
    branchBeltPrices: event.config?.branchBeltPrices || {},
    studentOverrides: event.config?.studentOverrides || [],
    notes: event.config?.notes || preset?.notes || "",
    status: event.config?.status || "draft",
  };
}

function rowTone(status: EventFeePreviewRow["status"]) {
  if (status === "ready") return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
  if (status === "waived") return "text-blue-400 border-blue-500/20 bg-blue-500/10";
  if (status === "excluded") return "text-zinc-500 border-zinc-700 bg-zinc-800/60";
  return "text-amber-400 border-amber-500/20 bg-amber-500/10";
}

function resultKey(result: EventResultRecord) {
  return result.participantId || result.skfId || result.athleteId || result.id || "";
}

function eventParticipants(event: EventCollectionItem | null | undefined) {
  return Array.isArray(event?.event?.participants) ? event.event.participants : [];
}

function eventResults(event: EventCollectionItem | null | undefined) {
  return Array.isArray(event?.event?.results) ? event.event.results : [];
}

function defaultResult(participant: EventCollectionItem["event"]["participants"][number], type: string): EventResultRecord {
  const base: EventResultRecord = {
    id: `res_${participant.id || participant.skfId}`,
    participantId: participant.id,
    athleteId: participant.athleteId,
    athleteName: participant.athleteName,
    skfId: participant.skfId,
    branchName: participant.branchName,
    belt: participant.belt,
    photoUrl: participant.photoUrl,
    notes: "",
    specialAward: "",
    promotionType: "normal",
  };

  if (isTournament(type)) {
    return {
      ...base,
      result: "participation",
      medal: "participation",
      category: "kata-individual",
      ageGroup: "sub-junior",
      weightCategory: "",
      wins: 0,
      difficultyLevel: "",
    };
  }

  if (isBeltEvent(type)) {
    const nextBelt = nextBeltValue(participant.belt);
    return {
      ...base,
      result: "pass",
      beltAwarded: nextBelt,
      promotion: nextBelt,
      examiner: "",
      grade: "",
      score: "",
    };
  }

  return {
    ...base,
    result: "attended",
    daysAttended: "",
  };
}

function buildResultDrafts(event: EventCollectionItem | null): EventResultRecord[] {
  if (!event) return [];
  const existing = eventResults(event);
  const byKey = new Map(existing.map((result) => [resultKey(result), result]));
  const drafts = eventParticipants(event).map((participant) => {
    const existingResult = byKey.get(participant.id) || byKey.get(participant.skfId);
    return {
      ...defaultResult(participant, event.event.type),
      ...existingResult,
      participantId: existingResult?.participantId || participant.id,
      athleteId: existingResult?.athleteId || participant.athleteId,
      athleteName: existingResult?.athleteName || participant.athleteName,
      skfId: existingResult?.skfId || participant.skfId,
      branchName: existingResult?.branchName || participant.branchName,
      belt: existingResult?.belt || participant.belt,
      photoUrl: existingResult?.photoUrl || participant.photoUrl,
    };
  });
  const participantKeys = new Set(drafts.map(resultKey));
  const unmatched = existing.filter((result) => !participantKeys.has(resultKey(result)));
  return [...drafts, ...unmatched];
}

function resultSummary(event: EventCollectionItem | null) {
  if (!event) return { assigned: 0, recorded: 0, recognitions: 0 };
  const participants = eventParticipants(event);
  const results = eventResults(event);
  return {
    assigned: participants.length,
    recorded: results.length,
    recognitions: results.filter((result) => result.specialAward || result.award).length,
  };
}

export default function EventCollectionsPage() {
  const { user, checking } = useFeeTrackAuth();
  const feeYear = getCurrentFeeYear();
  const [branch, setBranch] = useState("Overall");
  const [typeFilter, setTypeFilter] = useState("all");
  const [step, setStep] = useState<EventStep>("details");
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getEventCollections>> | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [config, setConfig] = useState<EventFeeConfig | null>(null);
  const [previewRows, setPreviewRows] = useState<EventFeePreviewRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, EventFeeOverride>>({});
  const [resultDrafts, setResultDrafts] = useState<EventResultRecord[]>([]);
  const [certificateSummary, setCertificateSummary] = useState<EventCertificateSummary | null>(null);
  const [certificateBusy, setCertificateBusy] = useState<"" | "load" | "prepare" | "publish">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expense, setExpense] = useState({ title: "", amount: "", branchScope: "Both" });
  const [deposit, setDeposit] = useState({ amount: "", branchScope: "Both", reference: "" });
  const [eventForm, setEventForm] = useState(() => freshEventForm("Overall"));
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState("");
  const [deletingEventId, setDeletingEventId] = useState("");
  const [athleteQuery, setAthleteQuery] = useState("");
  const [athleteResults, setAthleteResults] = useState<EventAthleteSearchResult[]>([]);
  const [branchRoster, setBranchRoster] = useState<EventAthleteSearchResult[]>([]);
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(() => new Set());
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [searchingAthletes, setSearchingAthletes] = useState(false);
  const [assignmentBusyId, setAssignmentBusyId] = useState("");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
  } | null>(null);

  const selectedEvent = useMemo(
    () => data?.events.find((item) => item.event.id === selectedEventId) || null,
    [data, selectedEventId],
  );
  const selectedParticipants = eventParticipants(selectedEvent);
  const selectedSummary = resultSummary(selectedEvent);

  const filteredEvents = useMemo(() => {
    const events = data?.events || [];
    if (typeFilter === "all") return events;
    return events.filter((item) => (item.config?.feeCategory || defaultConfig(item).feeCategory) === typeFilter);
  }, [data, typeFilter]);

  const previewSummary = useMemo(() => ({
    ready: previewRows.filter((row) => row.status === "ready").length,
    waived: previewRows.filter((row) => row.status === "waived").length,
    review: previewRows.filter((row) => row.status === "needs_review").length,
    total: previewRows.filter((row) => row.status === "ready").reduce((sum, row) => sum + row.finalAmount, 0),
  }), [previewRows]);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!user || checking) return;
    setLoading(true);
    setError("");
    try {
      const result = await getEventCollections(branch, feeYear, forceRefresh);
      setData(result);
      const next = selectedEventId
        ? result.events.find((item) => item.event.id === selectedEventId) || result.events[0]
        : result.events[0];
      if (next) {
        setSelectedEventId(next.event.id);
        const nextConfig = defaultConfig(next);
        setConfig(nextConfig);
        setOverrides(Object.fromEntries(nextConfig.studentOverrides.map((override) => [override.skfId, override])));
        setResultDrafts(buildResultDrafts(next));
        setCertificateSummary(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [branch, checking, feeYear, selectedEventId, user]);

  const loadEventCertificateSummary = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setCertificateBusy("load");
    try {
      const result = await getEventCertificates(eventId);
      setCertificateSummary(result.certificateSummary);
    } catch (err) {
      setCertificateSummary(null);
      setError(err instanceof Error ? err.message : "Failed to load certificate status");
    } finally {
      setCertificateBusy("");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadData]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setResultDrafts(selectedEvent ? buildResultDrafts(selectedEvent) : []);
      setSelectedRosterIds(new Set());
    }, 0);
    return () => window.clearTimeout(id);
  }, [selectedEvent]);

  useEffect(() => {
    if (step !== "results" || !selectedEvent) return;
    const id = window.setTimeout(() => {
      void loadEventCertificateSummary(selectedEvent.event.id);
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadEventCertificateSummary, selectedEvent, step]);

  const loadBranchRoster = useCallback(async () => {
    if (!selectedEvent) {
      setBranchRoster([]);
      return;
    }

    setLoadingRoster(true);
    try {
      const branches = branchNameForRoster(selectedEvent.event.hostingBranch);
      const currentMonth = new Date().getMonth();
      const rows = await Promise.all(
        branches.map(async (branchName) => {
          const students = await getStudents(branchName, currentMonth, false, feeYear);
          return students
            .filter(activeStudent)
            .map((student) => studentToEventAthlete(student, branchName));
        }),
      );

      setBranchRoster(
        rows
          .flat()
          .sort((a, b) => (a.branchName || "").localeCompare(b.branchName || "") || studentName(a).localeCompare(studentName(b))),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branch students");
      setBranchRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [feeYear, selectedEvent]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBranchRoster();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBranchRoster]);

  function selectEvent(item: EventCollectionItem) {
    setSelectedEventId(item.event.id);
    const next = defaultConfig(item);
    setConfig(next);
    setOverrides(Object.fromEntries(next.studentOverrides.map((override) => [override.skfId, override])));
    setPreviewRows([]);
    setResultDrafts(buildResultDrafts(item));
    setCertificateSummary(null);
    setNotice("");
    setError("");
  }

  async function reloadAndSelect(eventId = selectedEventId) {
    const result = await getEventCollections(branch, feeYear, true);
    setData(result);
    const next = result.events.find((item) => item.event.id === eventId) || result.events[0];
    if (next) selectEvent(next);
    return next || null;
  }

  function startNewEvent() {
    setEditingEventId("");
    setEventForm(freshEventForm(branch));
    setEventEditorOpen(true);
    setStep("details");
    setNotice("");
    setError("");
  }

  function closeEventEditor() {
    if (creatingEvent) return;
    setEventEditorOpen(false);
    setEditingEventId("");
    setEventForm(freshEventForm(branch));
  }

  function handleEditSelectedEvent() {
    if (!selectedEvent) return;
    const event = selectedEvent.event;
    setEditingEventId(event.id);
    setEventForm({
      name: event.name || "",
      type: event.type || "grading",
      level: event.level || "district",
      status: event.status || "upcoming",
      date: event.date || today(),
      endDate: event.endDate || "",
      venue: event.venue || "",
      city: event.city || "Bengaluru",
      state: event.state || "Karnataka",
      description: event.description || "",
      affiliatedBody: "",
      totalParticipants: event.totalParticipants ? String(event.totalParticipants) : "",
      skfParticipants: event.skfParticipants ? String(event.skfParticipants) : "",
      hostingBranch: event.hostingBranch || "",
      isPublished: Boolean(event.isPublished),
      showInJourney: event.showInJourney ?? true,
    });
    setEventEditorOpen(true);
    setStep("details");
    setNotice("");
    setError("");
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventForm.name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!eventForm.date) {
      setError("Event date is required.");
      return;
    }

    setCreatingEvent(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...eventForm,
        name: eventForm.name.trim(),
        shortName: eventForm.name.trim(),
        venue: eventForm.venue.trim(),
        city: eventForm.city.trim(),
        state: eventForm.state.trim() || "Karnataka",
        description: eventForm.description.trim(),
        affiliatedBody: eventForm.affiliatedBody.trim(),
        totalParticipants: Number(eventForm.totalParticipants || 1),
        skfParticipants: Number(eventForm.skfParticipants || 0),
      };
      const saved = editingEventId
        ? await updateEvent(editingEventId, payload)
        : await createEvent(payload);
      await reloadAndSelect(saved.id);
      setEventForm(freshEventForm(branch));
      setEditingEventId("");
      setEventEditorOpen(false);
      setStep("students");
      setNotice(editingEventId ? `Event updated: ${saved.name}.` : `Event created: ${saved.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleDeleteSelectedEvent() {
    if (!selectedEvent) return;
    setConfirmState({
      open: true,
      title: "Delete Event",
      message: `Delete ${selectedEvent.event.name}? Events with FeeTrack financial activity will be blocked.`,
      variant: "danger",
      onConfirm: async () => {
        setDeletingEventId(selectedEvent.event.id);
        setError("");
        setNotice("");
        try {
          await deleteEvent(selectedEvent.event.id);
          const result = await getEventCollections(branch, feeYear, true);
          setData(result);
          const next = result.events[0];
          if (next) selectEvent(next);
          else {
            setSelectedEventId("");
            setConfig(null);
            setPreviewRows([]);
            setResultDrafts([]);
          }
          setEditingEventId("");
          setEventEditorOpen(false);
          setEventForm(freshEventForm(branch));
          setNotice("Event deleted.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete event");
        } finally {
          setDeletingEventId("");
        }
      },
    });
  }

  async function handleAthleteSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const query = athleteQuery.trim();
    if (query.length < 2) {
      setAthleteResults([]);
      setError("Search with at least 2 characters.");
      return;
    }
    setSearchingAthletes(true);
    setError("");
    try {
      const results = await searchEventAthletes(query);
      setAthleteResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search students");
      setAthleteResults([]);
    } finally {
      setSearchingAthletes(false);
    }
  }

  async function handleAssignAthlete(athlete: EventAthleteSearchResult) {
    if (!selectedEvent) return;
    const busyId = athleteKey(athlete);
    setAssignmentBusyId(busyId);
    setError("");
    setNotice("");
    try {
      await assignEventStudent(selectedEvent.event.id, athlete);
      const updated = await reloadAndSelect(selectedEvent.event.id);
      setNotice(`${studentName(athlete)} assigned to ${updated?.event.name || selectedEvent.event.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign student");
    } finally {
      setAssignmentBusyId("");
    }
  }

  function toggleRosterSelection(athlete: EventAthleteSearchResult, checked: boolean) {
    const key = athleteKey(athlete);
    setSelectedRosterIds((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleAllRosterSelection(athletes: EventAthleteSearchResult[], checked: boolean) {
    setSelectedRosterIds((current) => {
      const next = new Set(current);
      athletes.forEach((athlete) => {
        const key = athleteKey(athlete);
        if (checked) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }

  async function handleBulkAssignAthletes(athletes: EventAthleteSearchResult[]) {
    if (!selectedEvent || athletes.length === 0) return;
    setAssignmentBusyId("__bulk__");
    setError("");
    setNotice("");
    try {
      for (const athlete of athletes) {
        await assignEventStudent(selectedEvent.event.id, athlete);
      }
      const updated = await reloadAndSelect(selectedEvent.event.id);
      setSelectedRosterIds(new Set());
      setNotice(`${athletes.length} student${athletes.length === 1 ? "" : "s"} assigned to ${updated?.event.name || selectedEvent.event.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign selected students");
    } finally {
      setAssignmentBusyId("");
    }
  }

  async function handleSyncEligibleBeltExamParticipants() {
    if (!selectedEvent) return;
    setConfirmState({
      open: true,
      title: "Sync Eligible Students",
      message: "Sync eligible students for this belt examination using the event date, branch, active billing status, six-month rule, break history, and black-belt exclusion?",
      onConfirm: async () => {
        setAssignmentBusyId("__belt_exam_sync__");
        setError("");
        setNotice("");
        try {
          const result = await syncBeltExamParticipants(selectedEvent.event.id);
          const updated = await reloadAndSelect(selectedEvent.event.id);
          const summary = result.summary;
          setSelectedRosterIds(new Set());
          setNotice(`Synced ${updated?.event.name || selectedEvent.event.name}: added ${summary.added}, already assigned ${summary.alreadyAssigned}, review ${summary.needsReview}, excluded ${summary.excluded}.`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to sync eligible belt examination students");
        } finally {
          setAssignmentBusyId("");
        }
      },
    });
  }

  async function handleRemoveParticipant(participantId: string, skfId: string) {
    if (!selectedEvent) return;
    setConfirmState({
      open: true,
      title: "Remove Student",
      message: "Remove this student from the selected event?",
      variant: "danger",
      onConfirm: async () => {
        setAssignmentBusyId(participantId || skfId);
        setError("");
        setNotice("");
        try {
          await removeEventStudent({ eventId: selectedEvent.event.id, participantId, skfId });
          await reloadAndSelect(selectedEvent.event.id);
          setNotice("Assignment updated.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to remove student");
        } finally {
          setAssignmentBusyId("");
        }
      },
    });
  }

  function updateBranchPrice(branchName: string, amount: string) {
    setConfig((current) => current ? {
      ...current,
      branchPrices: { ...current.branchPrices, [branchName]: Number(amount || 0) },
    } : current);
  }

  function updateBeltPrice(beltKey: string, amount: string) {
    setConfig((current) => current ? {
      ...current,
      beltPrices: { ...current.beltPrices, [beltKey]: Number(amount || 0) },
    } : current);
  }

  function updateOverride(skfId: string, patch: Partial<EventFeeOverride>) {
    setOverrides((current) => ({
      ...current,
      [skfId]: {
        ...(current[skfId] || {}),
        ...patch,
        skfId,
      },
    }));
  }

  async function handleSaveAndPreview() {
    if (!config) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const overrideList = Object.values(overrides);
      const saved = await upsertEventFeeConfig({ ...config, studentOverrides: overrideList });
      setConfig(saved);
      const preview = await previewEventFees(saved.eventId, { ...saved, studentOverrides: overrideList });
      setPreviewRows(preview.rows);
      setNotice("Fee preview ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview event fees");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!config) return;
    const payable = previewRows.filter((row) => row.status === "ready" || row.status === "waived");
    if (payable.length === 0) {
      setError("Preview has no payable students. Resolve review rows or enter the grading fee first.");
      return;
    }
    const reviewCount = previewRows.filter((row) => row.status === "needs_review" || row.status === "excluded").length;
    const isBeltFee = config.feeCategory === "belt_exam";
    const expectedTotal = previewSummary.total;
    const expenseTotal = selectedEvent?.finance.spent || 0;
    const savingsAmount = Math.max(0, expectedTotal - expenseTotal);
    setConfirmState({
      open: true,
      title: isBeltFee ? "Settle Grading Savings" : "Generate Pending Fees",
      message: isBeltFee
        ? `Settle grading savings for ${payable.length} students?\n\nExpected: ${currency(expectedTotal)}\nExpenses: ${currency(expenseTotal)}\nSavings: ${currency(savingsAmount)}\n\n${reviewCount} review/excluded rows will be skipped.`
        : `Generate pending fees for ${payable.length} students totaling ${currency(previewSummary.total)}? ${reviewCount} review/excluded rows will be skipped.`,
      variant: "default",
      onConfirm: async () => {
        setSaving(true);
        setError("");
        try {
          const result = await generateEventFees(config.eventId, Object.values(overrides));
          if (isBeltFee && config.status !== "settled") {
            await upsertEventFeeConfig({ ...config, status: "settled" });
          }
          const finalSavings = Math.max(0, (selectedEvent?.collection.expected || expectedTotal) - (selectedEvent?.finance.spent || 0));
          setNotice(
            isBeltFee
              ? `Grading settled: ${result.createdOrUpdated} dues, ${result.waived} waived, ${result.skipped} skipped. Savings: ${currency(finalSavings)}.`
              : `Generated ${result.createdOrUpdated} dues, waived ${result.waived}, skipped ${result.skipped}.`
          );
          await loadData(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to generate event fees");
        } finally {
          setSaving(false);
        }
      },
    });
  }

  async function handleAddExpense() {
    if (!selectedEvent || !expense.title.trim() || !expense.amount) return;
    setSaving(true);
    try {
      await addEventExpense({
        eventId: selectedEvent.event.id,
        title: expense.title.trim(),
        amount: Number(expense.amount),
        branchScope: expense.branchScope,
      });
      setExpense({ title: "", amount: "", branchScope: "Both" });
      setNotice("Expense recorded.");
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDeposit() {
    if (!selectedEvent || !deposit.amount) return;
    setSaving(true);
    try {
      await addEventDeposit({
        eventId: selectedEvent.event.id,
        amount: Number(deposit.amount),
        branchScope: deposit.branchScope,
        reference: deposit.reference,
      });
      setDeposit({ amount: "", branchScope: "Both", reference: "" });
      setNotice("Deposit recorded.");
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record deposit");
    } finally {
      setSaving(false);
    }
  }

  function updateResult(index: number, patch: Partial<EventResultRecord>) {
    setResultDrafts((current) => current.map((result, i) => {
      if (i !== index) return result;
      const next = { ...result, ...patch };
      if (patch.medal) next.result = patch.medal;
      if (patch.promotionType) next.doublePromotion = patch.promotionType === "double";
      return next;
    }));
    setCertificateSummary(null);
  }

  async function handleSaveResults(publish = false) {
    if (!selectedEvent) return;
    if (resultDrafts.length === 0) {
      setError("Assign students before recording results.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = publish
        ? await publishEventResults(selectedEvent.event.id, resultDrafts)
        : { event: await saveEventResults(selectedEvent.event.id, resultDrafts) };
      await reloadAndSelect(result.event.id);
      setNotice(publish ? "Results published to website, portal, and athlete profiles." : "Result draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save results");
    } finally {
      setSaving(false);
    }
  }

  async function handlePrepareCertificates() {
    if (!selectedEvent) return;
    if (resultDrafts.length === 0) {
      setError("Record outcomes before preparing certificates.");
      return;
    }

    setCertificateBusy("prepare");
    setError("");
    setNotice("");
    try {
      const result = await prepareEventCertificates(selectedEvent.event.id, resultDrafts);
      await reloadAndSelect(result.event.id);
      setCertificateSummary(result.certificateSummary);
      setNotice(`Prepared ${result.certificateSummary.preparedCount} certificate QR code${result.certificateSummary.preparedCount === 1 ? "" : "s"}. Skipped ${result.certificateSummary.skippedCount}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare certificate QR codes");
    } finally {
      setCertificateBusy("");
    }
  }

  function handlePublishCertificates() {
    if (!selectedEvent) return;
    const count = certificateSummary?.draftCount || certificateSummary?.preparedCount || resultDrafts.length;
    setConfirmState({
      open: true,
      title: "Publish Certificates",
      message: `Publish ${count} certificate${count === 1 ? "" : "s"} for ${selectedEvent.event.name}? QR scans, athlete portal certificates, and public verification will become visible.`,
      variant: "default",
      onConfirm: async () => {
        setCertificateBusy("publish");
        setError("");
        setNotice("");
        try {
          const result = await publishEventCertificates(selectedEvent.event.id, resultDrafts);
          await reloadAndSelect(result.event.id);
          setCertificateSummary(result.certificateSummary);
          setNotice(`Published ${result.certificateSummary.issuedCount} certificate${result.certificateSummary.issuedCount === 1 ? "" : "s"} for public verification.`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to publish certificates");
        } finally {
          setCertificateBusy("");
        }
      },
    });
  }

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Event Center" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-6 flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">SKF Karate Operations</p>
              <h1 className="font-[family-name:var(--font-space)] text-3xl text-white sm:text-4xl">Event Center</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startNewEvent}
                className="btn-primary min-h-10 rounded-lg px-4 text-sm flex items-center gap-2"
              >
                <FilePlus2 className="h-4 w-4" />
                New Event
              </button>
              <button
                type="button"
                onClick={() => loadData(true)}
                className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric icon={<CalendarDays className="h-4 w-4 text-amber-400" />} label="Events" value={String(data?.events.length || 0)} />
            <Metric icon={<Users className="h-4 w-4 text-emerald-400" />} label="Assigned" value={String(selectedSummary.assigned)} />
            <Metric icon={<Trophy className="h-4 w-4 text-blue-400" />} label="Results" value={String(selectedSummary.recorded)} />
            <Metric icon={<Award className="h-4 w-4 text-purple-300" />} label="Awards" value={String(selectedSummary.recognitions)} />
            <Metric icon={<Wallet className="h-4 w-4 text-zinc-300" />} label="Collected" value={currency(data?.totals.collected || 0)} />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row">
            <Segmented
              value={branch}
              options={BRANCHES.map(({ value, label }) => ({ value, label }))}
              onChange={(value) => {
                setBranch(value);
                setEventForm((current) => current.name.trim() ? current : { ...current, hostingBranch: adminBranch(value) });
              }}
            />
            <Segmented value={typeFilter} options={EVENT_FILTERS} onChange={setTypeFilter} />
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}

        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
            <aside className="card-panel h-fit p-3">
              <div className="space-y-2">
                {filteredEvents.map((item) => {
                  const published = item.event.isResultsPublished || item.event.resultsAppliedAt;
                  return (
                    <button
                      key={item.event.id}
                      type="button"
                      onClick={() => selectEvent(item)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        selectedEventId === item.event.id
                          ? "border-white/20 bg-white/[0.06]"
                          : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{item.event.name}</p>
                          <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-zinc-500">
                            {eventTypeLabel(item.event.type)} • {eventBranchLabel(item.event.hostingBranch)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {item.config?.status === "settled" && (
                            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase text-emerald-300">
                              Settled
                            </span>
                          )}
                          <span className={`rounded-md border px-2 py-1 text-[10px] uppercase ${
                            published ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900 text-zinc-500"
                          }`}>
                            {published ? "Published" : item.event.status || "Draft"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <span className="text-zinc-400">{eventParticipants(item).length} students</span>
                        <span className="text-emerald-400">{currency(item.collection.collected)}</span>
                        <span className="text-amber-400">{currency(item.collection.pending)}</span>
                      </div>
                    </button>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">No events found.</p>
                )}
              </div>
            </aside>

            <section className="space-y-5">
              <div className="card-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge>{selectedEvent ? eventTypeLabel(selectedEvent.event.type) : "No event selected"}</Badge>
                      {selectedEvent?.event.isPublished ? <Badge tone="green">Website visible</Badge> : <Badge>Internal</Badge>}
                      {selectedEvent?.event.resultsAppliedAt ? <Badge tone="green">Profiles synced</Badge> : <Badge>Results draft</Badge>}
                    </div>
                    <h2 className="truncate text-2xl font-semibold text-white">
                      {selectedEvent?.event.name || "Create or select an event"}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      {selectedEvent
                        ? `${selectedEvent.event.date || "No date"} • ${selectedEvent.event.venue || "Venue pending"} • ${eventBranchLabel(selectedEvent.event.hostingBranch)}`
                        : "Use the details step to create the next event."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleEditSelectedEvent}
                      disabled={!selectedEvent}
                      className="h-10 w-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white disabled:text-zinc-700 flex items-center justify-center"
                      title="Edit selected event"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedEvent}
                      disabled={!selectedEvent || deletingEventId === selectedEvent.event.id}
                      className="h-10 w-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:text-zinc-700 flex items-center justify-center"
                      title="Delete selected event"
                    >
                      {selectedEvent && deletingEventId === selectedEvent.event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-5">
                  {[
                    ["details", "Details"],
                    ["photos", "Photos"],
                    ["students", "Students"],
                    ["fees", "Fees"],
                    ["results", "Results"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStep(value as EventStep)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                        step === value
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {step === "details" && (
                <EventDetailsSummary
                  selectedEvent={selectedEvent}
                  onCreate={startNewEvent}
                  onEdit={handleEditSelectedEvent}
                />
              )}

              {step === "students" && (
                <StudentsStep
                  selectedEvent={selectedEvent}
                  selectedParticipants={selectedParticipants}
                  branchRoster={branchRoster}
                  selectedRosterIds={selectedRosterIds}
                  athleteQuery={athleteQuery}
                  athleteResults={athleteResults}
                  loadingRoster={loadingRoster}
                  searchingAthletes={searchingAthletes}
                  assignmentBusyId={assignmentBusyId}
                  setAthleteQuery={setAthleteQuery}
                  onSearch={handleAthleteSearch}
                  onAssign={handleAssignAthlete}
                  onBulkAssign={handleBulkAssignAthletes}
                  onSyncEligibleBeltExam={handleSyncEligibleBeltExamParticipants}
                  onToggleRosterSelection={toggleRosterSelection}
                  onToggleAllRosterSelection={toggleAllRosterSelection}
                  onRemove={handleRemoveParticipant}
                />
              )}

              {step === "fees" && selectedEvent && config && (
                <FeesStep
                  data={data}
                  selectedEvent={selectedEvent}
                  config={config}
                  setConfig={setConfig}
                  previewRows={previewRows}
                  previewSummary={previewSummary}
                  overrides={overrides}
                  saving={saving}
                  expense={expense}
                  deposit={deposit}
                  setExpense={setExpense}
                  setDeposit={setDeposit}
                  updateBranchPrice={updateBranchPrice}
                  updateBeltPrice={updateBeltPrice}
                  updateOverride={updateOverride}
                  onPreview={handleSaveAndPreview}
                  onGenerate={handleGenerate}
                  onAddExpense={handleAddExpense}
                  onAddDeposit={handleAddDeposit}
                />
              )}

              {step === "fees" && (!selectedEvent || !config) && <EmptyStep icon={<Wallet className="h-5 w-5" />} title="Select an event to manage fees." />}

              {step === "results" && (
                <ResultsStep
                  selectedEvent={selectedEvent}
                  resultDrafts={resultDrafts}
                  certificateSummary={certificateSummary}
                  certificateBusy={certificateBusy}
                  saving={saving}
                  updateResult={updateResult}
                  onSave={() => handleSaveResults(false)}
                  onPublish={() => handleSaveResults(true)}
                  onPrepareCertificates={handlePrepareCertificates}
                  onPublishCertificates={handlePublishCertificates}
                  onRefreshCertificates={() => selectedEvent && loadEventCertificateSummary(selectedEvent.event.id)}
                />
              )}

              {step === "photos" && (
                <PhotosStep selectedEvent={selectedEvent} />
              )}

            </section>
          </div>
        )}

        {eventEditorOpen ? (
          <div
            className="glass-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeEventEditor();
            }}
          >
            <DetailsStep
              eventForm={eventForm}
              editingEventId={editingEventId}
              creatingEvent={creatingEvent}
              onSubmit={handleCreateEvent}
              onCancel={closeEventEditor}
              setEventForm={setEventForm}
              isModal
            />
          </div>
        ) : null}

        <ConfirmModal
          open={confirmState?.open ?? false}
          title={confirmState?.title ?? ""}
          message={confirmState?.message ?? ""}
          variant={confirmState?.variant}
          onConfirm={() => {
            confirmState?.onConfirm();
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      </main>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card-panel p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="font-[family-name:var(--font-space)] text-xl text-white">{value}</p>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" }) {
  return (
    <span className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider ${
      tone === "green" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900 text-zinc-500"
    }`}>
      {children}
    </span>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold ${
            value === option.value ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function baseInputClass() {
  return "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600";
}

function EventDetailsSummary({
  selectedEvent,
  onCreate,
  onEdit,
}: {
  selectedEvent: EventCollectionItem | null;
  onCreate: () => void;
  onEdit: () => void;
}) {
  if (!selectedEvent) {
    return (
      <section className="card-panel flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
        <CalendarDays className="h-8 w-8 text-zinc-600" />
        <div>
          <h2 className="text-lg font-semibold text-white">No event selected</h2>
          <p className="mt-2 text-sm text-zinc-500">Create an event to assign students, fees and results.</p>
        </div>
        <button type="button" onClick={onCreate} className="btn-primary inline-flex min-h-10 items-center gap-2 px-4 text-sm">
          <FilePlus2 className="h-4 w-4" />
          New Event
        </button>
      </section>
    );
  }

  const event = selectedEvent.event;
  const participants = eventParticipants(selectedEvent);
  const published = event.isPublished ? "Visible" : "Internal";
  const resultStatus = event.resultsAppliedAt ? "Published" : "Draft";

  return (
    <section className="card-panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Event Details</p>
          <h2 className="truncate text-xl font-semibold text-white">{event.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {event.description || "No public description added yet."}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 hover:text-white"
        >
          <PencilLine className="h-4 w-4" />
          Edit Details
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Type</p>
          <p className="mt-2 text-sm font-semibold text-white">{eventTypeLabel(event.type)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Date</p>
          <p className="mt-2 text-sm font-semibold text-white">{event.date || "Pending"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Branch</p>
          <p className="mt-2 text-sm font-semibold text-white">{eventBranchLabel(event.hostingBranch)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Students</p>
          <p className="mt-2 text-sm font-semibold text-white">{participants.length}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Venue</p>
          <p className="mt-2 truncate text-sm font-semibold text-white">{event.venue || "Pending"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Website</p>
          <p className="mt-2 text-sm font-semibold text-white">{published}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Results</p>
          <p className="mt-2 text-sm font-semibold text-white">{resultStatus}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Collected</p>
          <p className="mt-2 text-sm font-semibold text-emerald-300">{currency(selectedEvent.collection.collected)}</p>
        </div>
      </div>
    </section>
  );
}

function DetailsStep({
  eventForm,
  editingEventId,
  creatingEvent,
  onSubmit,
  onCancel,
  setEventForm,
  isModal = false,
}: {
  eventForm: ReturnType<typeof freshEventForm>;
  editingEventId: string;
  creatingEvent: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  setEventForm: Dispatch<SetStateAction<ReturnType<typeof freshEventForm>>>;
  isModal?: boolean;
}) {
  const isTournamentEvent = eventForm.type === "tournament";

  return (
    <form
      onSubmit={onSubmit}
      className={`${isModal ? "glass-modal !max-w-4xl max-h-[90vh] overflow-y-auto" : "card-panel"} p-5 space-y-5`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400">
            {editingEventId ? <PencilLine className="h-4 w-4" /> : <FilePlus2 className="h-4 w-4" />}
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Step 1</p>
            <h2 className="text-lg font-medium text-white">{editingEventId ? "Edit Event" : "Create Event"}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          {(editingEventId || isModal) && (
            <button type="button" onClick={onCancel} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white" title="Cancel edit">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="submit" disabled={creatingEvent} className="btn-primary min-h-10 rounded-lg px-4 text-sm flex items-center gap-2">
            {creatingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEventId ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingEventId ? "Save" : "Create"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Event name">
          <input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} className={baseInputClass()} required />
        </Field>
        <Field label="Type">
          <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })} className={baseInputClass()}>
            {EVENT_CREATE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        {isTournamentEvent && (
          <Field label="Tournament level">
            <select value={eventForm.level} onChange={(e) => setEventForm({ ...eventForm, level: e.target.value })} className={baseInputClass()}>
              {TOURNAMENT_LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Branch">
          <select value={eventForm.hostingBranch} onChange={(e) => setEventForm({ ...eventForm, hostingBranch: e.target.value })} className={baseInputClass()} disabled={isTournamentEvent}>
            <option value="">All Branch</option>
            <option value="M P Sports Club">MPSC</option>
            <option value="Herohalli">Herohalli</option>
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={baseInputClass()} required />
        </Field>
        <Field label="End date">
          <input type="date" value={eventForm.endDate} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })} className={baseInputClass()} />
        </Field>
        <Field label="Venue">
          <input value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} className={baseInputClass()} required={isTournamentEvent} />
        </Field>
        <Field label="City">
          <input value={eventForm.city} onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })} className={baseInputClass()} />
        </Field>
        <Field label="Status">
          <select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })} className={baseInputClass()}>
            {EVENT_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        {isTournamentEvent && (
          <>
            <Field label="Total participants">
              <input type="number" min="1" value={eventForm.totalParticipants} onChange={(e) => setEventForm({ ...eventForm, totalParticipants: e.target.value })} className={baseInputClass()} />
            </Field>
            <Field label="SKF participants">
              <input type="number" min="0" value={eventForm.skfParticipants} onChange={(e) => setEventForm({ ...eventForm, skfParticipants: e.target.value })} className={baseInputClass()} />
            </Field>
          </>
        )}
        <Field label="Affiliated body">
          <input value={eventForm.affiliatedBody} onChange={(e) => setEventForm({ ...eventForm, affiliatedBody: e.target.value })} className={baseInputClass()} />
        </Field>
        <label className="space-y-1 md:col-span-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Description</span>
          <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={3} className={`${baseInputClass()} resize-none`} required={isTournamentEvent} />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={eventForm.isPublished} onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-amber-500" />
          Show on website
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={eventForm.showInJourney} onChange={(e) => setEventForm({ ...eventForm, showInJourney: e.target.checked })} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-amber-500" />
          Use for athlete journey
        </label>
      </div>
    </form>
  );
}

function StudentsStep({
  selectedEvent,
  selectedParticipants,
  branchRoster,
  selectedRosterIds,
  athleteQuery,
  athleteResults,
  loadingRoster,
  searchingAthletes,
  assignmentBusyId,
  setAthleteQuery,
  onSearch,
  onAssign,
  onBulkAssign,
  onSyncEligibleBeltExam,
  onToggleRosterSelection,
  onToggleAllRosterSelection,
  onRemove,
}: {
  selectedEvent: EventCollectionItem | null;
  selectedParticipants: EventCollectionItem["event"]["participants"];
  branchRoster: EventAthleteSearchResult[];
  selectedRosterIds: Set<string>;
  athleteQuery: string;
  athleteResults: EventAthleteSearchResult[];
  loadingRoster: boolean;
  searchingAthletes: boolean;
  assignmentBusyId: string;
  setAthleteQuery: (value: string) => void;
  onSearch: (event?: FormEvent<HTMLFormElement>) => void;
  onAssign: (athlete: EventAthleteSearchResult) => void;
  onBulkAssign: (athletes: EventAthleteSearchResult[]) => void;
  onSyncEligibleBeltExam: () => void;
  onToggleRosterSelection: (athlete: EventAthleteSearchResult, checked: boolean) => void;
  onToggleAllRosterSelection: (athletes: EventAthleteSearchResult[], checked: boolean) => void;
  onRemove: (participantId: string, skfId: string) => void;
}) {
  if (!selectedEvent) {
    return <EmptyStep icon={<Users className="h-5 w-5" />} title="Select or create an event before assigning students." />;
  }

  const assignedKeys = new Set(
    selectedParticipants.flatMap((participant) => [participant.athleteId, participant.skfId].filter(Boolean) as string[]),
  );
  const unassignedRoster = branchRoster.filter((student) => !assignedKeys.has(student.id) && !assignedKeys.has(student.skfId));
  const selectedRosterAthletes = unassignedRoster.filter((student) => selectedRosterIds.has(athleteKey(student)));
  const allRosterSelected = unassignedRoster.length > 0 && unassignedRoster.every((student) => selectedRosterIds.has(athleteKey(student)));
  const bulkBusy = assignmentBusyId === "__bulk__";
  const beltSyncBusy = assignmentBusyId === "__belt_exam_sync__";
  const canSyncBeltExam = isBeltEvent(selectedEvent.event.type);
  const rosterBranchLabel = eventBranchLabel(selectedEvent.event.hostingBranch);

  return (
    <section className="card-panel p-5 space-y-5">
      <StepHeader icon={<UserPlus className="h-4 w-4" />} eyebrow="Step 2" title="Assign Students" />

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Default Roster</p>
            <h3 className="mt-1 text-sm font-semibold text-white">{rosterBranchLabel} students</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {canSyncBeltExam && (
              <button
                type="button"
                onClick={onSyncEligibleBeltExam}
                disabled={loadingRoster || bulkBusy || beltSyncBusy}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {beltSyncBusy ? "Syncing..." : "Sync Eligible"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleAllRosterSelection(unassignedRoster, !allRosterSelected)}
              disabled={loadingRoster || unassignedRoster.length === 0 || bulkBusy || beltSyncBusy}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allRosterSelected ? "Clear All" : "Select All"}
            </button>
            <button
              type="button"
              onClick={() => onBulkAssign(selectedRosterAthletes)}
              disabled={selectedRosterAthletes.length === 0 || bulkBusy || beltSyncBusy}
              className="btn-primary min-h-10 rounded-lg px-3 text-xs"
            >
              {bulkBusy ? "Assigning..." : `Assign ${selectedRosterAthletes.length || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <StudentList title={`Roster (${unassignedRoster.length})`}>
          {loadingRoster ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : unassignedRoster.length ? (
            unassignedRoster.map((student) => {
              const key = athleteKey(student);
              const checked = selectedRosterIds.has(key);
              return (
                <StudentRow key={key} name={studentName(student)} meta={`${student.skfId} • ${student.branchName || "SKF"}${student.currentBelt ? ` • ${student.currentBelt}` : ""}`}>
                  <label className="flex min-h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => onToggleRosterSelection(student, event.target.checked)}
                      disabled={bulkBusy || beltSyncBusy}
                      className="h-4 w-4 accent-white"
                    />
                    Select
                  </label>
                </StudentRow>
              );
            })
          ) : (
            <p className="py-6 text-sm text-zinc-500">All visible roster students are already assigned.</p>
          )}
        </StudentList>

        <StudentList title={`Assigned (${selectedParticipants.length})`}>
          {selectedParticipants.map((participant) => (
            <StudentRow key={participant.id || participant.skfId} name={participant.athleteName} meta={`${participant.skfId} • ${participant.branchName || "SKF"}`}>
              <button type="button" onClick={() => onRemove(participant.id, participant.skfId)} disabled={beltSyncBusy || assignmentBusyId === (participant.id || participant.skfId)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50">
                {assignmentBusyId === (participant.id || participant.skfId) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </StudentRow>
          ))}
          {selectedParticipants.length === 0 && <p className="py-6 text-sm text-zinc-500">No students assigned.</p>}
        </StudentList>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Add From Any Branch</p>
          <p className="mt-1 text-xs text-zinc-600">Use this when a student from another branch is attending this event.</p>
        </div>
        <form onSubmit={onSearch} className="flex gap-2">
          <input value={athleteQuery} onChange={(e) => setAthleteQuery(e.target.value)} placeholder="Search by name or SKF ID" className={`${baseInputClass()} flex-1`} />
          <button type="submit" disabled={searchingAthletes} className="flex h-10 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white">
            {searchingAthletes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </form>
        <div className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
          {athleteResults.map((student) => {
            const busyId = athleteKey(student);
            const isAssigned = assignedKeys.has(student.id) || assignedKeys.has(student.skfId);
            return (
              <StudentRow key={busyId} name={studentName(student)} meta={`${student.skfId} • ${student.branchName || "SKF"}${student.currentBelt ? ` • ${student.currentBelt}` : ""}`}>
                <button type="button" onClick={() => onAssign(student)} disabled={isAssigned || assignmentBusyId === busyId || bulkBusy || beltSyncBusy} className="min-w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:bg-zinc-950 disabled:text-zinc-600">
                  {assignmentBusyId === busyId ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isAssigned ? "Added" : "Assign"}
                </button>
              </StudentRow>
            );
          })}
          {athleteResults.length === 0 && <p className="py-6 text-sm text-zinc-500">Search to add students outside the default roster.</p>}
        </div>
      </div>
    </section>
  );
}

function StudentList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{title}</p>
      <div className="max-h-[420px] space-y-2 overflow-auto pr-1">{children}</div>
    </div>
  );
}

function StudentRow({ name, meta, children }: { name: string; meta: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="truncate text-[10px] uppercase tracking-wider text-zinc-500">{meta}</p>
      </div>
      {children}
    </div>
  );
}

function FeesStep(props: {
  data: Awaited<ReturnType<typeof getEventCollections>> | null;
  selectedEvent: EventCollectionItem;
  config: EventFeeConfig;
  setConfig: Dispatch<SetStateAction<EventFeeConfig | null>>;
  previewRows: EventFeePreviewRow[];
  previewSummary: { ready: number; waived: number; review: number; total: number };
  overrides: Record<string, EventFeeOverride>;
  saving: boolean;
  expense: { title: string; amount: string; branchScope: string };
  deposit: { amount: string; branchScope: string; reference: string };
  setExpense: Dispatch<SetStateAction<{ title: string; amount: string; branchScope: string }>>;
  setDeposit: Dispatch<SetStateAction<{ amount: string; branchScope: string; reference: string }>>;
  updateBranchPrice: (branchName: string, amount: string) => void;
  updateBeltPrice: (beltKey: string, amount: string) => void;
  updateOverride: (skfId: string, patch: Partial<EventFeeOverride>) => void;
  onPreview: () => void;
  onGenerate: () => void;
  onAddExpense: () => void;
  onAddDeposit: () => void;
}) {
  const { data, selectedEvent, config, setConfig, previewRows, previewSummary, overrides, saving, expense, deposit, setExpense, setDeposit, updateBranchPrice, updateBeltPrice, updateOverride, onPreview, onGenerate, onAddExpense, onAddDeposit } = props;
  const isBeltFee = config.feeCategory === "belt_exam";
  const payablePreviewCount = previewRows.filter((row) => row.status === "ready" || row.status === "waived").length;
  const savings = selectedEvent.finance.savings;
  const surplus = selectedEvent.finance.surplus;
  const isSettled = config.status === "settled";

  return (
    <div className="space-y-5">
      <section className="card-panel p-5 space-y-5">
        <StepHeader icon={<Wallet className="h-4 w-4" />} eyebrow="Step 3" title={isBeltFee ? "Grading Expense & Savings" : "Event Fees"} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <FeeMetric label="Assigned" value={String(eventParticipants(selectedEvent).length)} />
          <FeeMetric label="Charged" value={String(selectedEvent.collection.chargedCount)} />
          <FeeMetric label="Paid" value={String(selectedEvent.collection.paidCount)} tone="green" />
          <FeeMetric label="Expense" value={currency(selectedEvent.finance.spent)} tone="red" />
          <FeeMetric label="Deposited" value={currency(selectedEvent.finance.deposited)} tone="blue" />
        </div>

        {isBeltFee && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Grading Savings Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-zinc-500">Expected Collection</p>
                <p className="text-lg font-semibold text-white">{currency(selectedEvent.collection.expected)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Total Expenses</p>
                <p className="text-lg font-semibold text-red-400">{currency(selectedEvent.finance.spent)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Savings (Expected - Expenses)</p>
                <p className={`text-lg font-semibold ${savings > 0 ? 'text-emerald-400' : savings < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {currency(Math.max(0, selectedEvent.collection.expected - selectedEvent.finance.spent))}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-zinc-500">Collected</p>
                <p className="text-sm font-semibold text-emerald-300">{currency(selectedEvent.collection.collected)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Surplus (Collected - Expenses)</p>
                <p className={`text-sm font-semibold ${surplus > 0 ? 'text-emerald-400' : surplus < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {currency(surplus)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Settlement Status</p>
                <p className={`text-sm font-semibold ${isSettled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isSettled ? 'Settled' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Category">
            <select value={config.feeCategory} onChange={(e) => setConfig({ ...config, feeCategory: e.target.value as EventFeeConfig["feeCategory"] })} className={baseInputClass()}>
              <option value="belt_exam">Belt & Black Belt Exam Fee</option>
              <option value="tournament">Tournament</option>
              <option value="event">Seminar / Camp / Event</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Targeting">
            <select value={config.targetingMode} onChange={(e) => setConfig({ ...config, targetingMode: e.target.value as EventFeeConfig["targetingMode"] })} className={baseInputClass()}>
              <option value="participants_only">Assigned students only</option>
              <option value="branch_and_eligibility">Branch eligible students</option>
              <option value="manual_selection">Manual selection</option>
            </select>
          </Field>
          <Field label="Pricing">
            <select value={config.pricingMode} onChange={(e) => setConfig({ ...config, pricingMode: e.target.value as EventFeeConfig["pricingMode"] })} className={baseInputClass()}>
              <option value="fixed">Fixed</option>
              <option value="branch">Branch wise</option>
              <option value="belt">Belt wise</option>
              <option value="branch_belt">Branch + belt</option>
              <option value="student">Student specific</option>
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" value={config.dueDate || ""} onChange={(e) => setConfig({ ...config, dueDate: e.target.value })} className={baseInputClass()} />
          </Field>
          <Field label={isBeltFee ? "Default exam fee" : "Default fee"}>
            <input type="number" value={config.defaultAmount || ""} onChange={(e) => setConfig({ ...config, defaultAmount: Number(e.target.value || 0) })} className={baseInputClass()} />
          </Field>
          <Field label="MPSC price">
            <input type="number" value={config.branchPrices["M P Sports Club"] || ""} onChange={(e) => updateBranchPrice("M P Sports Club", e.target.value)} className={baseInputClass()} />
          </Field>
          <Field label="Herohalli price">
            <input type="number" value={config.branchPrices.Herohalli || ""} onChange={(e) => updateBranchPrice("Herohalli", e.target.value)} className={baseInputClass()} />
          </Field>
        </div>

        {isBeltFee && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
            Grading fees are collected per student and settled as a batch. The total expected collection minus total event expenses becomes the grading savings. Savings are tracked per event and settle to the branch ledger. Eligible students must be active, have completed 5+ months by the exam date, and have no billing break. Belt examination payments do not generate receipts.
          </div>
        )}

        {isBeltFee && data && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Promotion target prices</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {data.beltSequence.map((belt) => (
                <label key={belt.key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                  <span className="block truncate text-[10px] text-zinc-500">{belt.label}</span>
                  <input type="number" value={config.beltPrices[belt.key] || ""} onChange={(e) => updateBeltPrice(belt.key, e.target.value)} className="mt-1 w-full rounded border border-zinc-800 bg-black px-2 py-1 text-xs text-white" />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onPreview} disabled={saving} className="btn-primary flex-1 rounded-lg py-3 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Save & Preview
          </button>
          {isBeltFee ? (
            <button type="button" onClick={onGenerate} disabled={saving || payablePreviewCount === 0} className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 flex items-center justify-center gap-2">
              <Wallet className="h-4 w-4" />
              {isSettled ? "Re-Settle Grading Savings" : "Settle Grading Savings"}
            </button>
          ) : (
            <button type="button" onClick={onGenerate} disabled={saving || payablePreviewCount === 0} className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              Generate Pending Fees
            </button>
          )}
        </div>
      </section>

      {previewRows.length > 0 && (
        <section className="card-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-medium text-white">{isBeltFee ? "Belt Examination Preview" : "Fee Preview"}</h3>
            <p className="text-xs text-zinc-500">{previewSummary.ready} ready • {previewSummary.waived} waived • {previewSummary.review} review • {currency(previewSummary.total)}</p>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
            {previewRows.map((row) => (
              <div key={row.skfId} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 md:grid-cols-[1fr_120px_150px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{row.studentName}</p>
                    <span className="font-mono text-[10px] text-zinc-500">{row.skfId}</span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${rowTone(row.status)}`}>{row.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.branch} {row.targetBelt ? `• ${row.currentBelt || "Current belt"} to ${row.targetBelt}` : ""}
                    {isBeltFee && row.joinedDate ? ` • Joined ${formatDateLabel(row.joinedDate)}` : ""}
                    {isBeltFee && row.eligibilityCutoffDate ? ` • Cutoff ${formatDateLabel(row.eligibilityCutoffDate)}` : ""}
                  </p>
                  {row.reason && <p className="mt-1 text-xs text-amber-400">{row.reason}</p>}
                </div>
                <input type="number" value={overrides[row.skfId]?.amount ?? row.finalAmount} onChange={(e) => updateOverride(row.skfId, { amount: Number(e.target.value || 0), reason: "Student-specific amount" })} className={baseInputClass()} />
                <div className="flex gap-1 sm:gap-2">
                  <button type="button" onClick={() => updateOverride(row.skfId, { included: !overrides[row.skfId]?.included, excluded: false, waived: false, reason: "Manually included for event fee" })} className={`flex-1 rounded-lg border px-1 sm:px-2 py-2 text-[10px] sm:text-xs ${overrides[row.skfId]?.included ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"}`}>Include</button>
                  <button type="button" onClick={() => updateOverride(row.skfId, { excluded: !overrides[row.skfId]?.excluded, included: false, waived: false, reason: "Excluded from event fee" })} className={`flex-1 rounded-lg border px-1 sm:px-2 py-2 text-[10px] sm:text-xs ${overrides[row.skfId]?.excluded ? "border-zinc-500 bg-zinc-700 text-white" : "border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"}`}>Exclude</button>
                  <button type="button" onClick={() => updateOverride(row.skfId, { waived: !overrides[row.skfId]?.waived, excluded: false, included: false, amount: 0, reason: "Waived from event fee" })} className={`flex-1 rounded-lg border px-1 sm:px-2 py-2 text-[10px] sm:text-xs ${overrides[row.skfId]?.waived ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"}`}>Waive</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FinanceBox icon={<CircleDollarSign className="h-4 w-4 text-red-400" />} title="Expense">
          <input value={expense.title} onChange={(e) => setExpense({ ...expense, title: e.target.value })} placeholder="Title" className={baseInputClass()} />
          <input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} placeholder="Amount" className={baseInputClass()} />
          <select value={expense.branchScope} onChange={(e) => setExpense({ ...expense, branchScope: e.target.value })} className={baseInputClass()}>
            <option value="Both">Both</option>
            <option value="M P Sports Club">MPSC</option>
            <option value="Herohalli">Herohalli</option>
          </select>
          <button type="button" onClick={onAddExpense} disabled={saving} className="w-full rounded-lg bg-red-600/90 py-2 text-sm text-white hover:bg-red-500 flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </FinanceBox>
        <FinanceBox icon={<Banknote className="h-4 w-4 text-blue-400" />} title="Bank Deposit">
          <input type="number" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} placeholder="Amount" className={baseInputClass()} />
          <input value={deposit.reference} onChange={(e) => setDeposit({ ...deposit, reference: e.target.value })} placeholder="Reference" className={baseInputClass()} />
          <select value={deposit.branchScope} onChange={(e) => setDeposit({ ...deposit, branchScope: e.target.value })} className={baseInputClass()}>
            <option value="Both">Both</option>
            <option value="M P Sports Club">MPSC</option>
            <option value="Herohalli">Herohalli</option>
          </select>
          <button type="button" onClick={onAddDeposit} disabled={saving} className="w-full rounded-lg bg-blue-600/90 py-2 text-sm text-white hover:bg-blue-500 flex items-center justify-center gap-2">
            <IndianRupee className="h-4 w-4" /> Add Deposit
          </button>
        </FinanceBox>
      </section>
    </div>
  );
}

function FeeMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "red" | "blue" }) {
  const color = tone === "green" ? "text-emerald-400" : tone === "red" ? "text-red-400" : tone === "blue" ? "text-blue-400" : "text-white";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-[10px] uppercase text-zinc-500">{label}</p>
      <p className={`font-[family-name:var(--font-space)] text-xl ${color}`}>{value}</p>
    </div>
  );
}

function FinanceBox({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card-panel p-5">
      <h3 className="mb-4 flex items-center gap-2 font-medium text-white">{icon} {title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ResultsStep({
  selectedEvent,
  resultDrafts,
  certificateSummary,
  certificateBusy,
  saving,
  updateResult,
  onSave,
  onPublish,
  onPrepareCertificates,
  onPublishCertificates,
  onRefreshCertificates,
}: {
  selectedEvent: EventCollectionItem | null;
  resultDrafts: EventResultRecord[];
  certificateSummary: EventCertificateSummary | null;
  certificateBusy: "" | "load" | "prepare" | "publish";
  saving: boolean;
  updateResult: (index: number, patch: Partial<EventResultRecord>) => void;
  onSave: () => void;
  onPublish: () => void;
  onPrepareCertificates: () => void;
  onPublishCertificates: () => void;
  onRefreshCertificates: () => void;
}) {
  if (!selectedEvent) {
    return <EmptyStep icon={<Trophy className="h-5 w-5" />} title="Select an event before recording outcomes." />;
  }

  if (eventParticipants(selectedEvent).length === 0) {
    return <EmptyStep icon={<Users className="h-5 w-5" />} title="Assign students before recording outcomes." />;
  }

  const type = selectedEvent.event.type;

  return (
    <section className="card-panel p-5 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StepHeader icon={<Trophy className="h-4 w-4" />} eyebrow="Step 4" title="Results & Recognition" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onSave} disabled={saving} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:text-white flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Draft
          </button>
          <button type="button" onClick={onPublish} disabled={saving} className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Publish Results
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
        Publishing updates the website, the student portal, and each athlete profile. Save a draft first when results are still being checked.
      </div>

      <CertificateWorkflowPanel
        summary={certificateSummary}
        busy={certificateBusy}
        onPrepare={onPrepareCertificates}
        onPublish={onPublishCertificates}
        onRefresh={onRefreshCertificates}
      />

      <div className="space-y-3">
        {resultDrafts.map((result, index) => (
          <div key={result.id || result.skfId || index} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{result.athleteName || result.skfId}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{result.skfId} • {result.branchName || "SKF"} • {result.belt || "Belt not set"}</p>
              </div>
              <button type="button" onClick={() => updateResult(index, { specialAward: "Best Performer", award: "Best Performer" })} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15">
                Mark Best Performer
              </button>
            </div>

            {isTournament(type) ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Result">
                  <select value={String(result.medal || result.result || "participation")} onChange={(e) => updateResult(index, { medal: e.target.value, result: e.target.value })} className={baseInputClass()}>
                    <option value="participation">Participation</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                    <option value="5th-place">5th Place</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select value={String(result.category || "kata-individual")} onChange={(e) => updateResult(index, { category: e.target.value })} className={baseInputClass()}>
                    <option value="kata-individual">Kata Individual</option>
                    <option value="kata-team">Kata Team</option>
                    <option value="kumite-individual">Kumite Individual</option>
                    <option value="kumite-team">Kumite Team</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </Field>
                <Field label="Age group">
                  <select value={String(result.ageGroup || "sub-junior")} onChange={(e) => updateResult(index, { ageGroup: e.target.value })} className={baseInputClass()}>
                    <option value="sub-junior">Sub-Junior</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="open">Open</option>
                  </select>
                </Field>
                <Field label="Weight">
                  <input value={String(result.weightCategory || "")} onChange={(e) => updateResult(index, { weightCategory: e.target.value })} className={baseInputClass()} />
                </Field>
                <Field label="Wins">
                  <input type="number" min="0" value={String(result.wins ?? "")} onChange={(e) => updateResult(index, { wins: e.target.value })} className={baseInputClass()} />
                </Field>
                <Field label="Difficulty">
                  <select value={String(result.difficultyLevel || "")} onChange={(e) => updateResult(index, { difficultyLevel: e.target.value })} className={baseInputClass()}>
                    <option value="">Not set</option>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
                  </select>
                </Field>
              </div>
            ) : isBeltEvent(type) ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Result">
                  <select value={String(result.result || "pass")} onChange={(e) => updateResult(index, { result: e.target.value })} className={baseInputClass()}>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </Field>
                <Field label="Going to belt">
                  <select value={String(result.beltAwarded || "")} onChange={(e) => updateResult(index, { beltAwarded: e.target.value, promotion: e.target.value })} className={baseInputClass()}>
                    <option value="">Select promoted belt</option>
                    {BELT_OPTIONS.map((belt) => <option key={belt.value} value={belt.value}>{belt.label}</option>)}
                  </select>
                </Field>
                <Field label="Promotion">
                  <select value={String(result.promotionType || "normal")} onChange={(e) => updateResult(index, { promotionType: e.target.value as EventResultRecord["promotionType"] })} className={baseInputClass()}>
                    <option value="normal">Normal</option>
                    <option value="double">Double promotion</option>
                    <option value="triple">Triple promotion</option>
                  </select>
                </Field>
                <Field label="Examiner">
                  <input value={String(result.examiner || "")} onChange={(e) => updateResult(index, { examiner: e.target.value })} className={baseInputClass()} />
                </Field>
                <Field label="Grade">
                  <input value={String(result.grade || "")} onChange={(e) => updateResult(index, { grade: e.target.value })} className={baseInputClass()} />
                </Field>
                <Field label="Score">
                  <input type="number" value={String(result.score ?? "")} onChange={(e) => updateResult(index, { score: e.target.value })} className={baseInputClass()} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Outcome">
                  <select value={String(result.result || "attended")} onChange={(e) => updateResult(index, { result: e.target.value })} className={baseInputClass()}>
                    <option value="attended">Attended</option>
                    <option value="completed">Completed</option>
                    <option value="absent">Absent</option>
                  </select>
                </Field>
                <Field label="Days attended">
                  <input type="number" min="0" value={String(result.daysAttended ?? "")} onChange={(e) => updateResult(index, { daysAttended: e.target.value })} className={baseInputClass()} />
                </Field>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Recognition">
                <input value={String(result.specialAward || "")} onChange={(e) => updateResult(index, { specialAward: e.target.value, award: e.target.value })} placeholder="Best Performer, Outstanding Work..." className={baseInputClass()} />
              </Field>
              <Field label="Notes">
                <input value={String(result.notes || "")} onChange={(e) => updateResult(index, { notes: e.target.value })} className={baseInputClass()} />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CertificateWorkflowPanel({
  summary,
  busy,
  onPrepare,
  onPublish,
  onRefresh,
}: {
  summary: EventCertificateSummary | null;
  busy: "" | "load" | "prepare" | "publish";
  onPrepare: () => void;
  onPublish: () => void;
  onRefresh: () => void;
}) {
  const certificates = summary?.certificates || [];
  const hasDrafts = certificates.some((certificate) => certificate.status === "draft");
  const canPublish = certificates.length > 0 && (hasDrafts || (summary?.issuedCount || 0) < certificates.length);
  const isPreparing = busy === "prepare";
  const isPublishing = busy === "publish";
  const isLoading = busy === "load";

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/35 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-amber-300">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Certificate Registry</p>
            <h3 className="mt-1 text-sm font-semibold text-white">
              {certificates.length
                ? `${summary?.issuedCount || 0} published / ${certificates.length} prepared`
                : "No certificate QR prepared"}
            </h3>
            {summary?.skippedCount ? (
              <p className="mt-1 text-xs text-amber-300">{summary.skippedCount} result row{summary.skippedCount === 1 ? "" : "s"} skipped.</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[440px]">
          <button
            type="button"
            onClick={onPrepare}
            disabled={Boolean(busy)}
            className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Prepare QR
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={Boolean(busy) || !canPublish}
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Publish Certs
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={Boolean(busy)}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {certificates.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2">
          {certificates.map((certificate) => (
            <div key={certificate.enrollmentId} className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{certificate.studentName}</p>
                  <span className={`rounded-md border px-2 py-1 text-[10px] uppercase ${certificate.status === "issued" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : certificate.status === "revoked" ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
                    {certificate.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-zinc-500">
                  {certificate.skfId} • {certificate.certificateNumber}{certificate.beltLevel ? ` • ${certificate.beltLevel}` : ""}
                </p>
              </div>

              <a
                href={certificate.qrDownloadUrl}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:text-white flex items-center justify-center gap-2"
                target="_blank"
                rel="noreferrer"
              >
                <Download className="h-4 w-4" />
                QR
              </a>
              <a
                href={certificate.verifyUrl}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:text-white flex items-center justify-center gap-2"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Verify
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepHeader({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400">{icon}</div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
        <h2 className="text-lg font-medium text-white">{title}</h2>
      </div>
    </div>
  );
}

function EmptyStep({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="card-panel flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500">{icon}</div>
      <p className="text-sm text-zinc-400">{title}</p>
    </div>
  );
}

function PhotosStep({ selectedEvent }: { selectedEvent: EventCollectionItem | null }) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoConfirmState, setPhotoConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
  } | null>(null);
  const eventId = selectedEvent?.event.id;
  const eventDate = selectedEvent?.event.date;

  const loadPhotos = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await getEventGalleryPhotos(eventId, true);
      setPhotos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPhotos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !eventId) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      await uploadGalleryPhoto({
        file,
        title: `${selectedEvent?.event.name} - Photo`,
        category: "Events",
        eventId: eventId,
        eventDate: eventDate,
        isPublished: true,
        pinned: photos.length === 0, // Pin the first photo as featured
        sortOrder: photos.length,
      });
      await loadPhotos();
    } catch (err) {
      console.error(err);
      toast("Failed to upload photo", "error");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDelete = async (photoId: string) => {
    setPhotoConfirmState({
      open: true,
      title: "Delete Photo",
      message: "Are you sure you want to delete this photo?",
      variant: "danger",
      onConfirm: async () => {
        setDeletingId(photoId);
        try {
          await deleteGalleryPhoto(photoId);
          await loadPhotos();
        } catch (err) {
          console.error(err);
          toast("Failed to delete photo", "error");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleTogglePin = async (photo: GalleryPhoto) => {
    try {
      await upsertGalleryPhoto({
        id: photo.id,
        title: photo.title,
        category: String(photo.cat || "Events"),
        pinned: !photo.pinned,
        isPublished: photo.isPublished,
        sortOrder: photo.sortOrder,
        eventId,
        eventDate,
      });
      await loadPhotos();
    } catch (err) {
      console.error(err);
      toast("Failed to update photo", "error");
    }
  };

  if (!selectedEvent) {
    return <EmptyStep icon={<ImageIcon className="h-5 w-5" />} title="Select an event to manage photos." />;
  }

  return (
    <>
      <section className="card-panel p-5 space-y-5">
        <div className="flex items-center justify-between">
          <StepHeader icon={<ImageIcon className="h-4 w-4" />} eyebrow="Step 5" title="Event Photos" />
          <div>
            <label className="btn-primary flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Upload Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center">
            <ImageIcon className="mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">No photos uploaded</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Upload photos for this event. Pinned photos will be featured as the hero image on the event detail page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className={`group relative aspect-square overflow-hidden rounded-xl border ${photo.pinned ? "border-amber-500/50 ring-1 ring-amber-500/50" : "border-zinc-800"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={normalizeKarateMediaUrl(photo.src)} alt={photo.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                {photo.pinned && (
                  <div className="absolute left-2 top-2 rounded-md bg-amber-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">
                    Featured
                  </div>
                )}

                <div className="absolute bottom-2 right-2 flex gap-1 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(photo)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-colors ${photo.pinned ? "border-amber-500/30 bg-amber-500/20 text-amber-300" : "border-white/10 bg-black/50 text-white hover:bg-white/20"}`}
                    title={photo.pinned ? "Unpin" : "Pin as featured"}
                  >
                    <Award className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    disabled={deletingId === photo.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/20 text-red-300 backdrop-blur-md transition-colors hover:bg-red-500/40 disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === photo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <ConfirmModal
        open={photoConfirmState?.open ?? false}
        title={photoConfirmState?.title ?? ""}
        message={photoConfirmState?.message ?? ""}
        variant={photoConfirmState?.variant}
        onConfirm={() => {
          photoConfirmState?.onConfirm();
          setPhotoConfirmState(null);
        }}
        onCancel={() => setPhotoConfirmState(null)}
      />
    </>
  );
}
