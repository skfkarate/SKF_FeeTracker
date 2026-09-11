import type { LucideIcon } from "lucide-react";

export const VIDEO_CATEGORIES = [
  { value: "techniques", label: "Techniques" },
  { value: "kata", label: "Kata" },
  { value: "kumite", label: "Kumite" },
  { value: "bunkai", label: "Bunkai" },
  { value: "fitness", label: "Conditioning" },
  { value: "seminar", label: "Seminar" },
];

export const BRANCH_OPTIONS = [
  { slug: "mp-sports-club", label: "MP" },
  { slug: "herohalli", label: "Herohalli" },
  { slug: "kunigal", label: "Kunigal" },
];

export const BELT_OPTIONS = ["white", "yellow", "orange", "green-ii", "green-i", "blue", "purple", "brown-iii", "brown-ii", "brown-i", "black"];

export const BELT_LABELS: Record<string, string> = {
  white: "White · 10th Kyu",
  yellow: "Yellow · 9th Kyu",
  orange: "Orange · 8th Kyu",
  "green-ii": "Green II · 7th Kyu",
  "green-i": "Green I · 6th Kyu",
  blue: "Blue · 5th Kyu",
  purple: "Purple · 4th Kyu",
  "brown-iii": "Brown III · 3rd Kyu",
  "brown-ii": "Brown II · 2nd Kyu",
  "brown-i": "Brown I · 1st Kyu",
  black: "Black · Dan",
};

export function thumbnailUrl(youtubeId: string) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

const isLocalPublicUrl = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::|\/|$)/i.test(value);

const DEFAULT_KARATE_ORIGIN = "https://www.skfkarate.org";

export function practicePortalBaseUrl() {
  const configuredBase = process.env.NEXT_PUBLIC_SKF_KARATE_URL?.trim();
  const base =
    !configuredBase ||
    (process.env.NODE_ENV === "production" && isLocalPublicUrl(configuredBase))
      ? DEFAULT_KARATE_ORIGIN
      : configuredBase;
  return (base || DEFAULT_KARATE_ORIGIN).replace(/\/+$/, "");
}

export function videoPortalShareLink(videoId: string) {
  return `${practicePortalBaseUrl()}/portal/videos/${encodeURIComponent(videoId)}`;
}

export function folderPortalShareLink(folderId: string) {
  return `${practicePortalBaseUrl()}/portal/videos?folder=${encodeURIComponent(folderId)}`;
}

export function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function formatShortDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export type ViewMode = "grid" | "list";
export type SortMode = "auto" | "name" | "newest";

export type CollectionKey = "" | "unfiled" | "drafts" | "watched";

export type ContextMenuItem = {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onSelect: () => void;
};
