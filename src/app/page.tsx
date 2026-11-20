"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { fetchFeeTrackSession, storeFeeTrackSession } from "@/lib/client-auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetchFeeTrackSession().then((session) => {
      if (active && session) router.replace("/dashboard");
      if (active && !session) setCheckingSession(false);
    }).catch(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/feetrack/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Invalid credentials");
      storeFeeTrackSession(String(data.user || "staff"));
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-well)] px-[16px] text-[color:var(--color-text)]">
        <div className="flex flex-col items-center gap-[16px]">
          <Image
            src="/logo.png"
            alt="SKF Logo"
            width={44}
            height={44}
            priority
            className="rounded-full opacity-90"
          />
          <Loader2 className="h-[20px] w-[20px] animate-spin text-[color:var(--color-text-dim)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-[16px] bg-[color:var(--color-base)] relative">
      <div className="w-full max-w-[340px] z-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-[40px] animate-fade-in">
          <Image
            src="/logo.png"
            alt="SKF Logo"
            width={48}
            height={48}
            priority
            className="rounded-full mb-[24px] opacity-90"
          />
          <h1 className="font-sans text-2xl font-medium tracking-tight text-[color:var(--color-text)] mb-[4px]">
            SKF Treasury
          </h1>
          <p className="text-[color:var(--color-text-dim)] text-sm">Sign in to manage operations</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-[16px] animate-slide-up delay-100">
          <div>
            <label htmlFor="feetrack-username" className="block text-xs font-medium text-[color:var(--color-text-dim)] mb-[8px] uppercase tracking-widest text-center">
              Username
            </label>
            <input
              id="feetrack-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder=""
              className="input-minimal text-center font-sans text-lg"
              autoCapitalize="none"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="feetrack-password" className="block text-xs font-medium text-[color:var(--color-text-dim)] mb-[8px] uppercase tracking-widest text-center">
              Password
            </label>
            <input
              id="feetrack-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder=""
              className="input-minimal text-center font-sans text-lg"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="pt-[8px]">
              <p className="text-[color:var(--color-text-dim)] text-xs text-center">{error}</p>
            </div>
          )}

          <div className="pt-[16px]">
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn-primary w-full flex items-center justify-center gap-[8px]"
            >
              {loading ? <Loader2 className="w-[16px] h-[16px] animate-spin" /> : "Access Treasury"}
            </button>
          </div>
        </form>

        <div className="mt-[48px] text-center animate-fade-in delay-300">
          <p className="text-[color:var(--color-text-faint)] text-[10px] uppercase tracking-widest">
            Internal Secure System
          </p>
        </div>

      </div>
    </div>
  );
}
