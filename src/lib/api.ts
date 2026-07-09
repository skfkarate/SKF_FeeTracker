// SKF Karate FeeTrack API - same-origin proxy to the SKF-Karate backend.

import { getCurrentFeeYear } from "@/lib/fee-year";

const API_URL = "/api/feetrack/data";

async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas is empty'));
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface StudentData {
  id: string;
  name: string;
  status: string;
  fee: number;
  phone: string;
  joinMonth: number;
}

// Empty mock data - retained only for local fallback shape.
const MOCK_STUDENTS: Record<string, StudentData[]> = {
  Herohalli: [],
  MPSC: [],
};

// Track paid status changes in memory
const paidStatus: Record<string, boolean> = {};

export interface Student {
  id: string;
  name: string;
  parentName: string;
  status: string;
  fee: number;
  phone: string;
  whatsapp: string;
  dateOfBirth: string;
  email: string;
  gender?: string;
  photoUrl?: string;
  hasProfilePhoto?: boolean;
  paid: boolean;
  monthStatus: "Paid" | "Pending" | "Break" | "Discontinued" | "N/A" | "Pending Verification";
  joinMonth: number;
  originalFee?: number;
  creditApplied?: number;
  trainingMonths?: number;
  trainingExperience?: string;
  receiptId?: string | null;
  paidDate?: string | null;
  // New Fee Fields
  admissionFee?: number;
  admissionStatus?: "Paid" | "Pending";
  admissionReceiptId?: string | null;
  dressFee?: number;
  dressCost?: number;
  dressStatus?: "Paid" | "Pending";
  dressReceiptId?: string | null;
  eventDues?: EventStudentDue[];
  isExamInstallment?: boolean;
}

export interface EventStudentDue {
  id: string;
  eventId: string;
  label: string;
  feeType: string;
  amount: number;
  status: string;
  receiptId?: string | null;
  dueDate?: string;
  month?: string;
  year?: number;
  proofId?: string | null;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  paidCount: number;
  pendingCount: number;
  collectionRate: number;
  totalCollected: number;
  pendingAmount: number;
}

const isMockData = () => false;

// ============================================
// FETCH HELPERS - Timeout & Retry
// ============================================

const DEFAULT_TIMEOUT = 12000;
const HEAVY_ACTION_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 300; // 300ms - faster retries

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
  timeout = DEFAULT_TIMEOUT,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      // If we get a response (even an error response), return it
      if (response.ok || response.status < 500) {
        return response;
      }

      // Server error - retry, but return the final response so callers can read its JSON error body.
      if (attempt === retries) {
        return response;
      }
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Timeouts already waited for the full timeout window; fail fast with a clear error.
      if (lastError.name === "AbortError" || attempt === retries) {
        break;
      }

      // Exponential backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Request failed after retries");
}

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: unknown;
};

async function readJsonResponse(response: Response): Promise<ApiEnvelope> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as ApiEnvelope;
  } catch {
    return {
      success: false,
      error: text || `FeeTrack request failed (${response.status})`,
    };
  }
}

function clearExpiredClientSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("skf_user");
  localStorage.removeItem("skf_login_time");
}

async function apiAction<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const heavyActions = new Set([
    "get_students",
    "get_branch_counts",
    "get_dev_fund",
    "get_finance_command_center",
    "get_financial_summary",
    "get_event_collections",
    "get_gallery_photos",
    "get_shop_orders",
    "get_website_analytics",
  ]);
  const response = await fetchWithRetry(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  }, MAX_RETRIES, heavyActions.has(action) ? HEAVY_ACTION_TIMEOUT : DEFAULT_TIMEOUT);

  const data = await readJsonResponse(response);
  if (response.status === 401) {
    clearExpiredClientSession();
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `FeeTrack request failed (${response.status})`);
  }
  return data as T;
}

// ============================================
// CACHE SYSTEM - Instant Repeat Loads
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache store
const cache = new Map<string, CacheEntry<unknown>>();
const pendingFetches = new Map<string, Promise<unknown>>();

// Cache durations (in milliseconds)
const CACHE_TTL = {
  students: 60 * 1000,           // 1 minute - fast sync for fee tracking
  financial: 2 * 60 * 1000,     // 2 minutes
  devFund: 3 * 60 * 1000,       // 3 minutes
  referrals: 3 * 60 * 1000,     // 3 minutes
  branchCounts: 5 * 60 * 1000,  // 5 minutes - rarely changes
};

/**
 * Get TTL for a cache key based on prefix
 */
function getTTLForKey(key: string): number {
  if (key.startsWith('students:')) return CACHE_TTL.students;
  if (key.startsWith('financial:')) return CACHE_TTL.financial;
  if (key.startsWith('eventCollections:')) return CACHE_TTL.financial;
  if (key.startsWith('branchTimetables')) return CACHE_TTL.financial;
  if (key.startsWith('galleryPhotos')) return CACHE_TTL.financial;
  if (key.startsWith('shopProducts')) return CACHE_TTL.financial;
  if (key.startsWith('shopOrders')) return CACHE_TTL.financial;
  if (key.startsWith('devFund:')) return CACHE_TTL.devFund;
  if (key.startsWith('referral:')) return CACHE_TTL.referrals;
  if (key.startsWith('branchCounts')) return CACHE_TTL.branchCounts;
  return CACHE_TTL.students;
}

/**
 * Get data from cache if available and fresh (simple TTL only — no stale data)
 */
function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age < getTTLForKey(key)) {
    return entry.data;
  }

  // Expired — remove and return null
  cache.delete(key);
  return null;
}

/**
 * Set cache entry
 */
function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    pendingFetches.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }

  for (const key of pendingFetches.keys()) {
    if (key.includes(pattern)) {
      pendingFetches.delete(key);
    }
  }
}

/**
 * Simple cached fetch — returns fresh cache hit or fetches new data.
 * NO stale-while-revalidate to prevent showing wrong month's data.
 */
async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cachedData = getCached<T>(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  const pending = pendingFetches.get(cacheKey) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetcher()
    .then((freshData) => {
      setCache(cacheKey, freshData);
      return freshData;
    })
    .finally(() => {
      pendingFetches.delete(cacheKey);
    });

  pendingFetches.set(cacheKey, request);
  return request;
}

function invalidateFinancialCaches(branch: string, year: number) {
  invalidateCache(`financial:${branch}:${year}`);
  invalidateCache(`financial:Overall:${year}`);
  invalidateCache(`financeCommand:${branch}:${year}`);
  invalidateCache(`financeCommand:Overall:${year}`);
}

type StudentsResponse = {
  students?: Student[];
  data?: Student[] | { students?: Student[] };
};

function extractStudents(response: StudentsResponse) {
  if (Array.isArray(response.students)) return response.students;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.students)) {
    return response.data.students;
  }

  throw new Error("FeeTrack backend returned an invalid student list.");
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getStudents(
  branch: string,
  month: number,
  forceRefresh = false,
  year = getCurrentFeeYear(),
): Promise<Student[]> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 500));
    const allStudents = MOCK_STUDENTS[branch] || MOCK_STUDENTS["Herohalli"];

    // Only return students who joined on or before this month
    const students = allStudents.filter((s) => s.joinMonth <= month);

    return students.map((s) => ({
      ...s,
      parentName: "",
      whatsapp: s.phone,
      dateOfBirth: "",
      email: "",
      paid:
        paidStatus[`${branch}-${month}-${s.id}`] ??
        (month === 0
          ? s.id.includes("001") ||
          s.id.includes("002") ||
          s.id.includes("005") ||
          s.id.includes("007")
          : false),
      monthStatus: (paidStatus[`${branch}-${month}-${s.id}`]
        ? "Paid"
        : "Pending") as Student["monthStatus"],
    }));
  }

  // No need to adjust month anymore, backend handles 0-based index correctly now
  const adjustedMonth = month;

  const cacheKey = `students:${branch}:${year}:${month}`; // Keep cache key based on requested month/year

  // Force-invalidate on month switch to prevent stale data from wrong month
  if (forceRefresh) {
    invalidateCache(cacheKey);
  }

  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<StudentsResponse>("get_students", {
      branch,
      month: adjustedMonth,
      year,
    });
    return extractStudents(data);
  });
}

export interface StudentProfilePhotoUploadResult {
  skfId: string;
  photoUrl: string;
  storagePath?: string;
}

export async function uploadStudentProfilePhoto(
  skfId: string,
  photo: File,
): Promise<StudentProfilePhotoUploadResult> {
  const compressedPhoto = await compressImage(photo, 800, 0.85);
  const formData = new FormData();
  formData.set("photo", compressedPhoto);

  const response = await fetchWithTimeout(
    `/api/feetrack/students/${encodeURIComponent(skfId)}/profile-photo`,
    {
      method: "POST",
      body: formData,
    },
    20_000,
  );
  const data = await readJsonResponse(response);

  if (response.status === 401) {
    clearExpiredClientSession();
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Profile photo upload failed (${response.status})`);
  }

  invalidateCache("students:");
  return data.data as StudentProfilePhotoUploadResult;
}

export async function markPaid(
  id: string,
  branch: string,
  month: number,
  year = getCurrentFeeYear(),
): Promise<{ receiptId?: string | null }> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    paidStatus[`${branch}-${month}-${id}`] = true;
    return {};
  }

  const data = await apiAction<{
    data?: {
      receipt?: { receiptId?: string | null };
      entry?: { receiptId?: string | null };
    };
  }>("mark_paid", {
    id,
    branch,
    month,
    year,
  });

  // Invalidate student and financial caches
  invalidateCache(`students:${branch}:${year}:${month}`);
  invalidateFinancialCaches(branch, year);
  return {
    receiptId: data.data?.receipt?.receiptId || data.data?.entry?.receiptId || null,
  };
}

export async function markBreak(
  id: string,
  branch: string,
  month: number,
  year = getCurrentFeeYear(),
): Promise<void> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    // In mock mode, just simulate the action
    return;
  }

  await apiAction("mark_break", {
    id,
    branch,
    month,
    year,
  });

  // Invalidate caches - break affects this month's data
  invalidateCache(`students:${branch}:${year}:${month}`);
  invalidateFinancialCaches(branch, year);
}

export async function markDiscontinued(
  id: string,
  branch: string,
  month: number,
  year = getCurrentFeeYear(),
): Promise<void> {
  if (isMockData()) return;
  await apiAction("mark_discontinued", { id, branch, month, year });

  // Invalidate ALL month caches for this branch - discontinued affects all future months
  invalidateCache(`students:${branch}`);
  invalidateFinancialCaches(branch, year);
  invalidateCache('branchCounts');
}

export async function resumeStudent(
  id: string,
  branch: string,
  month: number,
  year = getCurrentFeeYear(),
  monthlyFee?: number,
): Promise<void> {
  if (isMockData()) return;
  await apiAction("resume_student", {
    id,
    branch,
    month,
    year,
    monthlyFee,
  });

  invalidateCache(`students:${branch}`);
  invalidateFinancialCaches(branch, year);
  invalidateCache('branchCounts');
}

export async function allocateExamFee(
  id: string,
  branch: string,
  month: number,
  amount: number,
  year = getCurrentFeeYear(),
): Promise<void> {
  if (isMockData()) return;
  await apiAction("allocate_exam_fee", {
    id,
    branch,
    month,
    year,
    amount,
  });

  invalidateCache(`students:${branch}:${year}:${month}`);
  invalidateFinancialCaches(branch, year);
}

export async function createManualStudentFee(input: {
  studentId: string;
  branch: string;
  month: number;
  year?: number;
  title: string;
  description?: string;
  amount: number;
  dueDate?: string;
}): Promise<{ entry?: EventStudentDue }> {
  if (isMockData()) return {};
  const data = await apiAction<{
    data?: {
      entry?: {
        id?: string;
        sourceId?: string | null;
        sourceLabel?: string | null;
        feeType?: string;
        amount?: number;
        status?: string;
        receiptId?: string | null;
        dueDate?: string | null;
        month?: string;
        year?: number;
      };
    };
  }>("create_manual_student_fee", {
    id: input.studentId,
    branch: input.branch,
    month: input.month,
    year: input.year ?? getCurrentFeeYear(),
    title: input.title,
    description: input.description,
    amount: input.amount,
    dueDate: input.dueDate,
  });
  invalidateCache(`students:${input.branch}:${input.year ?? getCurrentFeeYear()}:${input.month}`);
  invalidateFinancialCaches(input.branch, input.year ?? getCurrentFeeYear());
  invalidateCache("financeCommand:");

  const entry = data.data?.entry;
  return {
    entry: entry
      ? {
        id: String(entry.id || ""),
        eventId: String(entry.sourceId || ""),
        label: String(entry.sourceLabel || "Manual Fee"),
        feeType: String(entry.feeType || "other"),
        amount: Number(entry.amount || 0),
        status: String(entry.status || "due"),
        receiptId: entry.receiptId || null,
        dueDate: String(entry.dueDate || ""),
        month: entry.month || "",
        year: entry.year || input.year || getCurrentFeeYear(),
      }
      : undefined,
  };
}

/**
 * Mark a non-recurring fee (Admission or Dress) as Paid
 */
export async function markNonRecurringFeePaid(
  studentId: string,
  branch: string,
  feeType: "Admission" | "Dress",
  month: number,
  year = getCurrentFeeYear(),
): Promise<{ receiptId?: string | null }> {
  if (isMockData()) return {};
  const data = await apiAction<{
    data?: {
      receipt?: { receiptId?: string | null };
      entry?: { receiptId?: string | null };
    };
  }>("mark_non_recurring_paid", {
    studentId,
    branch,
    feeType,
    month,
    year,
  });
  invalidateCache(`students:${branch}:${year}:${month}`);
  invalidateFinancialCaches(branch, year);
  return {
    receiptId: data.data?.receipt?.receiptId || data.data?.entry?.receiptId || null,
  };
}

export async function markEventFeePaid(
  studentId: string,
  branch: string,
  feeType: EventStudentDue["feeType"],
  feeRecordId: string,
  month: number,
  year = getCurrentFeeYear(),
): Promise<{ receiptId?: string | null }> {
  if (isMockData()) return {};
  const data = await apiAction<{
    data?: {
      receipt?: { receiptId?: string | null };
      entry?: { receiptId?: string | null };
    };
  }>("mark_paid", {
    skfId: studentId,
    branch,
    month,
    year,
    feeType,
    feeRecordId,
  });
  invalidateCache(`students:${branch}:${year}:${month}`);
  invalidateFinancialCaches(branch, year);
  invalidateCache("financeCommand:");
  return {
    receiptId: data.data?.receipt?.receiptId || data.data?.entry?.receiptId || null,
  };
}

export async function getDashboardStats(
  branch: string,
  month: number,
  forceRefresh = false,
  year = getCurrentFeeYear(),
): Promise<DashboardStats> {
  const students = await getStudents(branch, month, forceRefresh, year);
  const active = students.filter((s) => s.status === "Active");
  const paid = active.filter((s) => s.paid);

  return {
    totalStudents: students.length,
    activeStudents: active.length,
    paidCount: paid.length,
    pendingCount: active.length - paid.length,
    collectionRate:
      active.length > 0 ? Math.round((paid.length / active.length) * 100) : 0,
    totalCollected: paid.reduce((sum, s) => sum + s.fee, 0),
    pendingAmount: active
      .filter((s) => !s.paid)
      .reduce((sum, s) => sum + s.fee, 0),
  };
}

export async function addStudent(
  branch: string,
  id: string,
  name: string,
  fee: number,
  phone: string,
  joinMonth: number,
  // New optional fields
  admissionFee?: number,
  admissionPaid?: boolean,
  dressFee?: number,
  dressCost?: number,
  dressPaid?: boolean,
  year = getCurrentFeeYear(),
): Promise<{ id: string; name: string }> {
  if (isMockData()) {
    // Mock implementation omitted for brevity
    return { id, name };
  }

  const data = await apiAction<{ data: { id: string; name: string } }>("add_student", {
    branch,
    id,
    name,
    fee,
    phone,
    joinMonth,
    admissionFee,
    admissionPaid,
    dressFee,
    dressCost,
    dressPaid,
    year,
  });

  // Invalidate ALL student caches for this branch - new student appears in all months from joinMonth onwards
  invalidateCache(`students:${branch}`);
  invalidateFinancialCaches(branch, year);
  invalidateCache('branchCounts');

  return data.data;
}

export async function getBranchCounts(): Promise<{
  herohalli: number;
  mp: number;
}> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      herohalli: MOCK_STUDENTS["Herohalli"].length,
      mp: MOCK_STUDENTS["MPSC"].length,
    };
  }

  const cacheKey = 'branchCounts';

  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { herohalli: number; mp: number } }>("get_branch_counts");
    return data.data;
  });
}

// ============================================
// PAYMENT VERIFICATIONS
// ============================================

export interface PaymentVerification {
  id: string;
  studentId: string;
  studentName: string;
  branch: string;
  amount: number;
  submittedAt: string;
  paymentReference: string;
  proofUrl: string;
  proofFilename: string;
  feeType: string;
  sourceLabel?: string;
  month: number | null;
  monthName: string;
  year: number;
  status: string;
}

export async function getPaymentVerifications(
  branch = "Overall",
): Promise<PaymentVerification[]> {
  const data = await apiAction<{ data: { verifications: PaymentVerification[] } }>(
    "get_payment_verifications",
    { branch },
  );
  return data.data.verifications;
}

export async function approvePaymentVerification(
  proofId: string,
  note = "",
): Promise<{ receiptId?: string | null }> {
  const data = await apiAction<{
    data?: {
      receipt?: { receiptId?: string | null };
    };
  }>("approve_payment_verification", { proofId, note });

  invalidateCache("students:");
  invalidateCache("financial:");
  invalidateCache("financeCommand:");

  return { receiptId: data.data?.receipt?.receiptId || null };
}

export async function rejectPaymentVerification(
  proofId: string,
  note: string,
): Promise<void> {
  await apiAction("reject_payment_verification", { proofId, note });

  invalidateCache("students:");
  invalidateCache("financial:");
  invalidateCache("financeCommand:");
}

// ============================================
// WEBSITE LEAD NOTIFICATIONS
// ============================================

export interface WebsiteNotification {
  id: string;
  kind: "free_trial" | "callback";
  rowNumber: number;
  title: string;
  phone: string;
  email: string;
  branch: string;
  meta: string;
  detail: string;
  submittedAt: string;
  status: string;
}

export async function getWebsiteNotifications(): Promise<WebsiteNotification[]> {
  const data = await apiAction<{ data: { notifications: WebsiteNotification[] } }>(
    "get_website_notifications",
  );
  return data.data.notifications || [];
}

export async function markWebsiteNotificationContacted(
  kind: WebsiteNotification["kind"],
  rowNumber: number,
): Promise<void> {
  await apiAction("mark_website_notification_contacted", { kind, rowNumber });
}

// ============================================
// SERVER PUSH NOTIFICATIONS
// ============================================

export async function getPushConfig(): Promise<{ publicKey: string }> {
  const data = await apiAction<{ data: { publicKey: string } }>("get_push_config");
  return data.data;
}

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await apiAction("save_push_subscription", {
    subscription,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  });
}

// ============================================
// WEBSITE ANALYTICS
// ============================================

export interface AnalyticsBreakdown {
  label: string;
  value: number;
  percentage: number;
}

export interface DailyWebsiteTraffic {
  date: string;
  views: number;
  visits: number;
  visitors: number;
  leads: number;
}

export interface HourlyWebsiteTraffic {
  hour: number;
  views: number;
}

export interface WebsitePageAnalytics {
  path: string;
  title: string;
  group: string;
  views: number;
  visitors: number;
  entrances: number;
  exits: number;
  lastSeen: string | null;
}

export interface WebsiteVisitorAnalytics {
  visitorId: string;
  firstSeen: string;
  lastSeen: string;
  sessions: number;
  pageViews: number;
  landingPage: string;
  lastPage: string;
  source: string;
  device: string;
  browser: string;
  os: string;
  ipLabel: string | null;
  skfId: string | null;
}

export interface WebsiteRecentPageView {
  id: string;
  path: string;
  title: string;
  visitorId: string | null;
  sessionId: string | null;
  skfId: string | null;
  source: string;
  device: string;
  browser: string;
  os: string;
  createdAt: string;
}

export interface WebsiteOperationalEvent {
  id: string;
  eventType: string;
  path: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  skfId: string | null;
}

export interface WebsiteAnalyticsData {
  period: {
    rangeDays: number;
    startDate: string;
    endDate: string;
    label: string;
    eventsLoaded: number;
    eventLimit: number;
    limited: boolean;
  };
  history: {
    firstRecordedAt: string | null;
    lastRecordedAt: string | null;
    totalEvents: number;
    totalPageViews: number;
  };
  overview: {
    visits: number;
    visitsToday: number;
    uniqueVisitors: number;
    returningVisitors: number;
    pageViews: number;
    publicPageViews: number;
    portalPageViews: number;
    avgPagesPerVisit: number;
    bounceRate: number;
    leadSubmissions: number;
    leadFailures: number;
    leadConversionRate: number;
    portalLogins: number;
    portalLoginFailures: number;
  };
  acquisition: {
    referrers: AnalyticsBreakdown[];
    landingPages: WebsitePageAnalytics[];
  };
  content: {
    topPages: WebsitePageAnalytics[];
    pageGroups: AnalyticsBreakdown[];
    dailyTraffic: DailyWebsiteTraffic[];
    hourlyTraffic: HourlyWebsiteTraffic[];
  };
  audience: {
    devices: AnalyticsBreakdown[];
    browsers: AnalyticsBreakdown[];
    operatingSystems: AnalyticsBreakdown[];
    recentVisitors: WebsiteVisitorAnalytics[];
  };
  operations: {
    events: WebsiteOperationalEvent[];
    eventBreakdown: AnalyticsBreakdown[];
  };
  recent: {
    pageViews: WebsiteRecentPageView[];
  };
  insights: string[];
  warning?: string;
  timeWindowLabel: string;
}

export async function getWebsiteAnalytics(rangeDays = 90): Promise<{
  data: WebsiteAnalyticsData | null;
  warning?: string;
}> {
  const data = await apiAction<{
    data: {
      data: WebsiteAnalyticsData | null;
      warning?: string;
    };
  }>("get_website_analytics", { rangeDays });
  return data.data;
}

// ============================================
// ADMISSIONS
// ============================================

export interface AdmissionApplication {
  id: string;
  branchSlug: string;
  branchName: string;
  preferredBatch: string;
  expectedJoinDate: string;
  studentName: string;
  studentDob: string;
  studentGender: string;
  schoolClass: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianWhatsapp: string;
  guardianEmail: string;
  secondaryGuardianName: string;
  secondaryGuardianRelationship: string;
  secondaryGuardianPhone: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  hasMedicalCondition: boolean;
  medicalDetails: string;
  medications: string;
  specialRequirements: string;
  hasPreviousTraining: boolean;
  martialArtsStyle: string;
  trainingDuration: string;
  previousDojo: string;
  currentBelt: string;
  trainingNotes: string;
  referralSource: string;
  referrerName: string;
  referrerContact: string;
  photoConsent: boolean;
  dataConsent: boolean;
  participationConsent: boolean;
  accuracyConsent: boolean;
  promoCodeId: string;
  promoCode: string;
  promoSnapshot: Record<string, unknown>;
  quotedMonthlyFee: number;
  quotedAdmissionFee: number;
  quotedDressFee: number;
  quotedJoiningTotal: number;
  parentPhotoDriveFileId: string;
  parentPhotoDriveUrl: string;
  parentPhotoFilename: string;
  parentPhotoMimeType: string;
  admissionPhotoPath: string;
  admissionPhotoUrl: string;
  admissionPhotoFilename: string;
  admissionPhotoMimeType: string;
  admissionPhotoSize: number;
  admissionPhotoUploadedAt: string;
  admissionPhotoStatus: string;
  paymentProofPath: string;
  paymentProofUrl: string;
  paymentProofFilename: string;
  paymentProofMimeType: string;
  paymentProofSize: number;
  paymentProofUploadedAt: string;
  duplicateWarnings: Array<Record<string, unknown>>;
  status: "pending" | "approved" | "rejected";
  reviewNote: string;
  rejectionReason: string;
  reviewedBy: string;
  reviewedAt: string;
  approvedSkfId: string;
  finalPhotoUrl: string;
  feeSetup: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionPromoCode {
  id?: string;
  code: string;
  name?: string;
  branchSlug?: string | null;
  status: "active" | "inactive";
  discountType: "percent" | "fixed" | "fee_override" | "admission_waiver";
  discountValue: number;
  appliesTo: "monthly" | "admission" | "dress" | "joining_total";
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  maxUsesPerPhone?: number | null;
  notes?: string;
}

export interface AdmissionBranchSettings {
  branchSlug: string;
  branchName: string;
  isEnabled: boolean;
  showPublicCta: boolean;
  defaultMonthlyFee: number;
  defaultAdmissionFee: number;
  defaultDressFee: number;
  defaultDressCost: number;
  batchOptions: string[];
  notes: string;
}

export interface AdmissionDashboardData {
  applications: AdmissionApplication[];
  promoCodes: AdmissionPromoCode[];
  branchSettings: AdmissionBranchSettings[];
}

export async function getAdmissionDashboard(
  status: "pending" | "approved" | "rejected" | "all" = "pending",
): Promise<AdmissionDashboardData> {
  const data = await apiAction<{ data: AdmissionDashboardData }>("get_admission_dashboard", {
    status,
  });
  return data.data;
}

export async function getAdmissionApplications(
  status: "pending" | "approved" | "rejected" | "all" = "pending",
  limit = 100,
): Promise<AdmissionApplication[]> {
  const data = await apiAction<{ data: { applications: AdmissionApplication[] } }>(
    "get_admission_applications",
    { status, limit },
  );
  return data.data.applications;
}

export async function rejectAdmissionApplication(
  applicationId: string,
  reason: string,
): Promise<AdmissionApplication> {
  const data = await apiAction<{ data: { application: AdmissionApplication } }>(
    "reject_admission_application",
    { applicationId, reason },
  );
  invalidateCache("students:");
  invalidateCache("branchCounts");
  return data.data.application;
}

export async function upsertAdmissionPromoCode(
  promoCode: AdmissionPromoCode,
): Promise<AdmissionPromoCode> {
  const data = await apiAction<{ data: { promoCode: AdmissionPromoCode } }>(
    "upsert_admission_promo_code",
    { promoCode },
  );
  return data.data.promoCode;
}

export async function updateAdmissionBranchSettings(
  settings: AdmissionBranchSettings,
): Promise<AdmissionBranchSettings> {
  const data = await apiAction<{ data: { settings: AdmissionBranchSettings } }>(
    "update_admission_branch_settings",
    { settings },
  );
  return data.data.settings;
}

export interface BranchTimetable {
  id: string;
  branchSlug: string;
  title: string;
  driveUrl: string;
  imageUrl: string;
  monthLabel: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export async function uploadBranchTimetable(input: {
  branch: string;
  image: File;
  monthLabel?: string;
  notes?: string;
}): Promise<BranchTimetable> {
  const compressedImage = await compressImage(input.image, 1200, 0.85);
  const formData = new FormData();
  formData.set("branch", input.branch);
  formData.set("title", `${input.branch === "MPSC" ? "MPSC" : input.branch} Timetable`);
  formData.set("monthLabel", input.monthLabel || "");
  formData.set("notes", input.notes || "");
  formData.set("image", compressedImage);

  const response = await fetchWithRetry("/api/feetrack/timetables/upload", {
    method: "POST",
    body: formData,
  });
  const data = await readJsonResponse(response);

  if (response.status === 401) {
    clearExpiredClientSession();
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Timetable upload failed (${response.status})`);
  }

  invalidateCache("branchTimetables");
  return (data.data as { timetable: BranchTimetable }).timetable;
}

export async function getBranchTimetables(forceRefresh = false): Promise<BranchTimetable[]> {
  const cacheKey = "branchTimetables";
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { timetables: BranchTimetable[] } }>("get_branch_timetables");
    return data.data.timetables || [];
  });
}

export interface PortalVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  durationLabel: string;
  youtubeId: string;
  thumbnailUrl: string;
  branchSlugs: string[];
  batchNames: string[];
  beltLevels: string[];
  isFeatured: boolean;
  isPublished: boolean;
  showInTechniques: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortalVideoInput {
  id?: string;
  title: string;
  description?: string;
  category: string;
  durationLabel?: string;
  youtubeInput?: string;
  youtubeId?: string;
  branchSlugs?: string[];
  batchNames?: string[];
  beltLevels?: string[];
  isFeatured?: boolean;
  isPublished?: boolean;
  showInTechniques?: boolean;
  sortOrder?: number;
}

export async function getPortalVideos(forceRefresh = false): Promise<PortalVideo[]> {
  const cacheKey = "portalVideos";
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { videos: PortalVideo[] } }>("get_portal_videos");
    return data.data.videos || [];
  });
}

export async function upsertPortalVideo(input: PortalVideoInput): Promise<PortalVideo> {
  const data = await apiAction<{ data: { video: PortalVideo } }>("upsert_portal_video", {
    videoId: input.id || "",
    video: input,
  });
  invalidateCache("portalVideos");
  return data.data.video;
}

export async function deletePortalVideo(videoId: string): Promise<{ videoId: string }> {
  const data = await apiAction<{ data: { videoId: string } }>("delete_portal_video", {
    videoId,
  });
  invalidateCache("portalVideos");
  return data.data;
}

export const GALLERY_CATEGORIES = [
  "Demonstrations",
  "Tournaments",
  "Belt Exams",
  "In Dojo",
  "Camps",
  "Championships",
  "Seminars",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryPhoto {
  id: string;
  src: string;
  title: string;
  cat: GalleryCategory | string;
  pinned: boolean;
  isPublished: boolean;
  sortOrder: number;
  storagePath: string;
  eventId?: string;
  eventDate?: string;
  createdAt: string;
  updatedAt: string;
  source: "live" | "seed";
  isSeed: boolean;
}

export interface GalleryPhotoInput {
  id?: string;
  src?: string;
  title: string;
  category: string;
  pinned?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  eventId?: string;
  eventDate?: string;
}

export async function getGalleryPhotos(forceRefresh = false): Promise<GalleryPhoto[]> {
  const cacheKey = "galleryPhotos";
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { photos: GalleryPhoto[] } }>("get_gallery_photos");
    return data.data.photos || [];
  });
}

export async function getEventGalleryPhotos(eventId: string, forceRefresh = false): Promise<GalleryPhoto[]> {
  const cacheKey = `eventGalleryPhotos:${eventId}`;
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { photos: GalleryPhoto[] } }>("get_event_gallery_photos", { eventId });
    return data.data.photos || [];
  });
}

export async function uploadGalleryPhoto(input: {
  photoId?: string;
  file: File;
  title: string;
  category: string;
  pinned?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  eventId?: string;
  eventDate?: string;
}): Promise<GalleryPhoto> {
  const formData = new FormData();
  if (input.photoId) formData.set("photoId", input.photoId);
  formData.set("title", input.title);
  formData.set("category", input.category);
  formData.set("pinned", String(Boolean(input.pinned)));
  formData.set("isPublished", String(input.isPublished !== false));
  formData.set("sortOrder", String(input.sortOrder || 0));
  if (input.eventId) formData.set("eventId", input.eventId);
  if (input.eventDate) formData.set("eventDate", input.eventDate);
  const compressedPhoto = await compressImage(input.file, 1600, 0.85);
  formData.set("photo", compressedPhoto);

  const response = await fetchWithRetry("/api/feetrack/gallery/upload", {
    method: "POST",
    body: formData,
  }, MAX_RETRIES, 25_000);
  const data = await readJsonResponse(response);

  if (response.status === 401) {
    clearExpiredClientSession();
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Gallery photo upload failed (${response.status})`);
  }

  invalidateCache("galleryPhotos");
  return (data.data as { photo: GalleryPhoto }).photo;
}

export async function upsertGalleryPhoto(input: GalleryPhotoInput): Promise<GalleryPhoto> {
  const data = await apiAction<{ data: { photo: GalleryPhoto } }>("upsert_gallery_photo", {
    photoId: input.id || "",
    photo: input,
  });
  invalidateCache("galleryPhotos");
  return data.data.photo;
}

export async function deleteGalleryPhoto(photoId: string): Promise<{ photoId: string }> {
  const data = await apiAction<{ data: { photoId: string } }>("delete_gallery_photo", {
    photoId,
  });
  invalidateCache("galleryPhotos");
  return data.data;
}

export type ShopProductCategory = "uniforms" | "belts" | "gear" | "merchandise";

export interface ShopProductVariant {
  id: string;
  size: string;
  stock: number;
  requiresApproval?: boolean;
}

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ShopProductCategory;
  price: number;
  images: string[];
  variants: ShopProductVariant[];
  rating: number;
  review_count: number;
  requires_belt?: string | null;
  is_public: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export type ShopProductInput = Omit<Partial<ShopProduct>, "variants"> & {
  variants?: Array<Partial<ShopProductVariant> & { size: string; stock: number }>;
};

export type ShopOrderStatus =
  | "processing"
  | "payment-pending"
  | "pending-approval"
  | "approved"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface ShopOrderItem {
  productId: string;
  variantId: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string;
  requiresApproval?: boolean;
}

export interface ShopOrderAddress {
  fullName: string;
  parentName?: string;
  studentName?: string;
  age?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ShopOrder {
  orderId: string;
  skfId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerType: "athlete" | "guest";
  items: ShopOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  discount: number;
  pointsUsed: number;
  promoCode: string | null;
  status: ShopOrderStatus;
  statusLabel: string;
  fulfillmentMethod: "shipping" | "dojo-pickup";
  address: ShopOrderAddress;
  createdAt: string;
  updatedAt?: string | null;
}

export async function getShopProducts(forceRefresh = false): Promise<ShopProduct[]> {
  const cacheKey = "shopProducts";
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { products: ShopProduct[] } }>("get_shop_products");
    return data.data.products || [];
  });
}

export async function upsertShopProduct(product: ShopProductInput): Promise<ShopProduct> {
  const data = await apiAction<{ data: { product: ShopProduct } }>("upsert_shop_product", {
    product,
  });
  invalidateCache("shopProducts");
  return data.data.product;
}

export async function getShopOrders(forceRefresh = false): Promise<ShopOrder[]> {
  const cacheKey = "shopOrders";
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: { orders: ShopOrder[] } }>("get_shop_orders");
    return data.data.orders || [];
  });
}

export async function updateShopOrderStatus(
  orderId: string,
  status: ShopOrderStatus,
): Promise<ShopOrder> {
  const data = await apiAction<{ data: { order: ShopOrder } }>("update_shop_order_status", {
    orderId,
    status,
  });
  invalidateCache("shopOrders");
  return data.data.order;
}

export async function approveAdmissionApplication(input: {
  applicationId: string;
  monthlyFee: number;
  admissionFee: number;
  dressFee: number;
  dressCost: number;
  billingStartDate: string;
  batch?: string;
  belt?: string;
  isPublic: boolean;
  paymentVerified: boolean;
  photoAction: "use_submitted" | "upload_new";
  reviewNote?: string;
  finalPhoto?: File | null;
}): Promise<{ skfId: string }> {
  const formData = new FormData();
  formData.set("monthlyFee", String(input.monthlyFee));
  formData.set("admissionFee", String(input.admissionFee));
  formData.set("dressFee", String(input.dressFee));
  formData.set("dressCost", String(input.dressCost));
  formData.set("billingStartDate", input.billingStartDate);
  formData.set("batch", input.batch || "");
  formData.set("belt", input.belt || "white");
  formData.set("isPublic", String(input.isPublic));
  formData.set("paymentVerified", String(input.paymentVerified));
  formData.set("photoAction", input.photoAction);
  formData.set("reviewNote", input.reviewNote || "");
  if (input.finalPhoto) formData.set("finalPhoto", input.finalPhoto);

  const response = await fetchWithRetry(
    `/api/feetrack/admissions/${encodeURIComponent(input.applicationId)}/approve`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = await readJsonResponse(response);

  if (response.status === 401) {
    clearExpiredClientSession();
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Admission approval failed (${response.status})`);
  }

  invalidateCache("students:");
  invalidateCache("branchCounts");
  invalidateCache("financial:");
  invalidateCache("financeCommand:");

  const payload = data as { data?: { skfId?: string } };
  return { skfId: payload.data?.skfId || "" };
}

// ============================================
// DEVELOPMENT FUND TYPES & FUNCTIONS
// ============================================

export interface MonthlyDevFund {
  month: number;
  year: string;
  collected: number; // Monthly fee cash after referral credits
  devFund: number; // 30% allocation from monthly fee cash
  spent: number; // Expenses this month
  carryForward: number; // Running balance
}

export interface DevExpense {
  id: string;
  month: number;
  year: string;
  title: string;
  description: string;
  scope: string; // "Herohalli" | "MPSC" | "Both" | custom string
  amount: number;
  dateAdded: string;
}

export interface DevelopmentFundData {
  branch: string;
  monthlyBreakdown: MonthlyDevFund[];
  expenses: DevExpense[];
  totalContributions: number;
  totalSpent: number;
  availableBalance: number;
  reserveUsed?: number;
}

// Mock data for development fund
const MOCK_DEV_FUND_DATA: DevelopmentFundData = {
  branch: "Herohalli",
  monthlyBreakdown: Array.from({ length: 12 }, (_, i) => ({
    month: i,
    year: String(getCurrentFeeYear()),
    collected: 0,
    devFund: 0,
    spent: 0,
    carryForward: 0,
  })),
  expenses: [],
  totalContributions: 0,
  totalSpent: 0,
  availableBalance: 0,
};

export async function getDevelopmentFundData(
  year = getCurrentFeeYear(),
  forceRefresh = false,
): Promise<DevelopmentFundData> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return { ...MOCK_DEV_FUND_DATA, branch: "All" };
  }

  const cacheKey = `devFund:all:${year}`;
  if (forceRefresh) invalidateCache(cacheKey);

  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: DevelopmentFundData }>("get_dev_fund", {
      year,
    });
    return data.data;
  });
}

export async function addDevelopmentExpense(
  month: number,
  title: string,
  description: string,
  scope: string,
  amount: number,
  year = getCurrentFeeYear(),
): Promise<DevExpense> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    const newExpense: DevExpense = {
      id: `DEV-${Date.now()}`,
      month,
      year: String(year),
      title,
      description,
      scope,
      amount,
      dateAdded: new Date().toISOString().split("T")[0],
    };
    return newExpense;
  }

  const data = await apiAction<{ data: DevExpense }>("add_dev_expense", {
    month,
    title,
    description,
    scope,
    amount,
    year,
  });

  // Invalidate dev fund and financial caches
  invalidateCache('devFund');
  invalidateCache('financial:');
  invalidateCache('financeCommand:');

  return data.data;
}

export async function deleteDevelopmentExpense(
  expenseId: string,
): Promise<{ success: boolean }> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return { success: true };
  }

  await apiAction("delete_dev_expense", { expenseId });

  // Invalidate dev fund and financial caches
  invalidateCache('devFund');
  invalidateCache('financial:');
  invalidateCache('financeCommand:');

  return { success: true };
}

// ============================================
// REFERRAL CREDITS TYPES & FUNCTIONS
// ============================================

export interface ReferralCredit {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  reason: string;
  dateEarned: string;
  usedInMonth: number | null;
  usedDate: string;
  isUsed: boolean;
  description: string;
}

export interface ReferralCreditsData {
  credits: ReferralCredit[];
  totalUnused: number;
  totalUsed: number;
}

export interface StudentCredits {
  credits: { id: string; amount: number; reason: string; dateEarned: string }[];
  totalAvailable: number;
}

export async function getReferralCredits(
  branch: string,
): Promise<ReferralCreditsData> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return { credits: [], totalUnused: 0, totalUsed: 0 };
  }

  const cacheKey = `referral:${branch}`;

  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: ReferralCreditsData }>("get_referral_credits", {
      branch,
    });
    return data.data;
  });
}

export async function addReferralCredit(
  branch: string,
  studentId: string,
  amount: number,
  reason: string,
  description?: string,
  usedInMonth?: number,
  usedDate?: string,
  year = getCurrentFeeYear(),
): Promise<{
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  reason: string;
  dateEarned: string;
  isUsed: boolean;
}> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      id: "REF-MOCK-" + Math.floor(Math.random() * 1000),
      studentId: studentId,
      studentName: "Mock Student",
      amount: amount,
      reason: reason,
      dateEarned: new Date().toISOString().split("T")[0],
      isUsed: usedInMonth !== undefined,
    };
  }

  const data = await apiAction<{ data: {
    id: string;
    skf_id?: string;
    athleteName?: string;
    amount: number;
    reason?: string;
    created_at?: string;
    status?: string;
  } }>("add_referral_credit", {
    branch,
    studentId,
    amount,
    reason,
    description,
    usedInMonth,
    usedDate,
    year,
  });
  invalidateCache(`referral:${branch}`);
  if (usedInMonth !== undefined) {
    invalidateCache(`students:${branch}:${year}:${usedInMonth}`);
    invalidateFinancialCaches(branch, year);
  }
  return {
    id: data.data.id,
    studentId,
    studentName: data.data.athleteName || "SKF Athlete",
    amount: data.data.amount,
    reason: data.data.reason || reason,
    dateEarned: data.data.created_at || new Date().toISOString(),
    isUsed: data.data.status === "used",
  };
}

export async function editReferralCredit(
  branch: string,
  creditId: string,
  updates: {
    amount?: number;
    reason?: string;
    description?: string;
  }
): Promise<{ success: boolean }> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }

  await apiAction("update_referral_credit", {
    creditId,
    ...updates,
  });
  
  invalidateCache(`referral:${branch}`);
  return { success: true };
}

export async function deleteReferralCredit(
  branch: string,
  creditId: string
): Promise<{ success: boolean }> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }

  await apiAction("delete_referral_credit", {
    creditId,
  });
  
  invalidateCache(`referral:${branch}`);
  return { success: true };
}

export async function getStudentAvailableCredits(
  studentId: string,
  branch: string,
): Promise<StudentCredits> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return { credits: [], totalAvailable: 0 };
  }

  const data = await apiAction<{ data: StudentCredits }>("get_student_credits", {
    studentId,
    branch,
  });
  return data.data;
}

export async function markPaidWithCredit(
  id: string,
  branch: string,
  month: number,
  creditId: string,
  year = getCurrentFeeYear(),
): Promise<{ receiptId?: string | null }> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return {};
  }

  const data = await apiAction<{
    data?: {
      receipt?: { receiptId?: string | null };
      entry?: { receiptId?: string | null };
    };
  }>("mark_paid_with_credit", {
    id,
    branch,
    month,
    creditId,
    year,
  });
  invalidateCache(`students:${branch}:${year}:${month}`);
  invalidateFinancialCaches(branch, year);
  invalidateCache(`referral:${branch}`);
  return {
    receiptId: data.data?.receipt?.receiptId || data.data?.entry?.receiptId || null,
  };
}

// ============================================
// FINANCIAL SUMMARY
// ============================================

export interface YearlyBreakdownItem {
  month: string;
  revenue: number; // Cash revenue
  devFund: number; // Allocated
  expenses: number; // Spent
  net: number; // Net Operational
  cumulativeRevenue: number;
  cumulativeBank: number;
}

export interface FinancialSummary {
  month: number;
  branch: string;
  activeStudents: number;
  paidStudents: number;
  pendingStudents: number;
  expected: number;
  collected: number;
  pending: number;
  creditsApplied: number;
  creditDetails: {
    studentName: string;
    amount: number;
    reason: string;
    description: string;
    date: string;
  }[];
  actualReceived: number;
  actualBankBalance?: number;
  devFundAllocation: number;
  devFundSpent: number;
  devFundBalance: number;
  totalContributions: number;
  availableBalance: number;

  // Analysis
  yearlyBreakdown: YearlyBreakdownItem[];

  // New Fields
  admissionCollected?: number;
  dressProfit?: number;
  grossIncome?: number;
  eventIncome?: number;
  eventExpenses?: number;
  eventSurplus?: number;
  eventDeposits?: number;
  reserveUsed?: number;
}

export interface FinanceBreakdownItem {
  key: string;
  label: string;
  amount: number;
  formula: string;
}

export interface FinanceCashFlowMonth {
  month: number;
  year: number;
  income: number;
  developmentFundContribution: number;
  expenses: number;
  net: number;
  balance: number;
  developmentFundBalance: number;
}

export interface FinanceLedgerRow {
  id: string;
  date: string;
  month: number;
  year: number;
  branch: string;
  label: string;
  category: string;
  type: "income" | "expense" | "credit" | "pending";
  amount: number;
  studentId: string;
  studentName: string;
  receiptId: string;
  status: string;
  formulaKey: string;
}

export interface FinanceWarning {
  level: "info" | "warning" | "danger";
  message: string;
}

export interface FinanceCommandCenterData {
  month: number;
  year: number;
  periodLabel: string;
  branch: string;
  summary: {
    activeStudents: number;
    paidStudents: number;
    pendingStudents: number;
    expected: number;
    collected: number;
    pending: number;
    creditsApplied: number;
    monthlyFeeCash: number;
    admissionCollected: number;
    dressProfit: number;
    extraIncome: number;
    eventIncome: number;
    grossIncome: number;
    developmentFundContribution: number;
    developmentExpenses: number;
    eventExpenses: number;
    customRemovals: number;
    eventSurplus: number;
    eventDeposits: number;
    developmentFundBalance: number;
    availableBalance: number;
    collectionRate: number;
  };
  incomeBreakdown: FinanceBreakdownItem[];
  expenseBreakdown: FinanceBreakdownItem[];
  cashFlowByMonth: FinanceCashFlowMonth[];
  ledgerRows: FinanceLedgerRow[];
  warnings: FinanceWarning[];
  formulas: Record<string, string>;
}

export async function getFinancialSummary(
  branch: string,
  month: number,
  forceRefresh = false,
  year = getCurrentFeeYear(),
): Promise<FinancialSummary> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      month,
      branch,
      activeStudents: 42,
      paidStudents: 35,
      pendingStudents: 7,
      expected: 21000,
      collected: 17500,
      pending: 3500,
      creditsApplied: 1000,
      actualReceived: 16500,
      devFundAllocation: 5250,
      devFundSpent: 1000,
      devFundBalance: 4250,
      totalContributions: 5250,
      availableBalance: 4250,
      creditDetails: [],
      yearlyBreakdown: [],
      admissionCollected: 5000,
      dressProfit: 2000,
      reserveUsed: 0,
    };
  }

  const cacheKey = `financial:${branch}:${year}:${month}`;

  if (forceRefresh) {
    invalidateCache(cacheKey);
  }

  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: FinancialSummary }>("get_financial_summary", {
      branch,
      month,
      year,
    });
    return data.data;
  });
}

export async function getFinanceCommandCenter(
  branch: string,
  month: number,
  forceRefresh = false,
  year = getCurrentFeeYear(),
): Promise<FinanceCommandCenterData> {
  const cacheKey = `financeCommand:${branch}:${year}:${month}`;

  if (forceRefresh) {
    invalidateCache(cacheKey);
  }

  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: FinanceCommandCenterData }>(
      "get_finance_command_center",
      {
        branch,
        month,
        year,
      },
    );
    return data.data;
  });
}

export async function addExtraIncome(
  branch: string,
  month: number,
  title: string,
  amount: number,
  description?: string,
  year = getCurrentFeeYear(),
) {
  const data = await apiAction<{ data: Record<string, unknown> }>("add_extra_income", {
    branch,
    month,
    year,
    title,
    amount,
    description,
    scope: branch,
  });
  invalidateCache(`financeCommand:${branch}:${year}:${month}`);
  invalidateCache(`financial:${branch}:${year}:${month}`);
  return data.data;
}

export async function deleteExtraIncome(
  branch: string,
  month: number,
  incomeId: string,
  year = getCurrentFeeYear(),
) {
  const data = await apiAction<{ data: Record<string, unknown> }>("delete_extra_income", {
    branch,
    month,
    year,
    incomeId,
  });
  invalidateCache(`financeCommand:${branch}:${year}:${month}`);
  invalidateCache(`financial:${branch}:${year}:${month}`);
  return data.data;
}

export async function addRemoval(
  branch: string,
  month: number,
  title: string,
  amount: number,
  description?: string,
  year = getCurrentFeeYear(),
) {
  const data = await apiAction<{ data: Record<string, unknown> }>("add_removal", {
    branch,
    month,
    year,
    title,
    amount,
    description,
    scope: branch,
  });
  invalidateCache(`financeCommand:${branch}:${year}:${month}`);
  invalidateCache(`financial:${branch}:${year}:${month}`);
  return data.data;
}

export async function deleteRemoval(
  branch: string,
  month: number,
  removalId: string,
  year = getCurrentFeeYear(),
) {
  const data = await apiAction<{ data: Record<string, unknown> }>("delete_removal", {
    branch,
    month,
    year,
    removalId,
  });
  invalidateCache(`financeCommand:${branch}:${year}:${month}`);
  invalidateCache(`financial:${branch}:${year}:${month}`);
  return data.data;
}

export interface EventBeltLevel {
  key: string;
  label: string;
  kyu: string;
}

export interface EventFeeConfig {
  eventId: string;
  eventName?: string;
  eventType?: string;
  eventDate?: string;
  feeCategory: "belt_exam" | "tournament" | "event" | "other";
  targetingMode: "branch_and_eligibility" | "participants_only" | "manual_selection";
  pricingMode: "fixed" | "branch" | "belt" | "branch_belt" | "student";
  defaultAmount: number;
  dueDate?: string;
  branchScope: string[];
  beltScope: string[];
  branchPrices: Record<string, number>;
  beltPrices: Record<string, number>;
  branchBeltPrices: Record<string, number>;
  studentOverrides: EventFeeOverride[];
  notes?: string;
  status?: string;
}

export interface EventFeeOverride {
  skfId: string;
  amount?: number;
  excluded?: boolean;
  included?: boolean;
  waived?: boolean;
  reason?: string;
}

export interface EventFeePreviewRow {
  skfId: string;
  studentName: string;
  branch: string;
  currentBelt: string;
  currentBeltKey: string;
  targetBelt: string;
  targetBeltKey: string;
  amount: number;
  finalAmount: number;
  status: "ready" | "needs_review" | "excluded" | "waived";
  reason: string;
  eligibilityCutoffDate?: string;
  joinedDate?: string;
  receiptEligible?: boolean;
  existingFeeRecordId: string | null;
  existingStatus: string | null;
  receiptId: string | null;
}

export interface EventParticipant {
  id: string;
  athleteId?: string;
  athleteName: string;
  skfId: string;
  branchName?: string;
  belt?: string;
  photoUrl?: string;
}

export interface EventResultRecord {
  id?: string;
  participantId?: string;
  athleteId?: string;
  athleteName?: string;
  skfId?: string;
  branchName?: string;
  belt?: string;
  photoUrl?: string;
  result?: string;
  medal?: string;
  position?: number | string;
  category?: string;
  ageGroup?: string;
  weightCategory?: string;
  difficultyLevel?: number | string;
  wins?: number | string;
  beltAwarded?: string;
  promotion?: string;
  promotionType?: "normal" | "double" | "triple";
  doublePromotion?: boolean;
  examiner?: string;
  grade?: string;
  score?: number | string;
  daysAttended?: number | string;
  specialAward?: string;
  award?: string;
  notes?: string;
}

export interface EventAthleteSearchResult {
  id: string;
  skfId: string;
  firstName: string;
  lastName: string;
  branchName?: string;
  currentBelt?: string;
  photoUrl?: string;
}

export interface EventCreateInput {
  name: string;
  shortName?: string;
  slug?: string;
  type: string;
  level?: string;
  status?: string;
  date: string;
  endDate?: string;
  venue?: string;
  city?: string;
  state?: string;
  description?: string;
  affiliatedBody?: string;
  totalParticipants?: number;
  skfParticipants?: number;
  hostingBranch?: string;
  isPublished?: boolean;
  showInJourney?: boolean;
}

export interface EventCollectionItem {
  event: {
    id: string;
    slug?: string;
    name: string;
    shortName?: string;
    type: string;
    level?: string;
    date: string;
    endDate?: string;
    status: string;
    hostingBranch: string;
    venue?: string;
    city?: string;
    state?: string;
    description?: string;
    isPublished: boolean;
    isResultsPublished?: boolean;
    resultsAppliedAt?: string;
    totalParticipants?: number;
    skfParticipants?: number;
    showInJourney?: boolean;
    participants: EventParticipant[];
    results?: EventResultRecord[];
  };
  config: EventFeeConfig | null;
  collection: {
    chargedCount: number;
    expected: number;
    collected: number;
    pending: number;
    waived: number;
    proofSubmitted: number;
    paidCount: number;
    pendingCount: number;
    waivedCount: number;
  };
  finance: {
    spent: number;
    surplus: number;
    savings: number;
    deposited: number;
    pendingDeposit: number;
  };
  expenses: Record<string, unknown>[];
  deposits: Record<string, unknown>[];
}

export interface EventCertificateRecord {
  enrollmentId: string;
  skfId: string;
  studentName: string;
  certificateNumber: string;
  verificationCode: string;
  certificateType: string;
  status: "draft" | "issued" | "revoked";
  programName: string;
  beltLevel: string | null;
  verifyUrl: string;
  qrDownloadUrl: string;
  result: string;
  preparedAt: string | null;
  publishedAt: string | null;
}

export interface EventCertificateSkippedRecord {
  skfId: string;
  studentName: string;
  reason: string;
}

export interface EventCertificateSummary {
  programId: string | null;
  programName: string;
  totalResults: number;
  eligibleCount: number;
  preparedCount: number;
  issuedCount: number;
  draftCount: number;
  skippedCount: number;
  revokedCount: number;
  certificates: EventCertificateRecord[];
  skipped: EventCertificateSkippedRecord[];
}

export interface EventCollectionsData {
  year: number;
  beltSequence: EventBeltLevel[];
  events: EventCollectionItem[];
  totals: {
    expected: number;
    collected: number;
    pending: number;
    spent: number;
    surplus: number;
    deposited: number;
    pendingDeposit: number;
  };
}

export async function createEvent(input: EventCreateInput): Promise<EventCollectionItem["event"]> {
  const data = await apiAction<{ data: { event: EventCollectionItem["event"] } }>("create_event", {
    event: input,
  });
  invalidateCache("eventCollections:");
  return data.data.event;
}

export async function updateEvent(
  eventId: string,
  input: Partial<EventCreateInput>,
): Promise<EventCollectionItem["event"]> {
  const data = await apiAction<{ data: { event: EventCollectionItem["event"] } }>("update_event", {
    eventId,
    event: { id: eventId, ...input },
  });
  invalidateCache("eventCollections:");
  return data.data.event;
}

export async function deleteEvent(eventId: string): Promise<{ eventId: string }> {
  const data = await apiAction<{ data: { eventId: string } }>("delete_event", {
    eventId,
  });
  invalidateCache("eventCollections:");
  return data.data;
}

export async function searchEventAthletes(query: string): Promise<EventAthleteSearchResult[]> {
  const data = await apiAction<{ data: { athletes: EventAthleteSearchResult[] } }>("search_event_athletes", {
    query,
  });
  return data.data.athletes;
}

export async function assignEventStudent(
  eventId: string,
  athlete: Pick<EventAthleteSearchResult, "id" | "skfId">,
): Promise<EventCollectionItem["event"]> {
  const data = await apiAction<{ data: { event: EventCollectionItem["event"] } }>("assign_event_student", {
    eventId,
    athleteId: athlete.id,
    skfId: athlete.skfId,
  });
  invalidateCache("eventCollections:");
  return data.data.event;
}

export interface BeltExamParticipantSyncSummary {
  added: number;
  eligible: number;
  alreadyAssigned: number;
  needsReview: number;
  excluded: number;
}

export async function syncBeltExamParticipants(eventId: string): Promise<{
  event: EventCollectionItem["event"];
  summary: BeltExamParticipantSyncSummary;
}> {
  const data = await apiAction<{
    data: {
      event: EventCollectionItem["event"];
      summary: BeltExamParticipantSyncSummary;
    };
  }>("sync_belt_exam_participants", { eventId });
  invalidateCache("eventCollections:");
  return data.data;
}

export async function removeEventStudent(input: {
  eventId: string;
  participantId?: string;
  skfId?: string;
}): Promise<EventCollectionItem["event"]> {
  const data = await apiAction<{ data: { event: EventCollectionItem["event"] } }>("remove_event_student", input);
  invalidateCache("eventCollections:");
  return data.data.event;
}

export async function saveEventResults(
  eventId: string,
  results: EventResultRecord[],
): Promise<EventCollectionItem["event"]> {
  const data = await apiAction<{ data: { event: EventCollectionItem["event"] } }>("save_event_results", {
    eventId,
    results,
  });
  invalidateCache("eventCollections:");
  invalidateCache("students:");
  return data.data.event;
}

export async function publishEventResults(
  eventId: string,
  results: EventResultRecord[],
): Promise<{ event: EventCollectionItem["event"]; syncSummary?: Record<string, unknown> }> {
  const data = await apiAction<{
    data: { event: EventCollectionItem["event"]; syncSummary?: Record<string, unknown> };
  }>("publish_event_results", {
    eventId,
    results,
  });
  invalidateCache("eventCollections:");
  invalidateCache("students:");
  invalidateCache("financeCommand:");
  return data.data;
}

export async function getEventCertificates(eventId: string): Promise<{
  event: EventCollectionItem["event"];
  certificateSummary: EventCertificateSummary;
}> {
  const data = await apiAction<{
    data: {
      event: EventCollectionItem["event"];
      certificateSummary: EventCertificateSummary;
    };
  }>("get_event_certificates", { eventId });
  return data.data;
}

export async function prepareEventCertificates(
  eventId: string,
  results: EventResultRecord[],
): Promise<{
  event: EventCollectionItem["event"];
  certificateSummary: EventCertificateSummary;
}> {
  const data = await apiAction<{
    data: {
      event: EventCollectionItem["event"];
      certificateSummary: EventCertificateSummary;
    };
  }>("prepare_event_certificates", {
    eventId,
    results,
  });
  invalidateCache("eventCollections:");
  return data.data;
}

export async function publishEventCertificates(
  eventId: string,
  results: EventResultRecord[],
): Promise<{
  event: EventCollectionItem["event"];
  certificateSummary: EventCertificateSummary;
}> {
  const data = await apiAction<{
    data: {
      event: EventCollectionItem["event"];
      certificateSummary: EventCertificateSummary;
    };
  }>("publish_event_certificates", {
    eventId,
    results,
  });
  invalidateCache("eventCollections:");
  invalidateCache("students:");
  return data.data;
}

export async function getEventCollections(
  branch = "Overall",
  year = getCurrentFeeYear(),
  forceRefresh = false,
): Promise<EventCollectionsData> {
  const cacheKey = `eventCollections:${branch}:${year}`;
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: EventCollectionsData }>("get_event_collections", {
      branch,
      year,
    });
    return data.data;
  });
}

export async function upsertEventFeeConfig(config: EventFeeConfig): Promise<EventFeeConfig> {
  const data = await apiAction<{ data: { config: EventFeeConfig } }>("upsert_event_fee_config", {
    config,
  });
  invalidateCache("eventCollections:");
  return data.data.config;
}

export async function previewEventFees(
  eventId: string,
  config?: Partial<EventFeeConfig>,
): Promise<{
  event: EventCollectionItem["event"];
  config: EventFeeConfig;
  rows: EventFeePreviewRow[];
  summary: { ready: number; waived: number; excluded: number; needsReview: number; totalAmount: number };
}> {
  const data = await apiAction<{
    data: {
      event: EventCollectionItem["event"];
      config: EventFeeConfig;
      rows: EventFeePreviewRow[];
      summary: { ready: number; waived: number; excluded: number; needsReview: number; totalAmount: number };
    };
  }>("preview_event_fees", { eventId, config });
  return data.data;
}

export async function generateEventFees(
  eventId: string,
  overrides: EventFeeOverride[] = [],
): Promise<{ createdOrUpdated: number; waived: number; skipped: number }> {
  const data = await apiAction<{ data: { createdOrUpdated: number; waived: number; skipped: number } }>("generate_event_fees", {
    eventId,
    overrides,
  });
  invalidateCache("eventCollections:");
  invalidateCache("students:");
  invalidateCache("financeCommand:");
  return data.data;
}

export async function addEventExpense(input: {
  eventId: string;
  title: string;
  amount: number;
  expenseDate?: string;
  branchScope: string;
  allocationMethod?: "single_branch" | "student_branch" | "custom" | "overall";
  category?: string;
  paymentMethod?: string;
  vendor?: string;
  notes?: string;
}) {
  const data = await apiAction<{ data: Record<string, unknown> }>("add_event_expense", input);
  invalidateCache("eventCollections:");
  invalidateCache("financeCommand:");
  return data.data;
}

export async function addEventDeposit(input: {
  eventId: string;
  amount: number;
  depositDate?: string;
  branchScope: string;
  method?: string;
  reference?: string;
  notes?: string;
}) {
  const data = await apiAction<{ data: Record<string, unknown> }>("add_event_deposit", input);
  invalidateCache("eventCollections:");
  invalidateCache("financeCommand:");
  return data.data;
}

export interface ExamMonth {
  year: number;
  month: string;
  created_at: string;
}

export async function getExamMonths(forceRefresh = false): Promise<ExamMonth[]> {
  const cacheKey = "examMonths";
  if (forceRefresh) invalidateCache(cacheKey);
  return cachedFetch(cacheKey, async () => {
    const data = await apiAction<{ data: ExamMonth[] }>("get_exam_months");
    return data.data || [];
  });
}

export async function setExamMonth(year: number, month: string): Promise<void> {
  await apiAction("set_exam_month", { year, month });
  invalidateCache("examMonths");
}

export type BlackBeltCandidateRecord = {
  id: string;
  skf_id: string;
  display_name: string;
  first_aid_status: string;
  marketing_status: string;
  enrollment_fee_status: string;
  tournament_kata_status: string;
  tournament_kumite_status: string;
  fitness_baseline_done: boolean;
  fitness_retest_done: boolean;
  wkf_kumite_status: string;
  wkf_kata_status: string;
  wkf_referee_status: string;
  weapon_status: string;
  bunkai_status: string;
  video_count: number;
  teaching_status: string;
  teaching_hours: number;
  mock_exam_done: boolean;
  self_defense_months: Record<string, boolean>;
  readiness: string;
  exam_score: number | null;
  exam_result: string | null;
  instructor_notes: string;
};

export async function getBBCandidates(): Promise<BlackBeltCandidateRecord[]> {
  const data = await apiAction<{ data: BlackBeltCandidateRecord[] }>("get_bb_candidates");
  return data.data || [];
}

export async function updateBBCandidate(candidateId: string, updates: Record<string, unknown>): Promise<BlackBeltCandidateRecord> {
  const data = await apiAction<{ data: BlackBeltCandidateRecord }>("update_bb_candidate", { candidateId, updates });
  return data.data;
}
