"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { ConfirmModal } from "@/components/common/ConfirmModal";
import NavMenu from "@/components/common/NavMenu";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import StatTile from "@/components/ui/StatTile";
import StatusPill from "@/components/ui/StatusPill";
import {
  deleteGalleryPhoto,
  GALLERY_CATEGORIES,
  getGalleryPhotos,
  type GalleryPhoto,
  uploadGalleryPhoto,
  upsertGalleryPhoto,
} from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { normalizeKarateMediaUrl } from "@/lib/media-url";

type GalleryForm = {
  title: string;
  category: string;
  pinned: boolean;
  isPublished: boolean;
  sortOrder: number;
};

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function blankForm(): GalleryForm {
  return {
    title: "",
    category: "In Dojo",
    pinned: false,
    isPublished: true,
    sortOrder: 0,
  };
}

function fileTitle(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Gallery Photo";
}

function categoryCount(photos: GalleryPhoto[], category: string) {
  if (category === "All") return photos.length;
  return photos.filter((photo) => photo.cat === category).length;
}

export default function GalleryManagerPage() {
  const { user, checking } = useFeeTrackAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [form, setForm] = useState<GalleryForm>(() => blankForm());
  const [files, setFiles] = useState<File[]>([]);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
  } | null>(null);

  const loadPhotos = useCallback(async (forceRefresh = false) => {
    setError("");
    setNotice("");
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setPhotos(await getGalleryPhotos(forceRefresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load gallery photos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    const timeoutId = window.setTimeout(() => {
      void loadPhotos(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [checking, loadPhotos, user]);

  const counts = useMemo(() => ({
    total: photos.length,
    live: photos.filter((photo) => !photo.isSeed).length,
    published: photos.filter((photo) => photo.isPublished).length,
    featured: photos.filter((photo) => photo.pinned).length,
  }), [photos]);

  const filteredPhotos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return photos.filter((photo) => {
      const categoryMatch = category === "All" || photo.cat === category;
      const searchMatch = !term || [photo.title, photo.cat, photo.id].join(" ").toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [category, photos, query]);

  function openCreateModal() {
    setEditingPhoto(null);
    setForm(blankForm());
    setFiles([]);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(photo: GalleryPhoto) {
    setEditingPhoto(photo);
    setForm({
      title: photo.title,
      category: photo.cat,
      pinned: photo.pinned,
      isPublished: photo.isPublished,
      sortOrder: photo.sortOrder || 0,
    });
    setFiles([]);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingPhoto(null);
    setFiles([]);
  }

  function handleFiles(nextFiles: FileList | null) {
    setError("");
    const selected = Array.from(nextFiles || []);
    const invalid = selected.find((file) => !ACCEPTED_IMAGE_TYPES.has(file.type));
    if (invalid) {
      setError("Gallery photos must be JPG, PNG, or WebP images.");
      return;
    }

    const tooLarge = selected.find((file) => file.size > MAX_PHOTO_BYTES);
    if (tooLarge) {
      setError("Each gallery photo must be 8 MB or smaller.");
      return;
    }

    setFiles(selected);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingPhoto) {
        if (files[0]) {
          await uploadGalleryPhoto({
            photoId: editingPhoto.id,
            file: files[0],
            ...form,
          });
        } else {
          await upsertGalleryPhoto({
            id: editingPhoto.id,
            title: form.title || editingPhoto.title,
            category: form.category,
            pinned: form.pinned,
            isPublished: form.isPublished,
            sortOrder: form.sortOrder,
            src: editingPhoto.src,
          });
        }
        setNotice("Gallery photo updated.");
      } else {
        if (!files.length) {
          setError("Choose at least one gallery photo to upload.");
          return;
        }

        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const baseTitle = form.title.trim() || fileTitle(file);
          await uploadGalleryPhoto({
            file,
            title: files.length > 1 && form.title.trim() ? `${baseTitle} ${index + 1}` : baseTitle,
            category: form.category,
            pinned: form.pinned,
            isPublished: form.isPublished,
            sortOrder: form.sortOrder + index,
          });
        }
        setNotice(`${files.length} gallery photo${files.length === 1 ? "" : "s"} uploaded.`);
      }

      await loadPhotos(true);
      setModalOpen(false);
      setEditingPhoto(null);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gallery photo save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(photo: GalleryPhoto) {
    if (photo.isSeed || deletingId) return;
    setConfirmState({
      title: "Delete Gallery Photo",
      message: `Delete "${photo.title}" from the public gallery?`,
      variant: "danger" as const,
      onConfirm: async () => {
        setConfirmState(null);
        setDeletingId(photo.id);
        setError("");
        setNotice("");
        try {
          await deleteGalleryPhoto(photo.id);
          setPhotos((current) => current.filter((entry) => entry.id !== photo.id));
          setNotice("Gallery photo deleted.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gallery photo delete failed.");
        } finally {
          setDeletingId("");
        }
      },
    });
  }

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-black text-zinc-300">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <PageShell
      hud={{
        title: "Media",
        backHref: "/dashboard",
        actions: <NavMenu />,
      }}
    >
      <div>
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
              <p className="font-pixel-label text-zinc-500">Public Website Gallery</p>
            </div>
            <h1 className="mt-1 text-[15px] font-semibold text-white">Gallery Photos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Upload public gallery images, assign categories, feature the best moments, and hide drafts until they are ready.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => loadPhotos(true)}
              disabled={refreshing}
              className="tap-target inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] px-4 text-sm text-zinc-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="tap-target inline-flex items-center justify-center gap-2 rounded-[var(--radius-row)] bg-[color:var(--color-brand)] px-4 font-pixel-label text-black"
            >
              <Plus className="h-4 w-4" />
              Upload
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total" value={String(counts.total)} />
          <StatTile label="Uploaded" value={String(counts.live)} />
          <StatTile label="Published" value={String(counts.published)} tone="settled" />
          <StatTile label="Featured" value={String(counts.featured)} tone="action" />
        </section>

        <section className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-minimal min-h-12 pl-11"
              placeholder="Search title, category or photo ID"
            />
          </div>
          <SegmentedTabs
            ariaLabel="Gallery category"
            className="max-w-full overflow-x-auto"
            value={category}
            onChange={setCategory}
            options={["All", ...GALLERY_CATEGORIES].map((item) => ({
              value: item,
              label: `${item} ${categoryCount(photos, item)}`,
            }))}
          />
        </section>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950" />
            ))}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <Images className="mx-auto mb-4 h-9 w-9 text-zinc-600" />
            <h2 className="text-lg font-semibold text-white">No gallery photos found</h2>
            <p className="mt-2 text-sm text-zinc-500">Change the filter or upload a new photo.</p>
          </div>
        ) : (
          <div className="hud-panel overflow-hidden">
            <div className="divide-y divide-[color:var(--color-hairline)]">
              {filteredPhotos.map((photo, index) => {
                const status = photo.isPublished ? "paid" : "due";
                return (
                  <LedgerRow
                    key={photo.id}
                    index={index}
                    status={status}
                    title={photo.title}
                    subtitle={`${photo.cat} · ${photo.isSeed ? "Seed photo" : "Uploaded photo"}`}
                    idLabel={`ORDER ${photo.sortOrder || 0} · ${photo.id}`}
                    trailing={
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={normalizeKarateMediaUrl(photo.src)}
                          alt={photo.title}
                          className="h-10 w-10 rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] object-cover"
                        />
                        {photo.pinned ? <StatusPill status="verifying" label="Featured" /> : null}
                        <StatusPill status={status} label={photo.isPublished ? "Live" : "Draft"} />
                        <button
                          type="button"
                          onClick={() => openEditModal(photo)}
                          disabled={photo.isSeed}
                          aria-label={`Edit ${photo.title}`}
                          className="tap-target grid w-10 place-items-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[#0a0a0a] text-zinc-300 disabled:opacity-40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(photo)}
                          disabled={photo.isSeed || deletingId === photo.id}
                          aria-label={`Delete ${photo.title}`}
                          className="tap-target grid w-10 place-items-center rounded-[var(--radius-row)] border border-red-500/25 bg-red-500/10 text-red-200 disabled:opacity-40"
                        >
                          {deletingId === photo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="glass-modal-overlay" onClick={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="glass-modal !max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">{editingPhoto ? "Edit Photo" : "Upload Photos"}</p>
                <h2 className="text-lg font-semibold text-white">{editingPhoto ? editingPhoto.title : "Gallery Upload"}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  {editingPhoto ? "Title" : "Title / Batch Label"}
                </span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="input-minimal min-h-11"
                  placeholder={editingPhoto ? "Photo title" : "Leave blank to use file names"}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Category</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="input-minimal min-h-11"
                  >
                    {GALLERY_CATEGORIES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sort</span>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))}
                    className="input-minimal min-h-11"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300">
                  <span className="inline-flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-300" />
                    Featured
                  </span>
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                    className="h-4 w-4 accent-white"
                  />
                </label>
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300">
                  <span className="inline-flex items-center gap-2">
                    {form.isPublished ? <Eye className="h-4 w-4 text-emerald-300" /> : <EyeOff className="h-4 w-4 text-zinc-500" />}
                    Published
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                    className="h-4 w-4 accent-white"
                  />
                </label>
              </div>

              <label className="grid cursor-pointer gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-5 text-center transition-colors hover:border-zinc-500">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={!editingPhoto}
                  className="sr-only"
                  onChange={(event) => handleFiles(event.currentTarget.files)}
                />
                <ImagePlus className="mx-auto h-8 w-8 text-zinc-500" />
                <span className="text-sm font-semibold text-white">
                  {editingPhoto ? "Replace image (optional)" : "Choose one or multiple photos"}
                </span>
                <span className="text-xs text-zinc-600">JPG, PNG or WebP. Max 8 MB per image.</span>
              </label>

              {files.length ? (
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="mb-2 text-xs uppercase tracking-widest text-zinc-600">Selected</p>
                  <div className="grid gap-2">
                    {files.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-950 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-zinc-300">{file.name}</span>
                        <span className="flex-shrink-0 text-xs text-zinc-600">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="btn-ghost inline-flex min-h-11 items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState ? (
        <ConfirmModal
          open
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant ?? "default"}
          confirmLabel="Delete"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      ) : null}
    </PageShell>
  );
}
