"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Gift,
  Loader2,
  Megaphone,
  Package,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserPlus,
  Wallet,
  XCircle,
} from "lucide-react";

import {
  approvePaymentVerification,
  getAdmissionApplications,
  getEventCollections,
  getPaymentVerifications,
  getStudents,
  getShopOrders,
  getWebsiteNotifications,
  markWebsiteNotificationContacted,
  rejectPaymentVerification,
  type AdmissionApplication,
  type EventCollectionItem,
  type PaymentVerification,
  type ShopOrder,
  type Student,
  type WebsiteNotification,
} from "@/lib/api";
import { getStoredFeeTrackUser } from "@/lib/client-auth";
import { POSTER_EVENTS } from "@/lib/reminder-calendar";

const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const BIRTHDAY_LOOKAHEAD_DAYS = 1;
const BIRTHDAY_REPEAT_ALERT_MS = 4 * 60 * 60 * 1000;
const BIRTHDAY_WISHES_STORAGE_KEY = "skf_feetrack_birthday_wishes_v1";
const BIRTHDAY_ALERTS_STORAGE_KEY = "skf_feetrack_birthday_alerts_v1";
const POSTER_DONE_STORAGE_KEY = "skf_feetrack_poster_reminders_done_v1";
const POSTER_ALERTS_STORAGE_KEY = "skf_feetrack_poster_reminder_alerts_v1";
const EVENT_DONE_STORAGE_KEY = "skf_feetrack_event_reminders_done_v1";
const EVENT_ALERTS_STORAGE_KEY = "skf_feetrack_event_reminder_alerts_v1";
const EVENT_SIGNATURES_STORAGE_KEY = "skf_feetrack_event_signatures_v1";
const EVENT_UPDATES_STORAGE_KEY = "skf_feetrack_event_updates_v1";
const QUEUE_ALERTS_STORAGE_KEY = "skf_feetrack_queue_alerts_v1";

type BirthdayNotification = Student & {
  branch: "MPSC" | "Herohalli";
  birthdayDate: Date;
  daysUntil: number;
  reminderKey: string;
};

type PosterReminder = {
  id: string;
  name: string;
  category: string;
  notes: string;
  eventDate: Date;
  daysUntil: 0 | 1;
  phase: "prepare" | "publish";
  reminderKey: string;
};

type EventReminder = {
  id: string;
  name: string;
  type: string;
  branch: string;
  status: string;
  eventDate: Date;
  daysUntil: 0 | 1;
  phase: "prepare" | "review";
  href: string;
  detail: string;
  reminderKey: string;
};

type EventUpdateNotification = {
  id: string;
  eventId: string;
  title: string;
  meta: string;
  detail: string;
  href: string;
  detectedAt: string;
};

type QueueNotification =
  | {
      kind: "payment";
      id: string;
      title: string;
      meta: string;
      detail: string;
      proof: PaymentVerification;
    }
  | {
      kind: "admission";
      id: string;
      title: string;
      meta: string;
      detail: string;
      href: string;
    }
  | {
      kind: "order";
      id: string;
      title: string;
      meta: string;
      detail: string;
      href: string;
    }
  | {
      kind: "website";
      id: string;
      title: string;
      meta: string;
      detail: string;
      href: string;
      lead: WebsiteNotification;
    }
  | {
      kind: "birthday";
      id: string;
      title: string;
      meta: string;
      detail: string;
      href: string;
      birthday: BirthdayNotification;
    }
  | {
      kind: "poster";
      id: string;
      title: string;
      meta: string;
      detail: string;
      poster: PosterReminder;
    }
  | {
      kind: "event_reminder";
      id: string;
      title: string;
      meta: string;
      detail: string;
      href: string;
      reminder: EventReminder;
    }
  | {
      kind: "event_update";
      id: string;
      title: string;
      meta: string;
      detail: string;
      href: string;
      update: EventUpdateNotification;
    };

function money(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function dateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function orderNeedsAction(order: ShopOrder) {
  return ["payment-pending", "pending-approval", "processing"].includes(order.status);
}

function readStorageRecord<T extends boolean | number | string>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

function writeStorageRecord<T extends boolean | number | string>(key: string, value: Record<string, T>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function birthdayReminderKey(branch: string, studentId: string, birthdayDate: Date) {
  return `${branch}:${studentId}:${localDateKey(birthdayDate)}`;
}

function posterReminderKey(eventId: string, eventDate: Date, phase: PosterReminder["phase"]) {
  return `${eventId}:${localDateKey(eventDate)}:${phase}`;
}

function isBirthdayWished(key: string) {
  return Boolean(readStorageRecord<boolean>(BIRTHDAY_WISHES_STORAGE_KEY)[key]);
}

function setBirthdayWished(key: string) {
  const wishes = readStorageRecord<boolean>(BIRTHDAY_WISHES_STORAGE_KEY);
  wishes[key] = true;
  writeStorageRecord(BIRTHDAY_WISHES_STORAGE_KEY, wishes);
}

function shouldSendBirthdayAlert(key: string) {
  const alerts = readStorageRecord<number>(BIRTHDAY_ALERTS_STORAGE_KEY);
  const lastAlertAt = Number(alerts[key] || 0);
  return !lastAlertAt || Date.now() - lastAlertAt >= BIRTHDAY_REPEAT_ALERT_MS;
}

function setBirthdayAlertSent(key: string) {
  const alerts = readStorageRecord<number>(BIRTHDAY_ALERTS_STORAGE_KEY);
  alerts[key] = Date.now();
  writeStorageRecord(BIRTHDAY_ALERTS_STORAGE_KEY, alerts);
}

function isPosterReminderDone(key: string) {
  return Boolean(readStorageRecord<boolean>(POSTER_DONE_STORAGE_KEY)[key]);
}

function setPosterReminderDone(key: string) {
  const done = readStorageRecord<boolean>(POSTER_DONE_STORAGE_KEY);
  done[key] = true;
  writeStorageRecord(POSTER_DONE_STORAGE_KEY, done);
}

function shouldSendPosterAlert(key: string, repeat: boolean) {
  const alerts = readStorageRecord<number>(POSTER_ALERTS_STORAGE_KEY);
  const lastAlertAt = Number(alerts[key] || 0);
  if (!repeat) return !lastAlertAt;
  return !lastAlertAt || Date.now() - lastAlertAt >= BIRTHDAY_REPEAT_ALERT_MS;
}

function setPosterAlertSent(key: string) {
  const alerts = readStorageRecord<number>(POSTER_ALERTS_STORAGE_KEY);
  alerts[key] = Date.now();
  writeStorageRecord(POSTER_ALERTS_STORAGE_KEY, alerts);
}

function isEventReminderDone(key: string) {
  return Boolean(readStorageRecord<boolean>(EVENT_DONE_STORAGE_KEY)[key]);
}

function setEventReminderDone(key: string) {
  const done = readStorageRecord<boolean>(EVENT_DONE_STORAGE_KEY);
  done[key] = true;
  writeStorageRecord(EVENT_DONE_STORAGE_KEY, done);
}

function shouldSendEventAlert(key: string, repeat: boolean) {
  const alerts = readStorageRecord<number>(EVENT_ALERTS_STORAGE_KEY);
  const lastAlertAt = Number(alerts[key] || 0);
  if (!repeat) return !lastAlertAt;
  return !lastAlertAt || Date.now() - lastAlertAt >= BIRTHDAY_REPEAT_ALERT_MS;
}

function setEventAlertSent(key: string) {
  const alerts = readStorageRecord<number>(EVENT_ALERTS_STORAGE_KEY);
  alerts[key] = Date.now();
  writeStorageRecord(EVENT_ALERTS_STORAGE_KEY, alerts);
}

function shouldSendQueueAlert(key: string) {
  return !readStorageRecord<boolean>(QUEUE_ALERTS_STORAGE_KEY)[key];
}

function setQueueAlertSent(key: string) {
  const alerts = readStorageRecord<boolean>(QUEUE_ALERTS_STORAGE_KEY);
  alerts[key] = true;
  writeStorageRecord(QUEUE_ALERTS_STORAGE_KEY, alerts);
}

function parseBirthday(dateOfBirth: string, branch: "MPSC" | "Herohalli", student: Student): BirthdayNotification | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (!Number.isFinite(birthDate.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }

  const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil < 0 || daysUntil > BIRTHDAY_LOOKAHEAD_DAYS) return null;
  const reminderKey = birthdayReminderKey(branch, student.id, nextBirthday);
  if (isBirthdayWished(reminderKey)) return null;

  return {
    ...student,
    branch,
    birthdayDate: nextBirthday,
    daysUntil,
    reminderKey,
  };
}

function eventTypeLabel(value?: string | null) {
  const text = String(value || "event").replace(/[-_]+/g, " ").trim();
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ") || "Event";
}

function eventBranchLabel(value?: string | null) {
  const branch = String(value || "").trim();
  const normalized = branch.toLowerCase();
  if (!branch || ["overall", "all", "all branch", "all branches", "both"].includes(normalized)) return "All Branch";
  if (["m p sports club", "mp sports club", "mpsc"].includes(normalized)) return "MPSC";
  return branch;
}

function eventHref(event: EventCollectionItem["event"]) {
  return `/events?event=${encodeURIComponent(event.id)}`;
}

function parseEventDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function eventReminderKey(eventId: string, eventDate: Date, phase: EventReminder["phase"]) {
  return `${eventId}:${localDateKey(eventDate)}:${phase}`;
}

function buildEventReminders(items: EventCollectionItem[]): EventReminder[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return items
    .map((item) => {
      const eventDate = parseEventDate(item.event.date);
      if (!eventDate) return null;
      const rawDaysUntil = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
      if (rawDaysUntil !== 0 && rawDaysUntil !== 1) return null;

      const daysUntil = rawDaysUntil as 0 | 1;
      const phase: EventReminder["phase"] = daysUntil === 0 ? "review" : "prepare";
      const reminderKey = eventReminderKey(item.event.id, eventDate, phase);
      if (isEventReminderDone(reminderKey)) return null;

      const resultText = item.event.isResultsPublished
        ? "Results published"
        : item.event.results?.length
          ? `${item.event.results.length} result entries`
          : "Results pending";

      return {
        id: item.event.id,
        name: item.event.name,
        type: eventTypeLabel(item.event.type),
        branch: eventBranchLabel(item.event.hostingBranch),
        status: item.event.status || "upcoming",
        eventDate,
        daysUntil,
        phase,
        href: eventHref(item.event),
        detail: `${item.event.participants.length} assigned • ${resultText}`,
        reminderKey,
      };
    })
    .filter((item): item is EventReminder => Boolean(item))
    .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
}

function eventReminderMeta(reminder: EventReminder) {
  const date = reminder.eventDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const when = reminder.daysUntil === 0 ? "Today" : "Tomorrow";
  const phase = reminder.phase === "review" ? "Review" : "Prepare";
  return `${reminder.branch} • ${date} • ${when} • ${phase}`;
}

function eventSignature(item: EventCollectionItem) {
  return JSON.stringify({
    id: item.event.id,
    name: item.event.name,
    type: item.event.type,
    date: item.event.date,
    endDate: item.event.endDate,
    status: item.event.status,
    branch: item.event.hostingBranch,
    published: item.event.isPublished,
    resultsPublished: item.event.isResultsPublished,
    resultsAppliedAt: item.event.resultsAppliedAt,
    participants: item.event.participants.length,
    results: item.event.results?.length || 0,
    expected: item.collection.expected,
    pending: item.collection.pending,
    collected: item.collection.collected,
  });
}

function eventUpdateMeta(item: EventCollectionItem) {
  const eventDate = parseEventDate(item.event.date);
  const dateLabelText = eventDate
    ? eventDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "Date pending";
  return `${eventBranchLabel(item.event.hostingBranch)} • ${dateLabelText} • ${eventTypeLabel(item.event.type)}`;
}

function readEventUpdates() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(EVENT_UPDATES_STORAGE_KEY) || "{}") as Record<string, EventUpdateNotification>;
  } catch {
    return {};
  }
}

function writeEventUpdates(value: Record<string, EventUpdateNotification>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EVENT_UPDATES_STORAGE_KEY, JSON.stringify(value));
}

function detectEventUpdates(items: EventCollectionItem[]) {
  const previous = readStorageRecord<string>(EVENT_SIGNATURES_STORAGE_KEY);
  const pending = readEventUpdates();
  const hasBaseline = Object.keys(previous).length > 0;
  const next: Record<string, string> = {};
  const detectedAt = new Date().toISOString();

  for (const item of items) {
    const id = item.event.id;
    const signature = eventSignature(item);
    const prior = previous[id];
    next[id] = signature;

    if (!hasBaseline) continue;
    if (prior === signature) continue;

    const changeType = prior ? "updated" : "added";
    pending[id] = {
      id: `event-update:${id}`,
      eventId: id,
      title: item.event.name,
      meta: eventUpdateMeta(item),
      detail: changeType === "added"
        ? "New website event is now available in FeeTrack."
        : "Website event details, results, assignments or collection state changed.",
      href: eventHref(item.event),
      detectedAt,
    };
  }

  writeStorageRecord(EVENT_SIGNATURES_STORAGE_KEY, next);
  writeEventUpdates(pending);
  return Object.values(pending).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

function buildPosterReminders(): PosterReminder[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reminders: PosterReminder[] = [];

  for (const event of POSTER_EVENTS) {
    let eventDate = new Date(today.getFullYear(), event.month, event.day);
    if (eventDate < today) {
      eventDate = new Date(today.getFullYear() + 1, event.month, event.day);
    }

    const rawDaysUntil = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
    if (rawDaysUntil !== 0 && rawDaysUntil !== 1) continue;

    const daysUntil = rawDaysUntil as 0 | 1;
    const phase: PosterReminder["phase"] = daysUntil === 0 ? "publish" : "prepare";
    const reminderKey = posterReminderKey(event.id, eventDate, phase);
    if (isPosterReminderDone(reminderKey)) continue;

    reminders.push({
      id: event.id,
      name: event.name,
      category: event.category,
      notes: event.notes,
      eventDate,
      daysUntil,
      phase,
      reminderKey,
    });
  }

  return reminders.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
}

function birthdayMeta(birthday: BirthdayNotification) {
  const date = birthday.birthdayDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const when = birthday.daysUntil === 0
    ? "Today"
    : birthday.daysUntil === 1
      ? "Tomorrow"
      : `In ${birthday.daysUntil} days`;

  return `${birthday.branch} • ${date} • ${when}`;
}

function posterMeta(poster: PosterReminder) {
  const date = poster.eventDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const when = poster.daysUntil === 0 ? "Today" : "Tomorrow";
  const phase = poster.phase === "publish" ? "Post" : "Prepare";
  return `${poster.category} • ${date} • ${when} • ${phase}`;
}

function queueNotificationBody(item: QueueNotification) {
  return `${item.title} - ${item.meta}`;
}

function websiteLeadLabel(kind: WebsiteNotification["kind"]) {
  return kind === "free_trial" ? "Free Trial" : "Callback";
}

function normalizedPhoneDigits(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

function callHref(phone: string) {
  const digits = normalizedPhoneDigits(phone);
  return digits ? `tel:+${digits}` : "";
}

function whatsappHref(phone: string, lead: WebsiteNotification) {
  const digits = normalizedPhoneDigits(phone);
  if (!digits) return "";
  const message = encodeURIComponent(
    `Hi ${lead.title}, this is SKF Karate. We received your ${websiteLeadLabel(lead.kind).toLowerCase()} request and would like to help you with the next step.`,
  );
  return `https://wa.me/${digits}?text=${message}`;
}

function canRequestBrowserNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return window.isSecureContext || window.location.hostname === "localhost";
}

export default function NotificationBell() {
  const [user] = useState<string | null>(() => getStoredFeeTrackUser());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [paymentProofs, setPaymentProofs] = useState<PaymentVerification[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [websiteLeads, setWebsiteLeads] = useState<WebsiteNotification[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayNotification[]>([]);
  const [posterReminders, setPosterReminders] = useState<PosterReminder[]>([]);
  const [eventReminders, setEventReminders] = useState<EventReminder[]>([]);
  const [eventUpdates, setEventUpdates] = useState<EventUpdateNotification[]>([]);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>("default");
  const [actioningId, setActioningId] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    setPosterReminders(buildPosterReminders());
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const [proofRows, admissionRows, orderRows, websiteRows, eventData, mpscStudents, herohalliStudents] = await Promise.all([
        getPaymentVerifications("Overall"),
        getAdmissionApplications("pending", 50),
        getShopOrders(silent),
        getWebsiteNotifications(),
        getEventCollections("Overall", currentYear, silent),
        getStudents("MPSC", currentMonth, silent),
        getStudents("Herohalli", currentMonth, silent),
      ]);

      setPaymentProofs(proofRows);
      setAdmissions(admissionRows);
      setOrders(orderRows.filter(orderNeedsAction));
      setWebsiteLeads(websiteRows);
      setEventReminders(buildEventReminders(eventData.events || []));
      setEventUpdates(detectEventUpdates(eventData.events || []));
      setBirthdays(
        [
          ...mpscStudents.map((student) => parseBirthday(student.dateOfBirth, "MPSC", student)),
          ...herohalliStudents.map((student) => parseBirthday(student.dateOfBirth, "Herohalli", student)),
        ]
          .filter((birthday): birthday is BirthdayNotification => Boolean(birthday))
          .filter((birthday) => String(birthday.status || "").toLowerCase() !== "discontinued")
          .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notifications could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timeoutId = window.setTimeout(() => {
      void loadNotifications(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadNotifications, user]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const timeoutId = window.setTimeout(() => {
      setBrowserNotificationPermission(window.Notification.permission);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!birthdays.length) return;
    if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") return;

    const birthdayAlerts = birthdays
      .map((birthday) => {
        if (birthday.daysUntil === 0 && shouldSendBirthdayAlert(birthday.reminderKey)) {
          return {
            birthday,
            key: birthday.reminderKey,
            title: "SKF Birthday Reminder",
            body: `${birthday.name || birthday.id}'s birthday is today. Mark as wished after sending the wish.`,
            repeat: true,
          };
        }

        const tomorrowKey = `tomorrow:${birthday.reminderKey}`;
        if (birthday.daysUntil === 1 && shouldSendQueueAlert(tomorrowKey)) {
          return {
            birthday,
            key: tomorrowKey,
            title: "SKF Birthday Tomorrow",
            body: `${birthday.name || birthday.id}'s birthday is tomorrow. Keep the wish ready.`,
            repeat: false,
          };
        }

        return null;
      })
      .filter((alert): alert is {
        birthday: BirthdayNotification;
        key: string;
        title: string;
        body: string;
        repeat: boolean;
      } => Boolean(alert));

    if (!birthdayAlerts.length) return;

    const timeoutId = window.setTimeout(() => {
      void navigator.serviceWorker?.ready
        .then((registration) => {
          birthdayAlerts.forEach((alert) => {
            if (alert.repeat) setBirthdayAlertSent(alert.birthday.reminderKey);
            else setQueueAlertSent(alert.key);

            void registration.showNotification(alert.title, {
              body: alert.body,
              data: { url: "/dashboard" },
              tag: `birthday-${alert.key}`,
            });
          });
        })
        .catch(() => null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [birthdays]);

  useEffect(() => {
    if (!posterReminders.length) return;
    if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") return;

    const posterAlerts = posterReminders
      .map((poster) => {
        const repeat = poster.phase === "publish";
        if (!shouldSendPosterAlert(poster.reminderKey, repeat)) return null;

        return {
          poster,
          title: repeat ? "SKF Poster Reminder" : "SKF Poster Tomorrow",
          body: repeat
            ? `${poster.name} is today. Post the WhatsApp/group poster and mark it posted.`
            : `${poster.name} is tomorrow. Prepare the poster now so it is ready to publish.`,
          repeat,
        };
      })
      .filter((alert): alert is {
        poster: PosterReminder;
        title: string;
        body: string;
        repeat: boolean;
      } => Boolean(alert));

    if (!posterAlerts.length) return;

    const timeoutId = window.setTimeout(() => {
      void navigator.serviceWorker?.ready
        .then((registration) => {
          posterAlerts.forEach((alert) => {
            setPosterAlertSent(alert.poster.reminderKey);
            void registration.showNotification(alert.title, {
              body: alert.body,
              data: { url: "/dashboard" },
              tag: `poster-${alert.poster.reminderKey}`,
            });
          });
        })
        .catch(() => null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [posterReminders]);

  useEffect(() => {
    if (!eventReminders.length) return;
    if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") return;

    const eventAlerts = eventReminders
      .map((reminder) => {
        const repeat = reminder.phase === "review";
        if (!shouldSendEventAlert(reminder.reminderKey, repeat)) return null;

        return {
          reminder,
          title: repeat ? "SKF Event Today" : "SKF Event Tomorrow",
          body: repeat
            ? `${reminder.name} is today. Review assignments, results and gallery updates.`
            : `${reminder.name} is tomorrow. Check assignments, posters and event readiness.`,
        };
      })
      .filter((alert): alert is {
        reminder: EventReminder;
        title: string;
        body: string;
      } => Boolean(alert));

    if (!eventAlerts.length) return;

    const timeoutId = window.setTimeout(() => {
      void navigator.serviceWorker?.ready
        .then((registration) => {
          eventAlerts.forEach((alert) => {
            setEventAlertSent(alert.reminder.reminderKey);
            void registration.showNotification(alert.title, {
              body: alert.body,
              data: { url: "/notification-timeline" },
              tag: `event-${alert.reminder.reminderKey}`,
            });
          });
        })
        .catch(() => null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [eventReminders]);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(() => {
      void loadNotifications(true);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications, user]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const eventCount = eventReminders.length + eventUpdates.length;
  const count = paymentProofs.length + admissions.length + orders.length + websiteLeads.length + posterReminders.length + birthdays.length + eventCount;
  const hasItems = count > 0;

  const summary = useMemo(() => [
    { label: "Payments", value: paymentProofs.length },
    { label: "Admissions", value: admissions.length },
    { label: "Orders", value: orders.length },
    { label: "Leads", value: websiteLeads.length },
    { label: "Events", value: eventCount },
    { label: "Posters", value: posterReminders.length },
    { label: "Birthdays", value: birthdays.length },
  ], [admissions.length, birthdays.length, eventCount, orders.length, paymentProofs.length, posterReminders.length, websiteLeads.length]);

  const nextNotification = useMemo<QueueNotification | null>(() => {
    const payment = paymentProofs[0];
    if (payment) {
      return {
        kind: "payment",
        id: `payment:${payment.id}`,
        title: payment.studentName,
        meta: `${payment.studentId} • ${payment.branch} • ${money(payment.amount)}`,
        detail: `${payment.sourceLabel || payment.monthName} ${payment.year || ""}`.trim(),
        proof: payment,
      };
    }

    const eventUpdate = eventUpdates[0];
    if (eventUpdate) {
      return {
        kind: "event_update",
        id: eventUpdate.id,
        title: eventUpdate.title,
        meta: eventUpdate.meta,
        detail: eventUpdate.detail,
        href: eventUpdate.href,
        update: eventUpdate,
      };
    }

    const todayEvent = eventReminders.find((event) => event.daysUntil === 0);
    if (todayEvent) {
      return {
        kind: "event_reminder",
        id: `event:${todayEvent.reminderKey}`,
        title: todayEvent.name,
        meta: eventReminderMeta(todayEvent),
        detail: todayEvent.detail,
        href: todayEvent.href,
        reminder: todayEvent,
      };
    }

    const todayPoster = posterReminders.find((poster) => poster.daysUntil === 0);
    if (todayPoster) {
      return {
        kind: "poster",
        id: `poster:${todayPoster.reminderKey}`,
        title: todayPoster.name,
        meta: posterMeta(todayPoster),
        detail: todayPoster.notes,
        poster: todayPoster,
      };
    }

    const todayBirthday = birthdays.find((birthday) => birthday.daysUntil === 0);
    if (todayBirthday) {
      return {
        kind: "birthday",
        id: `birthday:${todayBirthday.reminderKey}`,
        title: todayBirthday.name || todayBirthday.id,
        meta: birthdayMeta(todayBirthday),
        detail: "Wish today and mark it done.",
        href: `/students/${todayBirthday.branch}`,
        birthday: todayBirthday,
      };
    }

    const admission = admissions[0];
    if (admission) {
      return {
        kind: "admission",
        id: `admission:${admission.id}`,
        title: admission.studentName,
        meta: `${admission.branchName || admission.branchSlug} • ${money(admission.quotedJoiningTotal)}`,
        detail: dateLabel(admission.createdAt) || "Pending admission approval",
        href: "/admissions",
      };
    }

    const websiteLead = websiteLeads[0];
    if (websiteLead) {
      return {
        kind: "website",
        id: `website:${websiteLead.id}`,
        title: websiteLead.title,
        meta: `${websiteLeadLabel(websiteLead.kind)} • ${websiteLead.meta || websiteLead.phone}`,
        detail: websiteLead.submittedAt || websiteLead.detail,
        href: "/dashboard",
        lead: websiteLead,
      };
    }

    const order = orders[0];
    if (order) {
      return {
        kind: "order",
        id: `order:${order.orderId}`,
        title: order.customerName || order.orderId,
        meta: `${order.statusLabel || order.status} • ${money(order.total)}`,
        detail: dateLabel(order.createdAt) || "Pending shop order review",
        href: "/shop",
      };
    }

    const upcomingEvent = eventReminders[0];
    if (upcomingEvent) {
      return {
        kind: "event_reminder",
        id: `event:${upcomingEvent.reminderKey}`,
        title: upcomingEvent.name,
        meta: eventReminderMeta(upcomingEvent),
        detail: upcomingEvent.detail,
        href: upcomingEvent.href,
        reminder: upcomingEvent,
      };
    }

    const upcomingPoster = posterReminders[0];
    if (upcomingPoster) {
      return {
        kind: "poster",
        id: `poster:${upcomingPoster.reminderKey}`,
        title: upcomingPoster.name,
        meta: posterMeta(upcomingPoster),
        detail: upcomingPoster.notes,
        poster: upcomingPoster,
      };
    }

    const upcomingBirthday = birthdays[0];
    if (upcomingBirthday) {
      return {
        kind: "birthday",
        id: `birthday:${upcomingBirthday.reminderKey}`,
        title: upcomingBirthday.name || upcomingBirthday.id,
        meta: birthdayMeta(upcomingBirthday),
        detail: "Birthday reminder for tomorrow.",
        href: `/students/${upcomingBirthday.branch}`,
        birthday: upcomingBirthday,
      };
    }

    return null;
  }, [admissions, birthdays, eventReminders, eventUpdates, orders, paymentProofs, posterReminders, websiteLeads]);

  useEffect(() => {
    if (!nextNotification || nextNotification.kind === "birthday" || nextNotification.kind === "poster" || nextNotification.kind === "event_reminder") return;
    if (browserNotificationPermission !== "granted") return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!shouldSendQueueAlert(nextNotification.id)) return;

    const timeoutId = window.setTimeout(() => {
      const url = nextNotification.kind === "payment" ? "/pending-fees" : nextNotification.href;

      void navigator.serviceWorker?.ready
        .then((registration) => {
          setQueueAlertSent(nextNotification.id);
          void registration.showNotification("SKF FeeTrack Notification", {
            body: queueNotificationBody(nextNotification),
            data: { url },
            tag: `queue-${nextNotification.id}`,
          });
        })
        .catch(() => null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [browserNotificationPermission, nextNotification]);

  const approveProof = async (proof: PaymentVerification) => {
    setActioningId(proof.id);
    setError("");
    try {
      await approvePaymentVerification(proof.id);
      setPaymentProofs((current) => current.filter((item) => item.id !== proof.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment proof approval failed.");
    } finally {
      setActioningId("");
    }
  };

  const rejectProof = async (proof: PaymentVerification) => {
    const reason = window.prompt(`Reject payment proof for ${proof.studentName}? Enter reason:`);
    if (!reason?.trim()) return;

    setActioningId(proof.id);
    setError("");
    try {
      await rejectPaymentVerification(proof.id, reason.trim());
      setPaymentProofs((current) => current.filter((item) => item.id !== proof.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment proof rejection failed.");
    } finally {
      setActioningId("");
    }
  };

  const enableBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!canRequestBrowserNotifications()) {
      setError("Device alerts require HTTPS or localhost. LAN HTTP addresses cannot request notification permission.");
      return;
    }
    const permission = await window.Notification.requestPermission();
    setBrowserNotificationPermission(permission);
  };

  const markBirthdayWished = (birthday: BirthdayNotification) => {
    setBirthdayWished(birthday.reminderKey);
    setBirthdays((current) => current.filter((item) => item.reminderKey !== birthday.reminderKey));
  };

  const markPosterReminderDone = (poster: PosterReminder) => {
    setPosterReminderDone(poster.reminderKey);
    setPosterReminders((current) => current.filter((item) => item.reminderKey !== poster.reminderKey));
  };

  const markEventReminderReviewed = (reminder: EventReminder) => {
    setEventReminderDone(reminder.reminderKey);
    setEventReminders((current) => current.filter((item) => item.reminderKey !== reminder.reminderKey));
  };

  const markEventUpdateSeen = (update: EventUpdateNotification) => {
    const pending = readEventUpdates();
    delete pending[update.eventId];
    writeEventUpdates(pending);
    setEventUpdates((current) => current.filter((item) => item.eventId !== update.eventId));
  };

  const markLeadContacted = async (lead: WebsiteNotification) => {
    setActioningId(`website:${lead.id}`);
    setError("");
    try {
      await markWebsiteNotificationContacted(lead.kind, lead.rowNumber);
      setWebsiteLeads((current) => current.filter((item) => item.id !== lead.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead status update failed.");
    } finally {
      setActioningId("");
    }
  };

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex min-h-11 w-11 items-center justify-center rounded-full border transition-colors ${
          open
            ? "border-white/20 bg-white text-black"
            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-white"
        }`}
        aria-label={`${count} notifications`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border border-black bg-amber-400 px-1 text-[10px] font-bold text-black">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-3 right-3 top-20 z-[90] max-h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#050505] shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-[3.25rem] sm:w-[420px] sm:max-w-[420px]">
          <div className="border-b border-white/[0.08] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Notifications</p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {hasItems ? `${count} notification${count === 1 ? "" : "s"}` : "All clear"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => loadNotifications(true)}
                disabled={refreshing}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-black text-zinc-500 hover:text-white disabled:opacity-60"
                aria-label="Refresh notifications"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-7">
              {summary.map((item) => (
                <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                  <p className="font-semibold text-white">{item.value}</p>
                  <p className="mt-0.5 text-zinc-600">{item.label}</p>
                </div>
              ))}
            </div>
            {typeof window !== "undefined" && "Notification" in window && browserNotificationPermission !== "granted" ? (
              canRequestBrowserNotifications() ? (
                <button
                  type="button"
                  onClick={enableBrowserNotifications}
                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/15"
                >
                  <Bell className="h-3.5 w-3.5" />
                  {browserNotificationPermission === "denied" ? "Alerts Blocked in Browser" : "Enable Device Alerts"}
                </button>
              ) : (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100/80">
                  Device alerts need HTTPS or localhost. In-app notifications still appear here.
                </div>
              )
            ) : null}
          </div>

          <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto p-3 sm:max-h-[70vh]">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {error}
              </div>
            ) : !hasItems ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
                <CheckCircle2 className="mb-3 h-7 w-7 text-emerald-400" />
                <p className="text-sm font-semibold text-white">No pending reviews</p>
                <p className="mt-1 text-xs text-zinc-600">New approvals, orders, poster reminders and birthday reminders will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {nextNotification ? (
                  <NextQueueCard
                    item={nextNotification}
                    actioningId={actioningId}
                    onApproveProof={approveProof}
                    onRejectProof={rejectProof}
                    onBirthdayWished={markBirthdayWished}
                    onPosterReminderDone={markPosterReminderDone}
                    onEventReminderReviewed={markEventReminderReviewed}
                    onEventUpdateSeen={markEventUpdateSeen}
                    onWebsiteContacted={markLeadContacted}
                    onClose={() => setOpen(false)}
                  />
                ) : null}

                {paymentProofs.length ? (
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      <Wallet className="h-3.5 w-3.5" />
                      Payment Proofs
                    </p>
                    <div className="space-y-2">
                      {paymentProofs.map((proof) => (
                        <div key={proof.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{proof.studentName}</p>
                              <p className="mt-1 text-xs text-emerald-100/75">
                                {proof.studentId} • {proof.branch} • {money(proof.amount)}
                              </p>
                              <p className="mt-1 text-[10px] text-zinc-500">
                                {proof.sourceLabel || proof.monthName} {proof.year || ""}
                              </p>
                            </div>
                            {proof.proofUrl ? (
                              <a
                                href={proof.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-zinc-400 hover:text-white"
                                aria-label="Open payment proof"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => rejectProof(proof)}
                              disabled={actioningId === proof.id}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => approveProof(proof)}
                              disabled={actioningId === proof.id}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {admissions.length ? (
                  <NotificationSection
                    title="Admissions"
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    href="/admissions"
                    items={admissions.map((application) => ({
                      id: application.id,
                      title: application.studentName,
                      meta: `${application.branchName || application.branchSlug} • ${money(application.quotedJoiningTotal)}`,
                      time: dateLabel(application.createdAt),
                    }))}
                  />
                ) : null}

                {orders.length ? (
                  <NotificationSection
                    title="Shop Orders"
                    icon={<Package className="h-3.5 w-3.5" />}
                    href="/shop"
                    items={orders.map((order) => ({
                      id: order.orderId,
                      title: order.customerName || order.orderId,
                      meta: `${order.statusLabel || order.status} • ${money(order.total)}`,
                      time: dateLabel(order.createdAt),
                    }))}
                  />
                ) : null}

                {websiteLeads.length ? (
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      <UserPlus className="h-3.5 w-3.5" />
                      Website Leads
                    </p>
                    <div className="space-y-2">
                      {websiteLeads.map((lead) => {
                        const phoneLink = callHref(lead.phone);
                        const waLink = whatsappHref(lead.phone, lead);

                        return (
                          <div key={lead.id} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                            <div className="flex items-start gap-3">
                              <UserPlus className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{lead.title}</p>
                                <p className="mt-1 truncate text-xs text-cyan-100/80">
                                  {websiteLeadLabel(lead.kind)} • {lead.meta || lead.phone}
                                </p>
                                {lead.detail ? <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{lead.detail}</p> : null}
                                {lead.submittedAt ? <p className="mt-1 text-[10px] text-zinc-600">{lead.submittedAt}</p> : null}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <a
                                href={phoneLink || undefined}
                                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-black px-2 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white ${phoneLink ? "" : "pointer-events-none opacity-40"}`}
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                                Call
                              </a>
                              <a
                                href={waLink || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 ${waLink ? "" : "pointer-events-none opacity-40"}`}
                              >
                                WhatsApp
                              </a>
                              <button
                                type="button"
                                onClick={() => markLeadContacted(lead)}
                                disabled={actioningId === `website:${lead.id}`}
                                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-white px-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Done
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {eventUpdates.length ? (
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      <Trophy className="h-3.5 w-3.5" />
                      Event Updates
                    </p>
                    <div className="space-y-2">
                      {eventUpdates.map((update) => (
                        <div key={update.id} className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
                          <div className="flex items-start gap-3">
                            <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-300" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{update.title}</p>
                              <p className="mt-1 truncate text-xs text-sky-100/80">{update.meta}</p>
                              <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{update.detail}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                              href="/notification-timeline"
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
                            >
                              Timeline
                            </Link>
                            <button
                              type="button"
                              onClick={() => markEventUpdateSeen(update)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Seen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {eventReminders.length ? (
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      <Trophy className="h-3.5 w-3.5" />
                      Event Reminders
                    </p>
                    <div className="space-y-2">
                      {eventReminders.map((reminder) => (
                        <div key={reminder.reminderKey} className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
                          <div className="flex items-start gap-3">
                            <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-300" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{reminder.name}</p>
                              <p className="mt-1 truncate text-xs text-sky-100/80">{eventReminderMeta(reminder)}</p>
                              <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{reminder.detail}</p>
                              <p className="mt-1 text-[10px] text-zinc-500">
                                {reminder.phase === "review"
                                  ? "Repeats every 4 hours until marked reviewed."
                                  : "Reminder for tomorrow."}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                              href="/notification-timeline"
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
                            >
                              Timeline
                            </Link>
                            <button
                              type="button"
                              onClick={() => markEventReminderReviewed(reminder)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Reviewed
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {posterReminders.length ? (
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      <Megaphone className="h-3.5 w-3.5" />
                      Poster Reminders
                    </p>
                    <div className="space-y-2">
                      {posterReminders.map((poster) => (
                        <div key={poster.reminderKey} className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3">
                          <div className="flex items-start gap-3">
                            <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-fuchsia-300" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{poster.name}</p>
                              <p className="mt-1 truncate text-xs text-fuchsia-100/80">{posterMeta(poster)}</p>
                              <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{poster.notes}</p>
                              <p className="mt-1 text-[10px] text-zinc-500">
                                {poster.phase === "publish"
                                  ? "Repeats every 4 hours until marked posted."
                                  : "Reminder to prepare the poster one day before."}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => markPosterReminderDone(poster)}
                            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {poster.phase === "publish" ? "Posted" : "Prepared"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {birthdays.length ? (
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Birthday Reminders
                    </p>
                    <div className="space-y-2">
                      {birthdays.map((birthday) => (
                        <div key={birthday.reminderKey} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                          <div className="flex items-start gap-3">
                            <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{birthday.name || birthday.id}</p>
                              <p className="mt-1 truncate text-xs text-amber-100/80">{birthdayMeta(birthday)}</p>
                              <p className="mt-1 text-[10px] text-zinc-500">
                                {birthday.daysUntil === 0
                                  ? "Repeats every 4 hours until marked wished."
                                  : "Reminder for tomorrow."}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                              href={`/students/${birthday.branch}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
                            >
                              Open Profile
                            </Link>
                            <button
                              type="button"
                              onClick={() => markBirthdayWished(birthday)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Wished
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NextQueueCard({
  item,
  actioningId,
  onApproveProof,
  onRejectProof,
  onBirthdayWished,
  onPosterReminderDone,
  onEventReminderReviewed,
  onEventUpdateSeen,
  onWebsiteContacted,
  onClose,
}: {
  item: QueueNotification;
  actioningId: string;
  onApproveProof: (proof: PaymentVerification) => void;
  onRejectProof: (proof: PaymentVerification) => void;
  onBirthdayWished: (birthday: BirthdayNotification) => void;
  onPosterReminderDone: (poster: PosterReminder) => void;
  onEventReminderReviewed: (reminder: EventReminder) => void;
  onEventUpdateSeen: (update: EventUpdateNotification) => void;
  onWebsiteContacted: (lead: WebsiteNotification) => void;
  onClose: () => void;
}) {
  const styles = {
    payment: {
      card: "border-emerald-500/30 bg-emerald-500/10",
      icon: "bg-emerald-400 text-black",
      label: "Payment Review",
      iconNode: <Wallet className="h-4 w-4" />,
    },
    admission: {
      card: "border-sky-500/25 bg-sky-500/10",
      icon: "bg-sky-400 text-black",
      label: "Admission Review",
      iconNode: <ShieldCheck className="h-4 w-4" />,
    },
    order: {
      card: "border-violet-500/25 bg-violet-500/10",
      icon: "bg-violet-300 text-black",
      label: "Shop Review",
      iconNode: <Package className="h-4 w-4" />,
    },
    website: {
      card: "border-cyan-500/25 bg-cyan-500/10",
      icon: "bg-cyan-300 text-black",
      label: "Website Lead",
      iconNode: <UserPlus className="h-4 w-4" />,
    },
    birthday: {
      card: "border-amber-500/25 bg-amber-500/10",
      icon: "bg-amber-300 text-black",
      label: "Birthday Reminder",
      iconNode: <Gift className="h-4 w-4" />,
    },
    poster: {
      card: "border-fuchsia-500/25 bg-fuchsia-500/10",
      icon: "bg-fuchsia-300 text-black",
      label: item.kind === "poster" && item.poster.phase === "publish" ? "Poster Posting" : "Poster Preparation",
      iconNode: <Megaphone className="h-4 w-4" />,
    },
    event_reminder: {
      card: "border-sky-500/25 bg-sky-500/10",
      icon: "bg-sky-300 text-black",
      label: item.kind === "event_reminder" && item.reminder.phase === "review" ? "Event Today" : "Event Tomorrow",
      iconNode: <Trophy className="h-4 w-4" />,
    },
    event_update: {
      card: "border-sky-500/25 bg-sky-500/10",
      icon: "bg-sky-300 text-black",
      label: "Event Update",
      iconNode: <Trophy className="h-4 w-4" />,
    },
  }[item.kind];

  return (
    <section className={`rounded-2xl border p-3 ${styles.card}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          {styles.iconNode}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Next Notification</p>
            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white">
              {styles.label}
            </span>
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-white">{item.title}</h3>
          <p className="mt-1 text-xs text-zinc-300">{item.meta}</p>
          {item.detail ? <p className="mt-1 text-[10px] text-zinc-500">{item.detail}</p> : null}
          <p className="mt-2 text-[10px] text-zinc-500">Resolve this item, then the next notification will move here.</p>
        </div>
      </div>

      {item.kind === "payment" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {item.proof.proofUrl ? (
            <a
              href={item.proof.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Proof
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onRejectProof(item.proof)}
            disabled={actioningId === item.proof.id}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApproveProof(item.proof)}
            disabled={actioningId === item.proof.id}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </button>
        </div>
      ) : item.kind === "birthday" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={item.href}
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
          >
            Open Profile
          </Link>
          <button
            type="button"
            onClick={() => onBirthdayWished(item.birthday)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Wished
          </button>
        </div>
      ) : item.kind === "poster" ? (
        <button
          type="button"
          onClick={() => onPosterReminderDone(item.poster)}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {item.poster.phase === "publish" ? "Posted" : "Prepared"}
        </button>
      ) : item.kind === "event_reminder" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/notification-timeline"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
          >
            Timeline
          </Link>
          <button
            type="button"
            onClick={() => onEventReminderReviewed(item.reminder)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Reviewed
          </button>
        </div>
      ) : item.kind === "event_update" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/notification-timeline"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
          >
            Timeline
          </Link>
          <button
            type="button"
            onClick={() => onEventUpdateSeen(item.update)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Seen
          </button>
        </div>
      ) : item.kind === "website" ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={callHref(item.lead.phone) || undefined}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-black px-2 text-xs font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white ${callHref(item.lead.phone) ? "" : "pointer-events-none opacity-40"}`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Call
          </a>
          <a
            href={whatsappHref(item.lead.phone, item.lead) || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 ${whatsappHref(item.lead.phone, item.lead) ? "" : "pointer-events-none opacity-40"}`}
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => onWebsiteContacted(item.lead)}
            disabled={actioningId === `website:${item.lead.id}`}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-white px-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
          </button>
        </div>
      ) : (
        <Link
          href={item.href}
          onClick={onClose}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
        >
          Review Now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}

function NotificationSection({
  title,
  icon,
  href,
  items,
}: {
  title: string;
  icon: ReactNode;
  href: string;
  items: Array<{ id: string; title: string; meta: string; time: string; href?: string }>;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {icon}
          {title}
        </p>
        <Link href={href} className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-white">
          Open
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href || href}
            className="block rounded-xl border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{item.meta}</p>
                {item.time ? <p className="mt-1 text-[10px] text-zinc-600">{item.time}</p> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
