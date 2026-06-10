import type { Student } from "@/lib/api";

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SKF"
  );
}

export function normalizeProfilePhotoUrl(photoUrl?: string | null) {
  const raw = String(photoUrl || "").trim();
  if (!raw || raw.includes("/no-profile/")) return "";

  if (raw.startsWith("/api/profile-photos/")) {
    return raw.replace("/api/profile-photos/", "/api/feetrack/profile-photos/");
  }

  return raw;
}

export function hasDisplayPhoto(student: Pick<Student, "photoUrl" | "hasProfilePhoto">) {
  if (student.hasProfilePhoto === false) return false;
  return Boolean(normalizeProfilePhotoUrl(student.photoUrl));
}
