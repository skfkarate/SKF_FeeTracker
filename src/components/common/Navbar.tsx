"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  rightContent?: ReactNode;
  className?: string;
}

export default function Navbar({
  title,
  showBack = false,
  rightContent,
  className = "",
}: NavbarProps) {
  return (
    <nav className={`surface-glass fixed inset-x-0 top-0 z-50 border-b border-[color:var(--color-hairline)] backdrop-blur-xl ${className}`}>
      <div className="content-shell flex h-[68px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack ? (
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="tap-target grid shrink-0 place-items-center rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] transition-colors hover:border-[color:var(--color-accent-border)] hover:text-[color:var(--color-text)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link href="/dashboard" className="flex min-h-11 items-center gap-2.5" aria-label="SKF dashboard">
              <Image
                src="/logo.png"
                alt="SKF"
                width={26}
                height={26}
                priority
                className="rounded-full opacity-95"
              />
              <span className="font-display text-sm font-semibold tracking-tight text-[color:var(--color-text)]">
                SKF <span className="text-[color:var(--color-accent)]">Karate</span>
              </span>
            </Link>
          )}

          {title ? (
            <>
              <div className="hidden h-4 w-px bg-[color:var(--color-hairline-strong)] sm:block" aria-hidden="true" />
              <h1 className="hidden truncate text-sm font-medium text-[color:var(--color-text-dim)] sm:block">{title}</h1>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch />
          <NotificationBell />
          {rightContent}
        </div>
      </div>
    </nav>
  );
}
