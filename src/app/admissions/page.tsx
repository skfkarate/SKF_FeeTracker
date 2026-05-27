"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileImage,
  Percent,
  Settings2,
  ShieldCheck,
  Ticket,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { useFeeTrackAuth } from "@/lib/client-auth";
import {
  AdmissionApplication,
  AdmissionBranchSettings,
  AdmissionPromoCode,
  approveAdmissionApplication,
  getAdmissionDashboard,
  rejectAdmissionApplication,
  updateAdmissionBranchSettings,
  upsertAdmissionPromoCode,
} from "@/lib/api";

type Tab = "pending" | "promos" | "settings";

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

export default function AdmissionsPage() {
  const { user, checking } = useFeeTrackAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
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
      promos: promoCodes.filter((promo) => promo.status === "active").length,
      forms: branchSettings.filter((setting) => setting.isEnabled).length,
    }),
    [applications.length, branchSettings, promoCodes],
  );

  const load = useCallback(async () => {
    if (checking || !user) return;
    setLoading(true);
    setError("");
    try {
      const data = await getAdmissionDashboard("pending");
      setApplications(data.applications);
      setPromoCodes(data.promoCodes);
      setBranchSettings(data.branchSettings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admissions.");
    } finally {
      setLoading(false);
    }
  }, [checking, user]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
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
    const finalPhotoValue = formData.get("finalPhoto");
    const finalPhoto = finalPhotoValue instanceof File && finalPhotoValue.size > 0 ? finalPhotoValue : null;
    if (!finalPhoto) {
      setError("Upload the final corrected profile photo before approval.");
      return;
    }
    if (formData.get("paymentVerified") !== "on") {
      setError("Verify the admission payment before approval.");
      return;
    }
    setActioning(application.id);
    setError("");

    try {
      const result = await approveAdmissionApplication({
        applicationId: application.id,
        monthlyFee: Number(formData.get("monthlyFee") || 0),
        admissionFee: Number(formData.get("admissionFee") || 0),
        dressFee: Number(formData.get("dressFee") || 0),
        dressCost: Number(formData.get("dressCost") || 0),
        billingStartDate: String(formData.get("billingStartDate") || today()),
        batch: String(formData.get("batch") || application.preferredBatch || ""),
        belt: String(formData.get("belt") || "white"),
        isPublic: formData.get("isPublic") === "on",
        paymentVerified: formData.get("paymentVerified") === "on",
        photoAction: "upload_new",
        reviewNote: String(formData.get("reviewNote") || ""),
        finalPhoto,
      });
      setApplications((current) => current.filter((item) => item.id !== application.id));
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
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      <Navbar showBack title="ADMISSIONS" rightContent={<NavMenu />} />

      <main className="max-w-3xl mx-auto p-4 pt-24 pb-12">
        <header className="mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Student Intake</p>
            </div>
            <h1 className="font-[family-name:var(--font-space)] text-4xl font-semibold tracking-tight text-white">
              Admissions
            </h1>
            <p className="mt-3 text-sm text-zinc-500 max-w-2xl">
              Review branch admission forms, approve students into the SKF portal, and manage branch promo codes.
            </p>
          </div>
        </header>

        {!loading && !error ? (
          <div className="grid grid-cols-3 gap-3 mb-5 animate-slide-up delay-100">
            <MetricCard label="Pending" value={summary.pending} icon={Clock} tone="amber" />
            <MetricCard label="Promos" value={summary.promos} icon={Ticket} tone="green" />
            <MetricCard label="Forms" value={summary.forms} icon={ShieldCheck} tone="white" />
          </div>
        ) : null}

        <div className="flex p-1 bg-black/20 rounded-xl w-full border border-white/5 mb-5 animate-slide-up delay-100">
          {[
            ["pending", "Approvals", ShieldCheck],
            ["promos", "Promo Codes", Ticket],
            ["settings", "Settings", Settings2],
          ].map(([key, label, Icon]) => (
            <button
              key={String(key)}
              type="button"
              onClick={() => setTab(key as Tab)}
              className={`flex-1 py-2 rounded-lg text-[11px] sm:text-sm font-[family-name:var(--font-space)] tracking-wider transition-all flex items-center justify-center gap-2 ${
                tab === key
                  ? "bg-[var(--surface)] text-white border border-white/10"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label as string}
            </button>
          ))}
        </div>

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
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  tone: "green" | "amber" | "white";
}) {
  const toneClass = tone === "green" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-zinc-100";
  return (
    <div className="card-panel p-4 relative overflow-hidden">
      <Icon className={`absolute right-3 top-3 w-9 h-9 opacity-10 ${toneClass}`} />
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2 font-semibold">{label}</p>
      <p className={`font-[family-name:var(--font-space)] text-2xl font-medium tracking-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
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
  if (applications.length === 0) {
    return (
      <div className="card-panel p-10 text-center animate-fade-in">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl text-white font-medium">No pending admissions</h2>
        <p className="text-sm text-zinc-500 mt-2">New branch submissions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      {applications.map((application) => (
        <article key={application.id} className="card-panel p-4">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-md px-2 py-1">
                  {application.branchName}
                </span>
                {application.promoCode ? (
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded-md px-2 py-1">
                    {application.promoCode}
                  </span>
                ) : null}
                {application.duplicateWarnings.length > 0 ? (
                  <span className="text-[10px] uppercase tracking-widest text-red-300 border border-red-500/20 bg-red-500/10 rounded-md px-2 py-1">
                    duplicate warning
                  </span>
                ) : null}
              </div>
              <h2 className="font-[family-name:var(--font-space)] text-2xl text-white font-medium tracking-tight">
                {application.studentName}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {application.studentDob} {admissionAge(application.studentDob) ? `• ${admissionAge(application.studentDob)}` : ""} • {application.studentGender}
              </p>
              <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Info label="School" value={application.schoolClass} />
                <Info label="Guardian" value={`${application.guardianName} (${application.guardianRelationship})`} />
                <Info label="Phone" value={application.guardianPhone} />
                <Info label="WhatsApp" value={application.guardianWhatsapp} />
                <Info label="Email" value={application.guardianEmail || "Not provided"} />
                <Info label="Emergency" value={`${application.emergencyName} (${application.emergencyRelationship}) ${application.emergencyPhone}`} />
                <Info label="Batch" value={application.preferredBatch || "To confirm"} />
                <Info label="Joining" value={application.expectedJoinDate || "To confirm"} />
                <Info label="Joining Quote" value={money(application.quotedJoiningTotal)} />
                <Info label="Medical" value={application.hasMedicalCondition ? application.medicalDetails || "Yes" : "No"} />
                <Info label="Previous Training" value={application.hasPreviousTraining ? application.currentBelt || application.martialArtsStyle || "Yes" : "No"} />
                <Info label="Referral" value={application.referrerName || application.referralSource || "Not provided"} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {application.admissionPhotoUrl ? (
                  <a
                    href={application.admissionPhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-white rounded-lg border border-zinc-800 px-3 py-2 bg-black/30"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    Parent-uploaded photo
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs text-red-300 rounded-lg border border-red-500/20 px-3 py-2 bg-red-500/10">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Parent photo missing
                  </span>
                )}
                {application.paymentProofUrl ? (
                  <a
                    href={application.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-100 rounded-lg border border-emerald-500/20 px-3 py-2 bg-emerald-500/10"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    Payment screenshot
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs text-red-300 rounded-lg border border-red-500/20 px-3 py-2 bg-red-500/10">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Payment screenshot missing
                  </span>
                )}
              </div>
            </div>

            <form
              onSubmit={(event) => onApprove(event, application)}
              className="w-full lg:w-[360px] rounded-xl border border-white/5 bg-black/25 p-4"
            >
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                Human review pending: open the payment screenshot, verify the payment, download the parent photo, correct or resize it, then upload the final portal photo before approval.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly">
                  <input name="monthlyFee" type="number" min="0" defaultValue={application.quotedMonthlyFee} />
                </Field>
                <Field label="Admission">
                  <input name="admissionFee" type="number" min="0" defaultValue={application.quotedAdmissionFee} />
                </Field>
                {application.quotedDressFee > 0 ? (
                  <>
                    <Field label="Dress Fee">
                      <input name="dressFee" type="number" min="0" defaultValue={application.quotedDressFee} />
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
              <Field label="Billing Start">
                <input name="billingStartDate" type="date" defaultValue={application.expectedJoinDate || today()} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Batch">
                  <input name="batch" defaultValue={application.preferredBatch} />
                </Field>
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
                  <input type="hidden" name="photoAction" value="upload_new" />
                  <p className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-zinc-300">
                    Upload the final corrected photo. The parent-uploaded temporary photo is deleted after approval or rejection.
                  </p>
                  <input name="finalPhoto" type="file" accept="image/png,image/jpeg,image/webp" required />
                </div>
              </Field>
              <Field label="Review note">
                <textarea name="reviewNote" rows={2} />
              </Field>
              <label className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                <input name="paymentVerified" type="checkbox" required className="accent-amber-500" />
                Payment screenshot checked and amount verified
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                <input name="isPublic" type="checkbox" defaultChecked className="accent-amber-500" />
                Public profile enabled
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onReject(application)}
                  disabled={actioning === application.id}
                  className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button
                  type="submit"
                  disabled={actioning === application.id}
                  className="flex-1 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
              </div>
            </form>
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
            <Field label="Batch options">
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
            </Field>
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
