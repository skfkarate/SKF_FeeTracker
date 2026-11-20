"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  UserRound,
} from "lucide-react";

import GlobalSearch from "@/components/common/GlobalSearch";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import AccountMenu from "@/components/common/AccountMenu";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getStudents, Student, uploadStudentProfilePhoto } from "@/lib/api";
import { initials, hasDisplayPhoto, normalizeProfilePhotoUrl } from "@/lib/profile-photo";

type Branch = "MPSC" | "Herohalli";
type PhotoStudent = Student & { branch: Branch };

const BRANCHES: Branch[] = ["MPSC", "Herohalli"];
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function studentKey(student: PhotoStudent) {
  return `${student.branch}:${student.id}`;
}

function realPhotoUrl(student: Student) {
  return normalizeProfilePhotoUrl(student.photoUrl);
}

function needsProfilePhoto(student: Student) {
  return !hasDisplayPhoto(student);
}

function omitKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

function branchDisplayName(branch: Branch) {
  return branch === "MPSC" ? "MP" : "Herohalli";
}

export default function ProfilePhotosPage() {
  const { user, checking } = useFeeTrackAuth();
  const [students, setStudents] = useState<PhotoStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<"All" | Branch>("All");
  const [photoFilter, setPhotoFilter] = useState<"all" | "missing" | "has">("all");
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const previewsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      for (const preview of Object.values(previewsRef.current)) {
        URL.revokeObjectURL(preview);
      }
    };
  }, []);

  const loadStudents = useCallback(async (forceRefresh = false) => {
    setError("");
    setSuccess("");
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const currentMonth = new Date().getMonth();
      const branchResults = await Promise.all(
        BRANCHES.map(async (branch) => {
          const rows = await getStudents(branch, currentMonth, forceRefresh);
          return rows.map((student) => ({ ...student, branch }));
        }),
      );

      const roster = branchResults
        .flat()
        .filter((student) => student.status !== "Discontinued")
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

      setStudents(roster);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load student photos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      void loadStudents(false);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checking, loadStudents, user]);

  const photoCounts = useMemo(() => ({
    all: students.length,
    missing: students.filter((student) => needsProfilePhoto(student)).length,
    has: students.filter((student) => !needsProfilePhoto(student)).length,
  }), [students]);

  const branchPool = useMemo(
    () => students.filter((student) => {
      if (photoFilter === "missing") return needsProfilePhoto(student);
      if (photoFilter === "has") return !needsProfilePhoto(student);
      return true;
    }),
    [photoFilter, students],
  );

  const counts = useMemo(() => ({
    All: branchPool.length,
    MPSC: branchPool.filter((student) => student.branch === "MPSC").length,
    Herohalli: branchPool.filter((student) => student.branch === "Herohalli").length,
  }), [branchPool]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const branchMatch = branchFilter === "All" || student.branch === branchFilter;
      const photoMatch =
        photoFilter === "all" ||
        (photoFilter === "missing" ? needsProfilePhoto(student) : !needsProfilePhoto(student));
      const searchMatch = !query || [
        student.name,
        student.id,
        student.parentName,
        student.phone,
        student.branch,
      ].join(" ").toLowerCase().includes(query);

      return branchMatch && photoMatch && searchMatch;
    });
  }, [branchFilter, photoFilter, search, students]);

  const handleFileChange = (student: PhotoStudent, file: File | null) => {
    const key = studentKey(student);
    setSuccess("");
    setError("");

    if (!file) {
      setSelectedFiles((prev) => omitKey(prev, key));
      setPreviews((prev) => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        return omitKey(prev, key);
      });
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError("Profile photo must be a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError("Profile photo must be 8 MB or smaller.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedFiles((prev) => ({ ...prev, [key]: file }));
    setPreviews((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      return { ...prev, [key]: preview };
    });
  };

  const handleUpload = async (student: PhotoStudent) => {
    const key = studentKey(student);
    const file = selectedFiles[key];
    if (!file || uploading[key]) return;

    setUploading((prev) => ({ ...prev, [key]: true }));
    setError("");
    setSuccess("");

    try {
      const result = await uploadStudentProfilePhoto(student.id, file);
      setStudents((prev) =>
        prev.map((entry) =>
          studentKey(entry) === key
            ? { ...entry, photoUrl: result.photoUrl, hasProfilePhoto: true }
            : entry,
        ),
      );
      setSelectedFiles((prev) => omitKey(prev, key));
      setPreviews((prev) => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        return omitKey(prev, key);
      });
      setSuccess(
        `${student.name}'s profile photo was ${needsProfilePhoto(student) ? "saved" : "updated"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile photo upload failed.");
    } finally {
      setUploading((prev) => omitKey(prev, key));
    }
  };

  if (checking || !user) return null;

  return (
    <PageShell
      hud={{
        title: "Profile Photos",
        backHref: "/dashboard",
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
        <header className="mb-[32px] animate-fade-in">
          <div className="flex flex-col gap-[20px] md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-[12px] mb-[12px]">
                <span className="w-[8px] h-[8px] rounded-full bg-[color:var(--color-accent)]" />
                <p className="text-[color:var(--color-text-dim)] text-xs font-mono uppercase tracking-widest">Portal Profiles</p>
              </div>
              <h1 className="font-sans text-3xl md:text-4xl font-semibold tracking-tight text-[color:var(--color-text)]">
                Profile Photos
              </h1>
              <p className="mt-[8px] max-w-xl text-sm text-[color:var(--color-text-dim)]">
                Add a missing photo or replace an existing one. Changes appear on the student portal immediately.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadStudents(true)}
              disabled={refreshing}
              className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <RefreshCw className="h-[16px] w-[16px]" />}
              Refresh
            </button>
          </div>
        </header>

        <section className="mb-[32px] grid grid-cols-1 gap-[16px] md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-[16px] top-[50%] h-[16px] w-[16px] -translate-y-1/2 text-[color:var(--color-text-faint)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-minimal min-h-[48px] pl-[44px]"
              placeholder="Search student, ID, parent, phone"
            />
          </div>

          <div className="flex min-h-[48px] overflow-hidden rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
            {(["All", "MPSC", "Herohalli"] as const).map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => setBranchFilter(branch)}
                className={`min-w-[80px] px-[16px] text-xs font-bold uppercase tracking-wider transition-colors ${
                  branchFilter === branch
                    ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
                    : "text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-well)] hover:text-[color:var(--color-text)]"
                }`}
              >
                {branch === "All" ? "All" : branchDisplayName(branch)}
                <span className="ml-[8px] opacity-60">{counts[branch]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-[8px] md:col-span-2">
            {([
              ["all", "All students", photoCounts.all],
              ["missing", "Missing photo", photoCounts.missing],
              ["has", "Has photo", photoCounts.has],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPhotoFilter(value)}
                className={`inline-flex min-h-[36px] items-center gap-[8px] rounded-lg border px-[12px] text-xs font-semibold transition-colors ${
                  photoFilter === value
                    ? "border-[color:var(--color-hairline)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
                    : "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)]"
                }`}
              >
                {value === "missing" ? <Camera className="h-[14px] w-[14px]" /> : value === "has" ? <CheckCircle2 className="h-[14px] w-[14px]" /> : null}
                {label}
                <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <CheckCircle2 className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{success}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-[12px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="card-panel h-[112px] animate-pulse bg-[color:var(--color-well)]" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[40px] text-center">
            <div className="mx-auto mb-[16px] flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)]">
              <Camera className="h-[20px] w-[20px]" />
            </div>
            <h2 className="text-lg font-semibold text-[color:var(--color-text)]">
              {photoFilter === "missing" ? "No missing photos" : photoFilter === "has" ? "No students with photos" : "No students found"}
            </h2>
            <p className="mt-[8px] text-sm text-[color:var(--color-text-dim)]">Try another filter or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[16px]">
            {filteredStudents.map((student) => {
              const key = studentKey(student);
              const preview = previews[key];
              const selectedFile = selectedFiles[key];
              const isUploading = Boolean(uploading[key]);
              const inputId = `profile-photo-${encodeURIComponent(key)}`;

              return (
                <article key={key} className="card-panel p-[16px] md:p-[20px]">
                  <div className="flex flex-col gap-[16px] md:flex-row md:items-center">
                    <div className="flex flex-1 items-center gap-[16px] min-w-[0px]">
                      <div className="relative h-[64px] w-[64px] flex-shrink-0 overflow-hidden rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" className="h-full w-full object-cover" />
                        ) : realPhotoUrl(student) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={realPhotoUrl(student)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[color:var(--color-text-dim)]">
                            {initials(student.name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-[0px]">
                        <div className="flex flex-wrap items-center gap-[8px]">
                          <h2 className="truncate text-base font-semibold text-[color:var(--color-text)]">{student.name}</h2>
                          <span className="rounded-md border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[8px] py-[2px] text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-dim)]">
                            {branchDisplayName(student.branch)}
                          </span>
                          <span className={`rounded-md border px-[8px] py-[2px] text-[10px] font-bold uppercase tracking-wider ${
                            needsProfilePhoto(student)
                              ? "border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)]"
                              : "border-[color:var(--color-accent-border)] bg-[color:var(--color-well)] text-[color:var(--color-text)]"
                          }`}>
                            {needsProfilePhoto(student) ? "Missing photo" : "Has photo"}
                          </span>
                        </div>
                        <div className="mt-[4px] flex flex-wrap items-center gap-x-[12px] gap-y-[4px] text-xs text-[color:var(--color-text-dim)]">
                          <span>{student.id}</span>
                          {student.parentName ? <span>{student.parentName}</span> : null}
                          {student.phone ? <span>{student.phone}</span> : null}
                        </div>
                        {selectedFile ? (
                          <p className="mt-[8px] max-w-full truncate text-xs text-[color:var(--color-text-dim)]">{selectedFile.name}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-[8px] md:flex md:flex-shrink-0">
                      <input
                        id={inputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => handleFileChange(student, event.currentTarget.files?.[0] || null)}
                      />
                      <label
                        htmlFor={inputId}
                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:border-[color:var(--color-hairline)] hover:bg-[color:var(--color-well)]"
                      >
                        {preview ? <ImagePlus className="h-[16px] w-[16px]" /> : <UserRound className="h-[16px] w-[16px]" />}
                        {preview ? "Change" : needsProfilePhoto(student) ? "Add photo" : "Replace"}
                      </label>

                      <button
                        type="button"
                        onClick={() => handleUpload(student)}
                        disabled={!selectedFile || isUploading}
                        className="inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg bg-[color:var(--color-accent)] px-[16px] text-sm font-semibold text-[color:var(--color-accent-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isUploading ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <Upload className="h-[16px] w-[16px]" />}
                        Save
                      </button>

                      <Link
                        href={`/students/${student.branch}/${encodeURIComponent(student.id)}`}
                        className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm font-semibold text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-hairline)] hover:text-[color:var(--color-text)] md:col-span-1"
                      >
                        Profile
                        <ArrowUpRight className="h-[16px] w-[16px]" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </PageShell>
  );
}
