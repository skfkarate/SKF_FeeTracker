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
import AccountMenu from "@/components/common/AccountMenu";
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
  if (application.feeTrackingEnabled && application.paymentProofUrl) return "verifying";
  return "neutral";
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
        account: <AccountMenu />,
      }}
    >
      <p className="mb-[20px] max-w-2xl text-[13px] leading-relaxed text-[color:var(--color-text-dim)]">
        Review branch admission forms, approve students into the SKF portal, and manage branch promo codes.
      </p>

      {!loading && !error ? (
        <div className="mb-[20px] grid grid-cols-2 gap-[12px] sm:grid-cols-4">
          <StatTile label="Pending" value={String(summary.pending)} tone="action" />
          <StatTile label="Photos" value={String(summary.photos)} />
          <StatTile label="Promos" value={String(summary.promos)} tone="neutral" />
          <StatTile label="Forms" value={String(summary.forms)} />
        </div>
      ) : null}

      <SegmentedTabs
        options={ADMISSION_TABS}
        value={tab}
        onChange={setTab}
        ariaLabel="Admissions sections"
        className="mb-[20px]"
      />

        {notice ? (
          <div className="mb-[20px] rounded-xl border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] px-[16px] py-[12px] text-sm text-[color:var(--color-text)] animate-fade-in">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="text-center py-[64px] animate-fade-in">
            <AlertCircle className="w-[32px] h-[32px] text-[color:var(--color-text-dim)] mx-auto mb-[12px]" />
            <p className="text-[color:var(--color-text-dim)] mb-[16px] text-sm">{error}</p>
            <button type="button" onClick={() => load()} className="btn-primary text-sm">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-[64px]">
            <div className="spinner mx-auto mb-[16px]" />
            <p className="text-[color:var(--color-text-dim)] text-sm">Loading admissions...</p>
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
      <div className="hud-panel p-[40px] text-center">
        <CheckCircle2 className="mx-auto mb-[16px] h-[44px] w-[44px] text-[color:var(--color-text-dim)]" />
        <h2 className="text-xl text-[color:var(--color-text)]">No pending admissions</h2>
        <p className="mt-[8px] text-sm text-[color:var(--color-text-dim)]">New branch submissions will appear here.</p>
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
                  <div className="flex items-center gap-[8px]">
                    <FileImage className="h-[16px] w-[16px] text-[color:var(--color-text-dim)]" aria-hidden="true" />
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
          <div className="space-y-[20px] pt-[4px]">
            <div className="flex items-start justify-between gap-[16px]">
              <div>
                <p className="numeric text-[26px] leading-none text-[color:var(--color-text)]">
                  {active.feeTrackingEnabled ? num(active.quotedJoiningTotal) : "Branch"}
                </p>
                <p className="mt-[8px] font-mono text-[11px] text-[color:var(--color-text-dim)]">
                  {active.branchName} · {active.studentDob}
                  {admissionAge(active.studentDob) ? ` · ${admissionAge(active.studentDob)}` : ""} · {active.studentGender}
                </p>
              </div>
              <StatusPill
                status={admissionStatus(active)}
                label={admissionStatus(active) === "overdue" ? "Check warning" : "Review"}
              />
            </div>

            <div className="flex flex-wrap gap-[8px]">
              <span className="eyebrow rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-[color:var(--color-text)]">
                {active.branchName}
              </span>
              {!active.feeTrackingEnabled ? (
                <span className="eyebrow rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-[color:var(--color-text-dim)]">
                  Branch-managed fees
                </span>
              ) : null}
              {active.promoCode ? (
                <span className="eyebrow rounded-[var(--radius-pill)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] text-[color:var(--color-text)]">
                  {active.promoCode}
                </span>
              ) : null}
            </div>

            {active.duplicateWarnings.length > 0 ? (
              <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[12px] text-xs text-[color:var(--color-text)]">
                {active.duplicateWarnings.join(" · ")}
              </div>
            ) : null}

            <dl className="grid grid-cols-1 gap-x-[16px] gap-y-[12px] text-sm sm:grid-cols-2">
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

            <div className="flex flex-wrap gap-[8px]">
              {active.admissionPhotoUrl ? (
                <a
                  href={active.admissionPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-xs text-[color:var(--color-text)]"
                >
                  <FileImage className="h-[14px] w-[14px]" />
                  Student photo
                  <ExternalLink className="h-[12px] w-[12px]" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-xs text-[color:var(--color-text)]">
                  <AlertCircle className="h-[14px] w-[14px]" />
                  Student photo missing
                </span>
              )}
              {active.feeTrackingEnabled && active.paymentProofUrl ? (
                <a
                  href={active.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-xs text-[color:var(--color-text)]"
                >
                  <FileImage className="h-[14px] w-[14px]" />
                  Payment screenshot
                  <ExternalLink className="h-[12px] w-[12px]" />
                </a>
              ) : active.feeTrackingEnabled ? (
                <span className="inline-flex items-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-xs text-[color:var(--color-text)]">
                  <AlertCircle className="h-[14px] w-[14px]" />
                  Payment screenshot missing
                </span>
              ) : null}
            </div>

            <form
              onSubmit={(event) => {
                onApprove(event, active);
                setActive(null);
              }}
              className="hud-panel space-y-[12px] p-[16px]"
            >
              <div className="rounded-[var(--radius-row)] border border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-[11px] leading-relaxed text-[color:var(--color-text)]">
                {active.feeTrackingEnabled
                  ? "Human review pending: verify the payment screenshot, check the student photo, then either use the submitted photo or upload a corrected portal photo."
                  : "Human review pending: check the student information and photo. Fees are collected directly by the Kunigal branch and are not recorded here."}
              </div>
              {active.feeTrackingEnabled ? (
                <div className="grid grid-cols-2 gap-[12px]">
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
              <div className={`grid ${active.feeTrackingEnabled ? "grid-cols-2" : "grid-cols-1"} gap-[12px]`}>
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
                <div className="space-y-[8px] text-xs text-[color:var(--color-text-dim)]">
                  <label className={`flex items-start gap-[8px] rounded-[var(--radius-row)] border px-[12px] py-[8px] ${active.admissionPhotoUrl ? "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)]" : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-faint)]"}`}>
                    <input
                      name="photoAction"
                      type="radio"
                      value="use_submitted"
                      defaultChecked={Boolean(active.admissionPhotoUrl)}
                      disabled={!active.admissionPhotoUrl}
                      className="mt-[2px] accent-[color:var(--color-accent)]"
                    />
                    <span>Use submitted student photo</span>
                  </label>
                  <label className="flex items-start gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-[color:var(--color-text)]">
                    <input
                      name="photoAction"
                      type="radio"
                      value="upload_new"
                      defaultChecked={!active.admissionPhotoUrl}
                      className="mt-[2px] accent-[color:var(--color-accent)]"
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
                <label className="flex items-center gap-[8px] text-xs text-[color:var(--color-text-dim)]">
                  <input name="paymentVerified" type="checkbox" required className="accent-[color:var(--color-accent)]" />
                  Payment screenshot checked and amount verified
                </label>
              ) : null}
              <label className="flex items-center gap-[8px] text-xs text-[color:var(--color-text-dim)]">
                <input name="isPublic" type="checkbox" defaultChecked className="accent-[color:var(--color-accent)]" />
                Public profile enabled
              </label>
              <div className="grid gap-[8px] sm:grid-cols-[1fr_1.4fr]">
                <button
                  type="button"
                  onClick={() => {
                    onReject(active);
                    setActive(null);
                  }}
                  disabled={actioning === active.id}
                  className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] text-xs font-semibold text-[color:var(--color-text)] disabled:opacity-50"
                >
                  <XCircle className="h-[14px] w-[14px]" />
                  Reject
                </button>
                <button
                  type="submit"
                  disabled={actioning === active.id}
                  className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-[14px] w-[14px]" />
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
      <div className="card-panel p-[40px] text-center animate-fade-in">
        <FileImage className="w-[40px] h-[40px] text-[color:var(--color-text-dim)] mx-auto mb-[16px]" />
        <h2 className="text-xl text-[color:var(--color-text)] font-medium">No approved profile photos</h2>
        <p className="text-sm text-[color:var(--color-text-dim)] mt-[8px]">Approved admission profile photos will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-[12px] animate-slide-up">
      {applications.map((application) => (
        <article key={application.id} className="card-panel p-[16px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
            <div className="min-w-[0px]">
              <div className="flex flex-wrap items-center gap-[8px] mb-[8px]">
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-text)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] rounded-md px-[8px] py-[4px]">
                  {application.approvedSkfId || "Approved"}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-text-dim)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] rounded-md px-[8px] py-[4px]">
                  {application.branchName}
                </span>
              </div>
              <h2 className="font-sans text-xl text-[color:var(--color-text)] font-medium tracking-tight truncate">
                {application.studentName}
              </h2>
              <p className="text-xs text-[color:var(--color-text-dim)] mt-[4px]">
                Approved {application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString("en-IN") : ""}
              </p>
            </div>
            <a
              href={profilePhotoDownloadHref(application.id)}
              download
              className="inline-flex items-center justify-center gap-[8px] rounded-lg bg-[color:var(--color-accent)] px-[16px] py-[10px] text-xs font-semibold text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-panel-strong)] transition"
            >
              <Download className="w-[14px] h-[14px]" />
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
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-[16px] animate-slide-up">
      <form onSubmit={onSavePromo} className="card-panel p-[20px]">
        <div className="flex items-center gap-[12px] mb-[20px]">
          <Percent className="w-[20px] h-[20px] text-[color:var(--color-text-dim)]" />
          <h2 className="text-[color:var(--color-text)] font-semibold">Promo Code</h2>
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
        <div className="grid grid-cols-2 gap-[12px]">
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
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Valid From">
            <input type="date" value={promoDraft.validFrom || ""} onChange={(e) => setPromoDraft({ ...promoDraft, validFrom: e.target.value })} />
          </Field>
          <Field label="Valid Until">
            <input type="date" value={promoDraft.validUntil || ""} onChange={(e) => setPromoDraft({ ...promoDraft, validUntil: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-[12px]">
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
        <button disabled={actioning === "promo"} className="btn-primary w-full mt-[8px] text-xs disabled:opacity-50">
          Save Promo Code
        </button>
      </form>

      <div className="grid gap-[12px] content-start">
        {promoCodes.map((promo) => (
          <button key={promo.id || promo.code} type="button" onClick={() => onEdit(promo)} className="card-panel p-[16px] text-left hover:border-[color:var(--color-hairline)] transition">
            <div className="flex items-center justify-between gap-[16px]">
              <div>
                <h3 className="text-[color:var(--color-text)] font-semibold">{promo.code}</h3>
                <p className="text-xs text-[color:var(--color-text-dim)] mt-[4px]">
                  {promo.branchSlug || "All branches"} • {promo.discountType} • {promo.appliesTo}
                </p>
              </div>
              <span className={`text-[10px] uppercase tracking-widest px-[8px] py-[4px] rounded-md border ${
                promo.status === "active"
                  ? "text-[color:var(--color-text-dim)] border-[color:var(--color-accent-border)] bg-[color:var(--color-well)]"
                  : "text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)] bg-[color:var(--color-well)]"
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
    <div className="grid grid-cols-1 gap-[16px] animate-slide-up">
      {branchSettings.map((settings) => {
        const draft = drafts[settings.branchSlug] || settings;
        return (
          <form
            key={settings.branchSlug}
            onSubmit={(event) => {
              event.preventDefault();
              onSave(draft);
            }}
            className="card-panel p-[20px]"
          >
            <h2 className="font-sans text-xl text-[color:var(--color-text)] font-medium tracking-tight mb-[16px]">
              {settings.branchName}
            </h2>
            {draft.feeTrackingEnabled ? <>
              <div className="grid grid-cols-2 gap-[12px]">
                <Field label="Monthly">
                  <input type="number" min="0" value={draft.defaultMonthlyFee} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, defaultMonthlyFee: Number(e.target.value) } })} />
                </Field>
                <Field label="Admission">
                  <input type="number" min="0" value={draft.defaultAdmissionFee} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, defaultAdmissionFee: Number(e.target.value) } })} />
                </Field>
              </div>
              <p className="mb-[12px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-xs leading-relaxed text-[color:var(--color-text-dim)]">
                Dress is not billed as a separate admission due. Herohalli includes it inside admission; MP dress is ordered through Shop.
              </p>
            </> : <p className="mb-[12px] rounded-lg border border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-xs leading-relaxed text-[color:var(--color-text)]">
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
            <div className="grid grid-cols-2 gap-[12px] mb-[16px]">
              <label className="flex items-center gap-[8px] text-xs text-[color:var(--color-text-dim)]">
                <input type="checkbox" checked={draft.isEnabled} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, isEnabled: e.target.checked } })} className="accent-[color:var(--color-accent)]" />
                Form enabled
              </label>
              <label className="flex items-center gap-[8px] text-xs text-[color:var(--color-text-dim)]">
                <input type="checkbox" checked={draft.showPublicCta} onChange={(e) => setDrafts({ ...drafts, [draft.branchSlug]: { ...draft, showPublicCta: e.target.checked } })} className="accent-[color:var(--color-accent)]" />
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
    <div className="border-l border-[color:var(--color-hairline)] pl-[12px] py-[4px]">
      <dt className="text-[10px] uppercase tracking-widest text-[color:var(--color-text-faint)]">{label}</dt>
      <dd className="text-[color:var(--color-text)] mt-[4px] break-words">{value || "Not provided"}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-[12px]">
      <span className="block text-[10px] uppercase tracking-widest text-[color:var(--color-text-faint)] mb-[6px]">{label}</span>
      <div className="[&_input]:w-full [&_select]:w-full [&_textarea]:w-full [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg [&_input]:border [&_select]:border [&_textarea]:border [&_input]:border-[color:var(--color-hairline)] [&_select]:border-[color:var(--color-hairline)] [&_textarea]:border-[color:var(--color-hairline)] [&_input]:bg-[color:var(--color-well)] [&_select]:bg-[color:var(--color-well)] [&_textarea]:bg-[color:var(--color-well)] [&_input]:px-[12px] [&_select]:px-[12px] [&_textarea]:px-[12px] [&_input]:py-[10px] [&_select]:py-[10px] [&_textarea]:py-[10px] [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_input]:text-[color:var(--color-text)] [&_select]:text-[color:var(--color-text)] [&_textarea]:text-[color:var(--color-text)] [&_input]:outline-none [&_select]:outline-none [&_textarea]:outline-none focus-within:[&_input]:border-[color:var(--color-hairline)] focus-within:[&_select]:border-[color:var(--color-hairline)] focus-within:[&_textarea]:border-[color:var(--color-hairline)]">
        {children}
      </div>
    </label>
  );
}
