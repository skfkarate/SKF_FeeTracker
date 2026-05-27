"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import GlobalSearch from "./GlobalSearch";

interface NavbarProps {
    title?: string;
    showBack?: boolean;
    rightContent?: React.ReactNode;
    className?: string;
}

export default function Navbar({
    title,
    showBack = false,
    rightContent,
    className = "",
}: NavbarProps) {
    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 surface-glass ${className}`}
        >
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {showBack ? (
                        <Link
                            href="/dashboard"
                            aria-label="Back to dashboard"
                            className="w-8 h-8 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    ) : (
                        <Link href="/dashboard" className="flex min-h-11 items-center gap-3" aria-label="SKF dashboard">
                            <Image
                                src="/logo.png"
                                alt="SKF"
                                width={24}
                                height={24}
                                priority
                                className="rounded-full grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all"
                            />
                            <span className="font-[family-name:var(--font-space)] font-semibold text-sm tracking-widest text-zinc-200">
                                SKF<span className="text-zinc-600">.</span>
                            </span>
                        </Link>
                    )}

                    {title && (
                        <>
                            <div className="w-px h-4 bg-zinc-800 hidden sm:block" />
                            <h1 className="text-sm font-medium text-zinc-400 hidden sm:block">
                                {title}
                            </h1>
                        </>
                    )}
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    <GlobalSearch />
                    {rightContent}
                </div>
                
            </div>
        </nav>
    );
}
