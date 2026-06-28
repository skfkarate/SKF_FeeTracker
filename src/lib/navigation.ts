import type { ComponentType } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Camera,
  Globe2,
  HandCoins,
  Images,
  LayoutGrid,
  MessageSquare,
  PiggyBank,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Video,
  Wallet,
  Medal,
} from "lucide-react";

export type NavigationTile = {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent?: string;
};

export const BRANCH_TILES: NavigationTile[] = [
  {
    href: "/students/MPSC",
    title: "MP",
    description: "M P Sports Club collections",
    icon: LayoutGrid,
  },
  {
    href: "/students/Herohalli",
    title: "Herohalli",
    description: "Herohalli branch collections",
    icon: LayoutGrid,
  },
];

const FEE_TRACK_OFFICE_TILES: NavigationTile[] = [
  {
    href: "/pending-fees",
    title: "Pending Fees",
    description: "Monthly dues, WhatsApp reminders and calls",
    icon: AlertCircle,
    accent: "group-hover:text-amber-400",
  },
  {
    href: "/finances",
    title: "Master Ledger",
    description: "Consolidated collections and receipts",
    icon: Wallet,
  },
  {
    href: "/referrals",
    title: "Student Credits",
    description: "Manage referral and achievement credits",
    icon: HandCoins,
    accent: "group-hover:text-emerald-300",
  },
  {
    href: "/admissions",
    title: "Admissions",
    description: "Approve students and billing setup",
    icon: ShieldCheck,
    accent: "group-hover:text-emerald-400",
  },
  {
    href: "/messages",
    title: "Messages",
    description: "WhatsApp reminders and message templates",
    icon: MessageSquare,
  },
];

const EVENT_TILES: NavigationTile[] = [
  {
    href: "/events",
    title: "Events & Results",
    description: "Upcoming events, belt exams and public results",
    icon: Trophy,
    accent: "group-hover:text-amber-400",
  },
  {
    href: "/notification-timeline",
    title: "Notification Timeline",
    description: "Events, birthdays, posters and update reminders",
    icon: CalendarDays,
    accent: "group-hover:text-sky-300",
  },
  {
    href: "/blackbelt",
    title: "Black Belt 2026",
    description: "Candidate progress tracking and examination grading",
    icon: Medal,
    accent: "group-hover:text-red-400",
  },
];

const ATHLETE_PORTAL_TILES: NavigationTile[] = [
  {
    href: "/profile-photos",
    title: "Profile Photos",
    description: "Athlete profile images across portal and public boards",
    icon: Camera,
    accent: "group-hover:text-cyan-300",
  },
  {
    href: "/timetable",
    title: "Timetable",
    description: "Monthly branch schedule replacement",
    icon: CalendarDays,
  },
  {
    href: "/portal-videos",
    title: "Portal Videos",
    description: "YouTube practice videos and audience rules",
    icon: Video,
    accent: "group-hover:text-red-300",
  },
];

const GALLERY_TILES: NavigationTile[] = [
  {
    href: "/gallery",
    title: "Gallery Photos",
    description: "Upload, categorize, publish and feature public gallery photos",
    icon: Images,
    accent: "group-hover:text-fuchsia-300",
  },
];

const SHOP_TILES: NavigationTile[] = [
  {
    href: "/shop",
    title: "Shop",
    description: "Products, stock, images and order status",
    icon: ShoppingBag,
    accent: "group-hover:text-emerald-300",
  },
];

const REPORT_TILES: NavigationTile[] = [
  {
    href: "/analytics",
    title: "Revenue Analytics",
    description: "Trends, health and revenue reports",
    icon: Activity,
  },
  {
    href: "/website-analytics",
    title: "Website Analytics",
    description: "Visitors, pages, sources and conversion signals",
    icon: Globe2,
    accent: "group-hover:text-cyan-300",
  },
  {
    href: "/development",
    title: "Development Fund",
    description: "Reserved capital and fund expenses",
    icon: PiggyBank,
  },
];

export const OPERATION_GROUPS: Array<{ title: string; tiles: NavigationTile[] }> = [
  {
    title: "FeeTrack Office",
    tiles: FEE_TRACK_OFFICE_TILES,
  },
  {
    title: "Events",
    tiles: EVENT_TILES,
  },
  {
    title: "Gallery",
    tiles: GALLERY_TILES,
  },
  {
    title: "Shop",
    tiles: SHOP_TILES,
  },
  {
    title: "For Athletes",
    tiles: ATHLETE_PORTAL_TILES,
  },
  {
    title: "Reports",
    tiles: REPORT_TILES,
  },
];

// The drawer mirrors SKF-Karate public sections only where FeeTrack has an
// admin-editable tool. Static public pages stay out of this menu.
export const DRAWER_GROUPS: Array<{ title: string; tiles: NavigationTile[] }> = [
  {
    title: "FeeTrack Office",
    tiles: [...BRANCH_TILES, ...FEE_TRACK_OFFICE_TILES],
  },
  {
    title: "Events",
    tiles: EVENT_TILES,
  },
  {
    title: "Gallery",
    tiles: GALLERY_TILES,
  },
  {
    title: "Shop",
    tiles: SHOP_TILES,
  },
  {
    title: "For Athletes",
    tiles: ATHLETE_PORTAL_TILES,
  },
  {
    title: "Reports",
    tiles: REPORT_TILES,
  },
];
