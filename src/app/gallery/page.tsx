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
} from "lucide-react";

import { ConfirmModal } from "@/components/common/ConfirmModal";
import AccountMenu from "@/components/common/AccountMenu";
import LedgerRow from "@/components/ui/LedgerRow";
import PageShell from "@/components/ui/PageShell";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import Sheet from "@/components/ui/Sheet";
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
      <div className="min-h-screen text-[color:var(--color-text)]">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-[24px] w-[24px] animate-spin text-[color:var(--color-text-dim)]" />
        </div>
      </div>
    );
  }

  return (
    <PageShell
      hud={{
        title: "Media",
        backHref: "/dashboard",
        actions: <AccountMenu />,
      }}
    >
      <div>
        <header className="mb-[32px] flex flex-col gap-[20px] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-[12px] flex items-center gap-[12px]">
              <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--color-accent)]" />
              <p className="eyebrow text-[color:var(--color-text-dim)]">Public Website Gallery</p>
            </div>
            <h1 className="mt-[4px] text-[15px] font-semibold text-[color:var(--color-text)]">Gallery Photos</h1>
            <p className="mt-[12px] max-w-2xl text-sm leading-relaxed text-[color:var(--color-text-dim)]">
              Upload public gallery images, assign categories, feature the best moments, and hide drafts until they are ready.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-[8px] sm:flex">
            <button
              type="button"
              onClick={() => loadPhotos(true)}
              disabled={refreshing}
              className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm text-[color:var(--color-text)] disabled:opacity-50"
            >
              <RefreshCw className={`h-[16px] w-[16px] ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] bg-[color:var(--color-brand)] px-[16px] eyebrow text-[color:var(--color-accent-ink)]"
            >
              <Plus className="h-[16px] w-[16px]" />
              Upload
            </button>
          </div>
        </header>

        <section className="mb-[24px] grid grid-cols-2 gap-[12px] sm:grid-cols-4">
          <StatTile label="Total" value={String(counts.total)} />
          <StatTile label="Uploaded" value={String(counts.live)} />
          <StatTile label="Published" value={String(counts.published)} tone="neutral" />
          <StatTile label="Featured" value={String(counts.featured)} tone="action" />
        </section>

        <section className="mb-[24px] grid gap-[12px] lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="relative min-w-[0px]">
            <Search className="pointer-events-none absolute left-[16px] top-[50%] h-[16px] w-[16px] -translate-y-1/2 text-[color:var(--color-text-faint)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-minimal min-h-[48px] pl-[44px]"
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
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <AlertCircle className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-[24px] flex items-start gap-[12px] rounded-lg border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] p-[16px] text-sm text-[color:var(--color-text)]">
            <CheckCircle2 className="mt-[2px] h-[16px] w-[16px] flex-shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[288px] animate-pulse rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)]" />
            ))}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[40px] text-center">
            <Images className="mx-auto mb-[16px] h-[44px] w-[44px] text-[color:var(--color-text-faint)]" />
            <h2 className="text-lg font-semibold text-[color:var(--color-text)]">No gallery photos found</h2>
            <p className="mt-[8px] text-sm text-[color:var(--color-text-dim)]">Change the filter or upload a new photo.</p>
          </div>
        ) : (
          <div className="hud-panel overflow-hidden">
            <div className="divide-y divide-[color:var(--color-hairline)]">
              {filteredPhotos.map((photo, index) => {
                const status = "neutral" as const;
                return (
                  <LedgerRow
                    key={photo.id}
                    index={index}
                    status={status}
                    title={photo.title}
                    subtitle={`${photo.cat} · ${photo.isSeed ? "Seed photo" : "Uploaded photo"}`}
                    idLabel={`ORDER ${photo.sortOrder || 0} · ${photo.id}`}
                    trailing={
                      <div className="flex items-center gap-[8px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={normalizeKarateMediaUrl(photo.src)}
                          alt={photo.title}
                          className="h-[44px] w-[44px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] object-cover"
                        />
                        {photo.pinned ? <StatusPill status="neutral" label="Featured" ariaLabel="Featured photo" /> : null}
                        <StatusPill status={status} label={photo.isPublished ? "Live" : "Draft"} />
                        <button
                          type="button"
                          onClick={() => openEditModal(photo)}
                          disabled={photo.isSeed}
                          aria-label={`Edit ${photo.title}`}
                          className="tap-target grid w-[40px] place-items-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text)] disabled:opacity-40"
                        >
                          <Pencil className="h-[16px] w-[16px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(photo)}
                          disabled={photo.isSeed || deletingId === photo.id}
                          aria-label={`Delete ${photo.title}`}
                          className="tap-target grid w-[40px] place-items-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline-strong)] bg-[color:var(--color-well)] text-[color:var(--color-text)] disabled:opacity-40"
                        >
                          {deletingId === photo.id ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <Trash2 className="h-[16px] w-[16px]" />}
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

      <Sheet
        open={modalOpen}
        title={editingPhoto ? "Edit Photo" : "Upload Photos"}
        onClose={closeModal}
        footer={
          <div className="grid grid-cols-2 gap-[8px]">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="tap-target inline-flex items-center justify-center rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-sm text-[color:var(--color-text)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="tap-target inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-row)] bg-[color:var(--color-brand)] eyebrow text-[color:var(--color-accent-ink)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-[16px] w-[16px] animate-spin" /> : <Upload className="h-[16px] w-[16px]" />}
              Save
            </button>
          </div>
        }
      >
        <div className="grid gap-[16px] pt-[4px]">
          <label className="grid gap-[8px]">
            <span className="eyebrow text-[color:var(--color-text-dim)]">
              {editingPhoto ? "Title" : "Title / Batch Label"}
            </span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="input-minimal"
              placeholder={editingPhoto ? "Photo title" : "Leave blank to use file names"}
            />
          </label>

          <div className="grid gap-[16px] sm:grid-cols-[1fr_140px]">
            <label className="grid gap-[8px]">
              <span className="eyebrow text-[color:var(--color-text-dim)]">Category</span>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="input-minimal"
              >
                {GALLERY_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-[8px]">
              <span className="eyebrow text-[color:var(--color-text-dim)]">Sort</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))}
                className="input-minimal"
              />
            </label>
          </div>

          <div className="grid gap-[12px] sm:grid-cols-2">
            <label className="tap-target flex cursor-pointer items-center justify-between gap-[12px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm text-[color:var(--color-text)]">
              <span className="inline-flex items-center gap-[8px]">
                <Star className="h-[16px] w-[16px] text-[color:var(--color-text)]" />
                Featured
              </span>
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                className="h-[16px] w-[16px] accent-[color:var(--color-brand)]"
              />
            </label>
            <label className="tap-target flex cursor-pointer items-center justify-between gap-[12px] rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] px-[16px] text-sm text-[color:var(--color-text)]">
              <span className="inline-flex items-center gap-[8px]">
                {form.isPublished ? <Eye className="h-[16px] w-[16px] text-[color:var(--color-text)]" /> : <EyeOff className="h-[16px] w-[16px] text-[color:var(--color-text-dim)]" />}
                Published
              </span>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                className="h-[16px] w-[16px] accent-[color:var(--color-brand)]"
              />
            </label>
          </div>

          <label className="grid cursor-pointer gap-[12px] rounded-[var(--radius-row)] border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[20px] text-center transition-colors hover:border-[color:var(--color-hairline-strong)]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={!editingPhoto}
              className="sr-only"
              onChange={(event) => handleFiles(event.currentTarget.files)}
            />
            <ImagePlus className="mx-auto h-[32px] w-[32px] text-[color:var(--color-text-dim)]" />
            <span className="text-sm text-[color:var(--color-text)]">
              {editingPhoto ? "Replace image (optional)" : "Choose one or multiple photos"}
            </span>
            <span className="text-xs text-[color:var(--color-text-faint)]">JPG, PNG or WebP. Max 8 MB per image.</span>
          </label>

          {files.length ? (
            <div className="rounded-[var(--radius-row)] border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] p-[12px]">
              <p className="mb-[8px] eyebrow text-[color:var(--color-text-faint)]">Selected</p>
              <div className="grid gap-[8px]">
                {files.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-[12px] rounded-[var(--radius-row)] bg-[color:var(--color-well)] px-[12px] py-[8px] text-sm">
                    <span className="min-w-[0px] truncate text-[color:var(--color-text)]">{file.name}</span>
                    <span className="flex-shrink-0 text-xs text-[color:var(--color-text-faint)]">{Math.round(file.size / 1024)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Sheet>

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
