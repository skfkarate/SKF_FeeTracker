"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
    clearFeeTrackSessionStorage,
    getStoredFeeTrackUser,
} from "@/lib/client-auth";

export default function NavMenu() {
    const router = useRouter();
    const [user] = useState<string | null>(() => getStoredFeeTrackUser());

    const handleLogout = async () => {
        await fetch("/api/feetrack/auth/logout", { method: "POST" }).catch(() => null);
        clearFeeTrackSessionStorage();
        router.replace("/");
    };

    if (!user) return null;

    return (
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="text-xs font-medium text-zinc-400 capitalize">{user}</span>
            </div>
            
            <button
                onClick={handleLogout}
                className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Logout"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
    );
}
