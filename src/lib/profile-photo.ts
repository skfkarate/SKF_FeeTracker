import type { CSSProperties } from "react";

import type { Student } from "@/lib/api";

type AvatarTint = "violet" | "sky" | "rose" | "slate";

const AVATAR_TINTS: readonly AvatarTint[] = ["violet", "sky", "rose", "slate"];

export function avatarTint(name: string): AvatarTint {
  const hash = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function avatarTintStyle(name: string): CSSProperties {
  const tint = avatarTint(name);
  return {
    color: `var(--avatar-${tint}-text)`,
    backgroundColor: `var(--avatar-${tint}-fill)`,
  };
}

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
