"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileImage,
  Percent,
  XCircle,
} from "lucide-react";
import GlobalSearch from "@/components/common/GlobalSearch";
import NavMenu from "@/components/common/NavMenu";
import NotificationBell from "@/components/common/NotificationBell";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs, { type SegmentOption } from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
import StatTile from "@/components/ui/StatTile";
import StatusPill, { type LedgerStatus } from "@/components/ui/StatusPill";
import { useFeeTrackAuth } from "@/lib/client-auth";
import {
  AdmissionApplication,
  AdmissionBranchSettings,
  AdmissionPromoCode,
  approveAdmissionApplication,
  getAdmissionApplications,
  getAdmissionDashboard,
  rejectAdmissionApplication,
  updateAdmissionBranchSettings,
  upsertAdmissionPromoCode,
} from "@/lib/api";

type Tab = "pending" | "photos" | "promos" | "settings";

const ADMISSION_TABS: SegmentOption<Tab>[] = [
  { value: "pending", label: "Approvals" },
  { value: "photos", label: "Photos" },
  { value: "promos", label: "Promo Codes" },
  { value: "settings", label: "Settings" },
];

const emptyPromo: AdmissionPromoCode = {
  code: "",
  name: "",
  branchSlug: "",
  status: "active",
  discountType: "percent",
  discountValue: 0,
  appliesTo: "monthly",
  validFrom: "",
  validUntil: "",
  maxUses: null,
  maxUsesPerPhone: null,
  notes: "",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function admissionAge(dob: string) {
  if (!dob) return "";
  const birth = new Date(dob);
  if (!Number.isFinite(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return `${age} yrs`;
}

function money(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function num(amount: number) {
  return Math.round(Number(amount) || 0).toLocaleString("en-IN");
}

function admissionStatus(application: AdmissionApplication): LedgerStatus {
  if (application.duplicateWarnings.length > 0) return "overdue";
  if (application.feeTrackingEnabled && application.paymentProofUrl) return "verifying";
  return "due";
}

export default function AdmissionsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [profilePhotoApplications, setProfilePhotoApplications] = useState<AdmissionApplication[]>([]);
  const [promoCodes, setPromoCodes] = useState<AdmissionPromoCode[]>([]);
  const [branchSettings, setBranchSettings] = useState<AdmissionBranchSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actioning, setActioning] = useState("");
  const [promoDraft, setPromoDraft] = useState<AdmissionPromoCode>(emptyPromo);

  const branchOptions = useMemo(
    () => branchSettings.map((setting) => ({ slug: setting.branchSlug, name: setting.branchName })),
    [branchSettings],
  );
  const summary = useMemo(
    () => ({
      pending: applications.length,
      photos: profilePhotoApplications.length,
      promos: promoCodes.filter((promo) => promo.status === "active").length,
      forms: branchSettings.filter((setting) => setting.isEnabled).length,
    }),
    [applications.length, branchSettings, profilePhotoApplications.length, promoCodes],
  );

  const load = useCallback(async () => {
    if (checking || !user) return;
    setLoading(true);
    setError("");
    try {
      const [data, approvedApplications] = await Promise.all([
        getAdmissionDashboard("pending"),
        getAdmissionApplications("approved", 200),
      ]);
      setApplications(data.applications);
      setProfilePhotoApplications(
        approvedApplications.filter((application) => application.finalPhotoUrl && application.status === "approved"),
      );
      setPromoCodes(data.promoCodes);
      setBranchSettings(data.branchSettings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admissions.");
    } finally {
      setLoading(false);
    }
  }, [checking, user]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      void load();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [load]);

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleReject = async (application: AdmissionApplication) => {
    const reason = window.prompt(`Reject admission for ${application.studentName}? Enter reason:`);
    if (!reason?.trim()) return;
    setActioning(application.id);
    try {
      await rejectAdmissionApplication(application.id, reason.trim());
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setProfilePhotoApplications((current) => current.filter((item) => item.id !== application.id));
      showNotice("Admission rejected.");
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Unable to reject admission.");
    } finally {
      setActioning("");
    }
  };

  const handleApprove = async (event: FormEvent<HTMLFormElement>, application: AdmissionApplication) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const photoAction = String(formData.get("photoAction") || "use_submitted") as "use_submitted" | "upload_new";
    const finalPhotoValue = formData.get("finalPhoto");
    const finalPhoto = finalPhotoValue instanceof File && finalPhotoValue.size > 0 ? finalPhotoValue : null;
    if (photoAction === "use_submitted" && !application.admissionPhotoUrl) {
      setError("Submitted student photo is missing. Upload a corrected profile photo before approval.");
      return;
    }
    if (photoAction === "upload_new" && !finalPhoto) {
      setError("Upload the corrected profile photo before approval.");
      return;
    }
    if (application.feeTrackingEnabled && formData.get("paymentVerified") !== "on") {
      setError("Verify the admission payment before approval.");
      return;
    }
    setActioning(application.id);
    setError("");

    try {
      const result = await approveAdmissionApplication({
        applicationId: application.id,
        monthlyFee: application.feeTrackingEnabled ? Number(formData.get("monthlyFee") || 0) : 0,
        admissionFee: application.feeTrackingEnabled ? Number(formData.get("admissionFee") || 0) : 0,
        dressFee: application.feeTrackingEnabled ? Number(formData.get("dressFee") || 0) : 0,
        dressCost: application.feeTrackingEnabled ? Number(formData.get("dressCost") || 0) : 0,
        billingStartDate: String(formData.get("billingStartDate") || today()),
        batch: application.feeTrackingEnabled ? String(formData.get("batch") || application.preferredBatch || "") : "",
        belt: String(formData.get("belt") || "white"),
        isPublic: formData.get("isPublic") === "on",
        paymentVerified: application.feeTrackingEnabled && formData.get("paymentVerified") === "on",
        photoAction,
        reviewNote: String(formData.get("reviewNote") || ""),
        finalPhoto,
      });
      setApplications((current) => current.filter((item) => item.id !== application.id));
      void load();
      showNotice(`Approved. SKF ID ${result.skfId} created.`);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Unable to approve admission.");
    } finally {
      setActioning("");
    }
  };

  const handleSavePromo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActioning("promo");
    setError("");
    try {
      const saved = await upsertAdmissionPromoCode({
        ...promoDraft,
        branchSlug: promoDraft.branchSlug || null,
        discountValue: Number(promoDraft.discountValue || 0),
        maxUses: promoDraft.maxUses ? Number(promoDraft.maxUses) : null,
        maxUsesPerPhone: promoDraft.maxUsesPerPhone ? Number(promoDraft.maxUsesPerPhone) : null,
      });
      setPromoCodes((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setPromoDraft(emptyPromo);
      showNotice("Promo code saved.");
    } catch (promoError) {
      setError(promoError instanceof Error ? promoError.message : "Unable to save promo code.");
    } finally {
      setActioning("");
    }
  };

  const handleSaveSettings = async (settings: AdmissionBranchSettings) => {
    setActioning(settings.branchSlug);
    setError("");
    try {
      const saved = await updateAdmissionBranchSettings(settings);
      setBranchSettings((current) =>
        current.map((item) => (item.branchSlug === saved.branchSlug ? saved : item)),
      );
      showNotice("Branch admission settings saved.");
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Unable to save branch settings.");
    } finally {
      setActioning("");
    }
  };

  if (checking || !user) return null;

  return (
    <PageShell
      hud={{
        title: "People",
        monthLabel: "Admissions",
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <NavMenu />,
      }}
    >
      <p className="mb-5 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
        Review branch admission forms, approve students into the SKF portal, and manage branch promo codes.
      </p>

      {!loading && !error ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Pending" value={String(summary.pending)} tone="action" />
          <StatTile label="Photos" value={String(summary.photos)} />
          <StatTile label="Promos" value={String(summary.promos)} tone="settled" />
          <StatTile label="Forms" value={String(summary.forms)} />
        </div>
      ) : null}

      <SegmentedTabs
        options={ADMISSION_TABS}
        value={tab}
        onChange={setTab}
        ariaLabel="Admissions sections"
        className="mb-5"
      />

        {notice ? (
          <div className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="text-center py-16 animate-fade-in">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <button type="button" onClick={() => load()} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Loading admissions...</p>
          </div>
        ) : tab === "pending" ? (
          <ApprovalsTab
            applications={applications}
            actioning={actioning}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : tab === "photos" ? (
          <ProfilePhotosTab applications={profilePhotoApplications} />
        ) : tab === "promos" ? (
          <PromosTab
            branchOptions={branchOptions}
            promoCodes={promoCodes}
            promoDraft={promoDraft}
            setPromoDraft={setPromoDraft}
            actioning={actioning}
            onSavePromo={handleSavePromo}
            onEdit={setPromoDraft}
          />
        ) : (
          <SettingsTab
            branchSettings={branchSettings}
            actioning={actioning}
            onSave={handleSaveSettings}
          />
        )}
    </PageShell>
  );
}

function profilePhotoDownloadHref(applicationId: string) {
  return `/api/feetrack/admissions/${encodeURIComponent(applicationId)}/profile-photo`;
}

function ApprovalsTab({
  applications,
  actioning,
  onApprove,
  onReject,
}: {
  applications: AdmissionApplication[];
  actioning: string;
  onApprove: (event: FormEvent<HTMLFormElement>, application: AdmissionApplication) => void;
  onReject: (application: AdmissionApplication) => void;
}) {
  const [active, setActive] = useState<AdmissionApplication | null>(null);

  if (applications.length === 0) {
    return (
      <div className="hud-panel p-10 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
        <h2 className="text-xl text-white">No pending admissions</h2>
        <p className="mt-2 text-sm text-zinc-500">New branch submissions will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hud-panel overflow-hidden">
        <div className="divide-y divide-[color:var(--color-hairline)]">
          {applications.map((application, index) => {
            const status = admissionStatus(application);
            return (
              <LedgerRow
                key={application.id}
                index={index}
                status={status}
                title={application.studentName}
                subtitle={`${application.branchName} · ${application.guardianName} · ${application.studentDob || "DOB not set"}`}
                idLabel={`APP · ${application.id}`}
                amount={application.feeTrackingEnabled ? num(application.quotedJoiningTotal) : undefined}
                amountLabel="joining quote"
                trailing={
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                    <StatusPill
                      status={status}
                      label={status === "overdue" ? "Check" : status === "verifying" ? "Proof" : "Review"}
                    />
                  </div>
                }
                onClick={() => setActive(application)}
              />
            );
          })}
        </div>
      </div>

      <Sheet
        open={Boolean(active)}
        title="Review admission"
        onClose={() => setActive(null)}
      >
        {active ? (
          <div className="space-y-5 pt-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="numeric text-[26px] leading-none text-white">
                  {active.feeTrackingEnabled ? num(active.quotedJoiningTotal) : "Branch"}
                </p>
                <p className="mt-2 font-mono text-[11px] text-zinc-500">
                  {active.branchName} · {active.studentDob}
                  {admissionAge(active.studentDob) ? ` · ${admissionAge(active.studentDob)}` : ""} · {active.studentGender}
                </p>
              </div>
              <StatusPill
                status={admissionStatus(active)}
                label={admissionStatus(active) === "overdue" ? "Check warning" : "Review"}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="eyebrow rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 text-zinc-200">
                {active.branchName}
              </span>
              {!active.feeTrackingEnabled ? (
                <span className="eyebrow rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 text-zinc-400">
                  Branch-managed fees
                </span>
              ) : null}
              {active.promoCode ? (
                <span className="eyebrow rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 text-zinc-200">
                  {active.promoCode}
                </span>
              ) : null}
            </div>

            {active.duplicateWarnings.length > 0 ? (
              <div className="rounded-[var(--radius-row)] border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">
                {active.duplicateWarnings.join(" · ")}
              </div>
            ) : null}

            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="School" value={active.schoolClass} />
              <Info label="Guardian" value={`${active.guardianName} (${active.guardianRelationship})`} />
              <Info label="Phone" value={active.guardianPhone} />
              <Info label="WhatsApp" value={active.guardianWhatsapp} />
              <Info label="Email" value={active.guardianEmail || "Not provided"} />
              <Info label="Emergency" value={`${active.emergencyName} (${active.emergencyRelationship}) ${active.emergencyPhone}`} />
              {active.feeTrackingEnabled ? <Info label="Batch" value={active.preferredBatch || "To confirm"} /> : null}
              <Info label="Joining" value={active.expectedJoinDate || "To confirm"} />
              {active.feeTrackingEnabled ? <Info label="Joining Quote" value={money(active.quotedJoiningTotal)} /> : null}
              <Info label="Medical" value={active.hasMedicalCondition ? active.medicalDetails || "Yes" : "No"} />
              <Info label="Previous Training" value={active.hasPreviousTraining ? active.currentBelt || active.martialArtsStyle || "Yes" : "No"} />
              <Info label="Referral" value={active.referrerName || active.referralSource || "Not provided"} />
            </dl>

            <div className="flex flex-wrap gap-2">
              {active.admissionPhotoUrl ? (
                <a
                  href={active.admissionPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 py-2 text-xs text-zinc-200"
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Student photo
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-row)] border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Student photo missing
                </span>
              )}
              {active.feeTrackingEnabled && active.paymentProofUrl ? (
                <a
                  href={active.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-3 py-2 text-xs text-zinc-200"
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Payment screenshot
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : active.feeTrackingEnabled ? (
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-row)] border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Payment screenshot missing
                </span>
              ) : null}
            </div>

            <form
              onSubmit={(event) => {
                onApprove(event, active);
                setActive(null);
              }}
              className="hud-panel space-y-3 p-4"
            >
              <div className="rounded-[var(--radius-row)] border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                {active.feeTrackingEnabled
                  ? "Human review pending: verify the payment screenshot, check the student photo, then either use the submitted photo or upload a corrected portal photo."
                  : "Human review pending: check the student information and photo. Fees are collected directly by the Kunigal branch and are not recorded here."}
              </div>
              {active.feeTrackingEnabled ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monthly">
                    <input name="monthlyFee" type="number" min="0" defaultValue={active.quotedMonthlyFee} />
                  </Field>
                  <Field label="Admission">
                    <input name="admissionFee" type="number" min="0" defaultValue={active.quotedAdmissionFee} />
                  </Field>
                  {active.quotedDressFee > 0 ? (
                    <>
                      <Field label="Dress Fee">
                        <input name="dressFee" type="number" min="0" defaultValue={active.quotedDressFee} />
                      </Field>
                      <Field label="Dress Cost">
                        <input name="dressCost" type="number" min="0" defaultValue="0" />
                      </Field>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="dressFee" value="0" />
                      <input type="hidden" name="dressCost" value="0" />
                    </>
                  )}
                </div>
              ) : null}
              <Field label={active.feeTrackingEnabled ? "Billing Start" : "Enrollment Date"}>
                <input name="billingStartDate" type="date" defaultValue={active.expectedJoinDate || today()} required />
              </Field>
              <div className={`grid ${active.feeTrackingEnabled ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                {active.feeTrackingEnabled ? (
                  <Field label="Batch">
                    <input name="batch" defaultValue={active.preferredBatch} />
                  </Field>
                ) : null}
                <Field label="Belt">
                  <select name="belt" defaultValue="white">
                    {["white", "yellow", "orange", "green", "blue", "brown", "black"].map((belt) => (
                      <option key={belt} value={belt}>{belt}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Portal photo">
                <div className="space-y-2 text-xs text-zinc-400">
                  <label className={`flex items-start gap-2 rounded-[var(--radius-row)] border px-3 py-2 ${active.admissionPhotoUrl ? "border-[color:var(--color-hairline)] bg-black/40 text-zinc-300" : "border-[color:var(--color-hairline)] bg-[#0a0a0a] text-zinc-600"}`}>
                    <input
                      name="photoAction"
                      type="radio"
                      value="use_submitted"
                      defaultChecked={Boolean(active.admissionPhotoUrl)}
                      disabled={!active.admissionPhotoUrl}
                      className="mt-0.5 accent-amber-500"
                    />
                    <span>Use submitted student photo</span>
                  </label>
                  <label className="flex items-start gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-black/40 px-3 py-2 text-zinc-300">
                    <input
                      name="photoAction"
                      type="radio"
                      value="upload_new"
                      defaultChecked={!active.admissionPhotoUrl}
                      className="mt-0.5 accent-amber-500"
                    />
                    <span>Upload corrected photo</span>
                  </label>
                  <input name="finalPhoto" type="file" accept="image/png,image/jpeg,image/webp" />
                </div>
              </Field>
              <Field label="Review note">
                <textarea name="reviewNote" rows={2} />
              </Field>
              {active.feeTrackingEnabled ? (
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input name="paymentVerified" type="checkbox" required className="accent-amber-500" />
                  Payment screenshot checked and amount verified
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input name="isPublic" type="checkbox" defaultChecked className="accent-amber-500" />
                Public profile enabled
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                <button
                  type="button"
                  onClick={() => {
                    onReject(active);
                    setActive(null);
                  }}
                  disabled={actioning === active.id}
                  className="tap-target inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] border border-red-500/25 bg-red-500/10 text-xs font-semibold text-red-200 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  type="submit"
                  disabled={actioning === active.id}
                  className="tap-target inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-black disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function ProfilePhotosTab({ applications }: { applications: AdmissionApplication[] }) {
  if (applications.length === 0) {
    return (
      <div className="card-panel p-10 text-center animate-fade-in">
        <FileImage className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
        <h2 className="text-xl text-white font-medium">No approved profile photos</h2>
        <p className="text-sm text-zinc-500 mt-2">Approved admission profile photos will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 animate-slide-up">
      {applications.map((application) => (
        <article key={application.id} className="card-panel p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-300 border border-zinc-700 bg-zinc-900 rounded-md px-2 py-1">
                  {application.approvedSkfId || "Approved"}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-md px-2 py-1">
                  {application.branchName}
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-space)] text-xl text-white font-medium tracking-tight truncate">
                {application.studentName}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Approved {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString("en-IN") : ""}
              </p>
            </div>
            <a
              href={profilePhotoDownloadHref(application.id)}
              download
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download photo
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function PromosTab({
  branchOptions,
  promoCodes,
  promoDraft,
  setPromoDraft,
  actioning,
  onSavePromo,
  onEdit,
}: {
  branchOptions: Array<{ slug: string; name: string }>;
  promoCodes: AdmissionPromoCode[];
  promoDraft: AdmissionPromoCode;
  setPromoDraft: (draft: AdmissionPromoCode) => void;
  actioning: string;
  onSavePromo: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (promo: AdmissionPromoCode) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 animate-slide-up">
      <form onSubmit={onSavePromo} className="card-panel p-5">
        <div className="flex items-center gap-3 mb-5">
          <Percent className="w-5 h-5 text-amber-500" />
          <h2 className="text-white font-semibold">Promo Code</h2>
        </div>
        <Field label="Code">
          <input value={promoDraft.code} onChange={(e) => setPromoDraft({ ...promoDraft, code: e.target.value.toUpperCase() })} required />
        </Field>
        <Field label="Name">
          <input value={promoDraft.name || ""} onChange={(e) => setPromoDraft({ ...promoDraft, name: e.target.value })} />
        </Field>
        <Field label="Branch">
          <select value={promoDraft.branchSlug || ""} onChange={(e) => setPromoDraft({ ...promoDraft, branchSlug: e.target.value || null })}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.slug} value={branch.slug}>{branch.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={promoDraft.discountType} onChange={(e) => setPromoDraft({ ...promoDraft, discountType: e.target.value as AdmissionPromoCode["discountType"] })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed Off</option>
              <option value="fee_override">Fee Override</option>
              <option value="admission_waiver">Admission Waiver</option>
            </select>
          </Field>
          <Field label="Value">
            <input type="number" min="0" value={promoDraft.discountValue} onChange={(e) => setPromoDraft({ ...promoDraft, discountValue: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Applies To">
          <select value={promoDraft.appliesTo} onChange={(e) => setPromoDraft({ ...promoDraft, appliesTo: e.target.value as AdmissionPromoCode["appliesTo"] })}>
            <option value="monthly">Monthly Fee</option>
            <option value="admission">Admission Fee</option>
            <option value="dress">Dress Fee</option>
            <option value="joining_total">Joining Total Estimate</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valid From">
            <input type="date" value={promoDraft.validFrom || ""} onChange={(e) => setPromoDraft({ ...promoDraft, validFrom: e.target.value })} />
          </Field>
          <Field label="Valid Until">
            <input type="date" value={promoDraft.validUntil || ""} onChange={(e) => setPromoDraft({ ...promoDraft, validUntil: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max Uses">
            <input type="number" min="1" value={promoDraft.maxUses || ""} onChange={(e) => setPromoDraft({ ...promoDraft, maxUses: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Per Phone">
            <input type="number" min="1" value={promoDraft.maxUsesPerPhone || ""} onChange={(e) => setPromoDraft({ ...promoDraft, maxUsesPerPhone: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </div>
        <Field label="Status">
          <select value={promoDraft.status} onChange={(e) => setPromoDraft({ ...promoDraft, status: e.target.value as "active" | "inactive" })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <button disabled={actioning === "promo"} className="btn-primary w-full mt-2 text-xs disabled:opacity-50">
          Save Promo Code
        </button>
      </form>

      <div className="grid gap-3 content-start">
        {promoCodes.map((promo) => (
          <button key={promo.id || promo.code} type="button" onClick={() => onEdit(promo)} className="card-panel p-4 text-left hover:border-zinc-700 transition">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold">{promo.code}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {promo.branchSlug || "All branches"} • {promo.discountType} • {promo.appliesTo}
                </p>
              </div>
              <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border ${
                promo.status === "active"
                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                  : "text-zinc-500 border-zinc-700 bg-zinc-900"
              }`}>
                {promo.status}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({
  branchSettings,
  actioning,
  onSave,
}: {
  branchSettings: AdmissionBranchSettings[];
  actioning: string;
  onSave: (settings: AdmissionBranchSettings) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, AdmissionBranchSettings>>(
    Object.fromEntries(branchSettings.map((setting) => [setting.branchSlug, setting])),
  );

  return (
    <div className="grid grid-cols-1 gap-4 animate-slide-up">
      {branchSettings.map((settings) => {
        const draft = drafts[settings.branchSlug] || settings;
        return (
          <form
            key={settings.branchSlug}
            onSubmit={(event) => {
              event.preventDefault();
              onSave(draft);
            }}
            className="card-panel p-5"
          >
            <h2 className="font-[family-name:var(--font-space)] text-xl text-white font-medium tracking-tight mb-4">
              {settings.branchName}
            </h2>
            {draft.feeTrackingEnabled ? <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly">
                  <input type="number" min="0" value={draft.defaultMonthlyFee} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, defaultMonthlyFee: Number(e.target.value) } })} />
                </Field>
                <Field label="Admission">
                  <input type="number" min="0" value={draft.defaultAdmissionFee} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, defaultAdmissionFee: Number(e.target.value) } })} />
                </Field>
              </div>
              <p className="mb-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-xs leading-relaxed text-zinc-400">
                Dress is not billed as a separate admission due. Herohalli includes it inside admission; MP dress is ordered through Shop.
              </p>
            </> : <p className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100">
              Kunigal collects fees directly. This form only captures student and guardian information; no payment, batch, or FeeTrack billing fields are used.
            </p>}
            <Field label="Admission note">
              <textarea
                rows={2}
                value={draft.notes || ""}
                onChange={(e) => setDrafts({
                  ...drafts,
                  [draft.branchSlug]: {
                    ...draft,
                    notes: e.target.value,
                  },
                })}
              />
            </Field>
            {draft.feeTrackingEnabled ? <Field label="Batch options">
              <textarea
                rows={3}
                value={draft.batchOptions.join("\n")}
                onChange={(e) => setDrafts({
                  ...drafts,
                  [draft.branchSlug]: {
                    ...draft,
                    batchOptions: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                  },
                })}
              />
            </Field> : null}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={draft.isEnabled} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, isEnabled: e.target.checked } })} className="accent-amber-500" />
                Form enabled
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={draft.showPublicCta} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, showPublicCta: e.target.checked } })} className="accent-amber-500" />
                Show on branch page
              </label>
            </div>
            <button disabled={actioning === settings.branchSlug} className="btn-primary w-full text-xs disabled:opacity-50">
              Save Settings
            </button>
          </form>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-zinc-800 pl-3 py-1">
      <dt className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</dt>
      <dd className="text-zinc-300 mt-1 break-words">{value || "Not provided"}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">{label}</span>
      <div className="[&_input]:w-full [&_select]:w-full [&_textarea]:w-full [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg [&_input]:border [&_select]:border [&_textarea]:border [&_input]:border-zinc-800 [&_select]:border-zinc-800 [&_textarea]:border-zinc-800 [&_input]:bg-black/60 [&_select]:bg-black/60 [&_textarea]:bg-black/60 [&_input]:px-3 [&_select]:px-3 [&_textarea]:px-3 [&_input]:py-2.5 [&_select]:py-2.5 [&_textarea]:py-2.5 [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_input]:text-white [&_select]:text-white [&_textarea]:text-white [&_input]:outline-none [&_select]:outline-none [&_textarea]:outline-none focus-within:[&_input]:border-zinc-600 focus-within:[&_select]:border-zinc-600 focus-within:[&_textarea]:border-zinc-600">
        {children}
      </div>
    </label>
  );
}
