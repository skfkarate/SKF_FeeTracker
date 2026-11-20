const OWNER_ALIASES = new Set([
  "admin",
  "administrator",
  "krish",
  "kr1shnac",
  "krishnacgowda10@gmail.com",
]);

/**
 * The login API stores staff.name, which is currently "admin" for the owner.
 * Show the owner's real name while still handling other staff names safely.
 */
export function getDisplayName(user?: string | null): string {
  const raw = (user || "").trim();
  if (!raw) return "Krishna";
  if (OWNER_ALIASES.has(raw.toLowerCase())) return "Krishna";

  return raw
    .split(/[._-]+|\s+@\s+|@/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
