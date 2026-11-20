import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  HandCoins,
  Images,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavigationGroup = "Core" | "More";

export type NavigationTile = {
  key: string;
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
  group: NavigationGroup;
  primary?: boolean;
  match?: string[];
  more?: boolean;
};

/**
 * Single source of truth for the ten destinations. Bottom tabs, the desktop
 * rail and the More sheet derive from this list; there is no hamburger drawer.
 */
export const DESTINATION_TILES: NavigationTile[] = [
  {
    key: "today",
    href: "/dashboard",
    label: "Today",
    title: "Today",
    description: "Collections, branches and priority work",
    icon: CalendarDays,
    group: "Core",
    primary: true,
    match: ["/dashboard"],
  },
  {
    key: "fees",
    href: "/pending-fees",
    label: "Fees",
    title: "Fees",
    description: "Monthly dues, reminders and calls",
    icon: HandCoins,
    group: "Core",
    primary: true,
    match: ["/pending-fees", "/students", "/messages", "/referrals"],
  },
  {
    key: "people",
    href: "/admissions",
    label: "People",
    title: "People",
    description: "Admissions and athlete records",
    icon: Users,
    group: "Core",
    primary: true,
    match: ["/admissions", "/profile-photos"],
  },
  {
    key: "money",
    href: "/finances",
    label: "Money",
    title: "Money",
    description: "Master ledger and fund position",
    icon: Wallet,
    group: "Core",
    primary: true,
    match: ["/finances", "/development", "/analytics", "/custom"],
  },
  {
    key: "events",
    href: "/events",
    label: "Events",
    title: "Events",
    description: "Workflow, fees and results",
    icon: CalendarRange,
    group: "More",
    more: true,
  },
  {
    key: "media",
    href: "/gallery",
    label: "Media",
    title: "Media",
    description: "Practice library and gallery",
    icon: Images,
    group: "More",
    more: true,
  },
  {
    key: "shop",
    href: "/shop",
    label: "Shop",
    title: "Shop",
    description: "Products, stock and orders",
    icon: ShoppingBag,
    group: "More",
    more: true,
  },
  {
    key: "insights",
    href: "/website-analytics",
    label: "Insights",
    title: "Insights",
    description: "Website and practice analytics",
    icon: BarChart3,
    group: "More",
    more: true,
  },
  {
    key: "settings",
    href: "/timetable",
    label: "Settings",
    title: "Settings",
    description: "Timetable and branch config",
    icon: Settings2,
    group: "More",
    more: true,
  },
  {
    key: "custom",
    href: "/custom",
    label: "Custom Ops",
    title: "Custom Ops",
    description: "Year ledger and manual entries",
    icon: SlidersHorizontal,
    group: "More",
    more: true,
  },
];

export const PRIMARY_TILES = DESTINATION_TILES.filter((tile) => tile.primary);
export const MORE_TILES = DESTINATION_TILES.filter((tile) => tile.more);
export const DESTINATION_GROUPS: Array<{ title: NavigationGroup; tiles: NavigationTile[] }> = [
  { title: "Core", tiles: DESTINATION_TILES.filter((tile) => tile.group === "Core") },
  { title: "More", tiles: DESTINATION_TILES.filter((tile) => tile.group === "More") },
];
