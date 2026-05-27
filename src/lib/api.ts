// SKF Karate FeeTrack API - same-origin proxy to the SKF-Karate backend.

import { getCurrentFeeYear } from "@/lib/fee-year";

const API_URL = "/api/feetrack/data";

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

const DEFAULT_TIMEOUT = 8000; // 8 seconds - snappier error feedback
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
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

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
  const response = await fetchWithRetry(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

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
  photoAction: "upload_new";
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
  collected: number; // Gross income: fee cash + admission collected + dress profit
  devFund: number; // 30% allocation from gross income
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
): Promise<DevelopmentFundData> {
  if (isMockData()) {
    await new Promise((r) => setTimeout(r, 300));
    return { ...MOCK_DEV_FUND_DATA, branch: "All" };
  }

  const cacheKey = `devFund:all:${year}`;

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
  existingFeeRecordId: string | null;
  existingStatus: string | null;
  receiptId: string | null;
}

export interface EventCollectionItem {
  event: {
    id: string;
    name: string;
    type: string;
    date: string;
    status: string;
    hostingBranch: string;
    isPublished: boolean;
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
