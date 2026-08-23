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
  { slug: "m-p-sports-club", label: "MP" },
  { slug: "herohalli", label: "Herohalli" },
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

const BELT_STRIPES: Record<string, string> = {
  white: "bg-zinc-200",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  "green-ii": "bg-emerald-600",
  "green-i": "bg-emerald-400",
  blue: "bg-sky-500",
  purple: "bg-purple-500",
  "brown-iii": "bg-amber-800",
  "brown-ii": "bg-amber-700",
  "brown-i": "bg-amber-600",
  black: "bg-zinc-100 ring-1 ring-zinc-700",
};

export function beltStripes(beltLevels: string[]) {
  if (!beltLevels?.length) return ["bg-cyan-400"];
  return beltLevels.map((belt) => BELT_STRIPES[belt] || "bg-cyan-400");
}

export function folderBeltCategory(beltLevels: string[]) {
  if (!beltLevels?.length) return "All belts / shared";
  return beltLevels.map((belt) => BELT_LABELS[belt] || belt).join(" · ");
}

export function thumbnailUrl(youtubeId: string) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
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
