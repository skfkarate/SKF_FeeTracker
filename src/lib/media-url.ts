const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:/i;

const TIMETABLE_FALLBACKS: Record<string, string> = {
  "/timetables/herohalli.jpg": "/timetables/Herohalli.png",
  "/timetables/mp-sports-club.jpg": "/timetables/MP Sports Club.png",
};

function normalizeRelativePath(value: string) {
  const path = value.replace(/^\/?public\//i, "");
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return TIMETABLE_FALLBACKS[withSlash] || withSlash;
}

export function normalizeKarateMediaUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("//")) return `https:${raw}`;
  if (ABSOLUTE_URL_PATTERN.test(raw)) return raw;
  if (raw.startsWith("/api/feetrack/media")) return raw;
  if (raw.startsWith("/api/feetrack/")) return raw;
  if (raw.startsWith("/_next/")) return raw;

  const mediaPath = normalizeRelativePath(raw);
  return `/api/feetrack/media?path=${encodeURIComponent(mediaPath)}`;
}

/**
 * Practice photos live in a private Supabase bucket and are only served to
 * authenticated portal athletes via short-lived signed URLs. This resolves a
 * storage path to the staff-gated preview proxy so admins can see them too.
 */
export function practicePhotoUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("//")) return `https:${raw}`;
  if (ABSOLUTE_URL_PATTERN.test(raw)) return raw;
  if (raw.startsWith("/api/feetrack/")) return raw;

  return `/api/feetrack/practice-photos/preview?path=${encodeURIComponent(raw)}`;
}
