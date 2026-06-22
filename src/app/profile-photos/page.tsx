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

import Navbar from "@/components/common/Navbar";
import NavMenu from "@/components/common/NavMenu";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { getStudents, Student, uploadStudentProfilePhoto } from "@/lib/api";
import { initials, normalizeProfilePhotoUrl } from "@/lib/profile-photo";

type Branch = "MPSC" | "Herohalli";
type MissingPhotoStudent = Student & { branch: Branch };

const BRANCHES: Branch[] = ["MPSC", "Herohalli"];
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function studentKey(student: MissingPhotoStudent) {
  return `${student.branch}:${student.id}`;
}

function realPhotoUrl(student: Student) {
  return normalizeProfilePhotoUrl(student.photoUrl);
}

function needsProfilePhoto(student: Student) {
  if (student.hasProfilePhoto === true) return false;
  return !realPhotoUrl(student);
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
  const [students, setStudents] = useState<MissingPhotoStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<"All" | Branch>("All");
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

      const missing = branchResults
        .flat()
        .filter((student) => student.status !== "Discontinued")
        .filter(needsProfilePhoto)
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

      setStudents(missing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load missing profile photos.");
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

  const counts = useMemo(() => ({
    All: students.length,
    MPSC: students.filter((student) => student.branch === "MPSC").length,
    Herohalli: students.filter((student) => student.branch === "Herohalli").length,
  }), [students]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const branchMatch = branchFilter === "All" || student.branch === branchFilter;
      const searchMatch = !query || [
        student.name,
        student.id,
        student.parentName,
        student.phone,
        student.branch,
      ].join(" ").toLowerCase().includes(query);

      return branchMatch && searchMatch;
    });
  }, [branchFilter, search, students]);

  const handleFileChange = (student: MissingPhotoStudent, file: File | null) => {
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

  const handleUpload = async (student: MissingPhotoStudent) => {
    const key = studentKey(student);
    const file = selectedFiles[key];
    if (!file || uploading[key]) return;

    setUploading((prev) => ({ ...prev, [key]: true }));
    setError("");
    setSuccess("");

    try {
      await uploadStudentProfilePhoto(student.id, file);
      setStudents((prev) => prev.filter((entry) => studentKey(entry) !== key));
      setSelectedFiles((prev) => omitKey(prev, key));
      setPreviews((prev) => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        return omitKey(prev, key);
      });
      setSuccess(`${student.name}'s profile photo was saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile photo upload failed.");
    } finally {
      setUploading((prev) => omitKey(prev, key));
    }
  };

  if (checking || !user) return null;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <Navbar showBack title="Profile Photos" rightContent={<NavMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <header className="mb-8 animate-fade-in">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Portal Profiles</p>
              </div>
              <h1 className="font-[family-name:var(--font-space)] text-3xl md:text-4xl font-semibold tracking-tight text-white">
                Missing Profile Photos
              </h1>
            </div>

            <button
              type="button"
              onClick={() => loadStudents(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-minimal min-h-12 pl-11"
              placeholder="Search student, ID, parent, phone"
            />
          </div>

          <div className="flex min-h-12 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            {(["All", "MPSC", "Herohalli"] as const).map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => setBranchFilter(branch)}
                className={`min-w-20 px-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                  branchFilter === branch
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {branch === "All" ? "All" : branchDisplayName(branch)}
                <span className="ml-2 opacity-60">{counts[branch]}</span>
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{success}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="card-panel h-28 animate-pulse bg-zinc-900/80" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-black text-zinc-500">
              <Camera className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">All profile photos are updated</h2>
            <p className="mt-2 text-sm text-zinc-500">No missing students found for the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredStudents.map((student) => {
              const key = studentKey(student);
              const preview = previews[key];
              const selectedFile = selectedFiles[key];
              const isUploading = Boolean(uploading[key]);
              const inputId = `profile-photo-${encodeURIComponent(key)}`;

              return (
                <article key={key} className="card-panel p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex flex-1 items-center gap-4 min-w-0">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" className="h-full w-full object-cover" />
                        ) : realPhotoUrl(student) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={realPhotoUrl(student)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500">
                            {initials(student.name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold text-white">{student.name}</h2>
                          <span className="rounded-md border border-zinc-800 bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            {branchDisplayName(student.branch)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span>{student.id}</span>
                          {student.parentName ? <span>{student.parentName}</span> : null}
                          {student.phone ? <span>{student.phone}</span> : null}
                        </div>
                        {selectedFile ? (
                          <p className="mt-2 max-w-full truncate text-xs text-zinc-400">{selectedFile.name}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:flex md:flex-shrink-0">
                      <input
                        id={inputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => handleFileChange(student, event.currentTarget.files?.[0] || null)}
                      />
                      <label
                        htmlFor={inputId}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
                      >
                        {preview ? <ImagePlus className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                        Choose
                      </label>

                      <button
                        type="button"
                        onClick={() => handleUpload(student)}
                        disabled={!selectedFile || isUploading}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Save
                      </button>

                      <Link
                        href={`/students/${student.branch}/${encodeURIComponent(student.id)}`}
                        className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white md:col-span-1"
                      >
                        Profile
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
