"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <div className="min-h-screen flex items-center justify-center px-[16px] text-[color:var(--color-text)]">
        <div className="flex flex-col items-center gap-[16px]">
          <div className="select-none text-center">
            <div className="font-display bg-gradient-to-r from-[var(--accent-text)] to-[var(--accent-2)] bg-clip-text text-[22px] leading-[24px] font-bold tracking-[-0.04em] text-transparent">
              SKF
            </div>
            <div className="mt-[2px] text-[12px] font-semibold uppercase tracking-[0.32em] text-[color:var(--text-2)]">
              Karate
            </div>
          </div>
          <Loader2 className="h-[20px] w-[20px] animate-spin text-[color:var(--color-text-dim)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-[16px] relative">
      <div className="w-full max-w-[340px] z-10">

        {/* Header */}
        <div className="mb-[40px] flex flex-col items-center text-center animate-fade-in">
          <div className="select-none">
            <div className="font-display bg-gradient-to-r from-[var(--accent-text)] to-[var(--accent-2)] bg-clip-text text-[44px] leading-[44px] font-bold tracking-[-0.045em] text-transparent">
              SKF
            </div>
            <div className="mt-[6px] text-[12px] font-semibold uppercase tracking-[0.32em] text-[color:var(--text-2)]">
              Karate
            </div>
            <div className="mx-auto mt-[16px] h-px w-[64px] bg-gradient-to-r from-transparent via-[var(--accent-text)] to-transparent" />
          </div>
          <h1 className="font-display mt-[20px] text-[20px] leading-[26px] font-semibold text-[color:var(--color-text)]">
            FeeTrack Treasury
          </h1>
          <p className="mt-[4px] text-sm text-[color:var(--color-text-dim)]">Sign in to manage operations</p>
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
              style={{ fontSize: 16 }}
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
              style={{ fontSize: 16 }}
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
          <p className="text-[12px] uppercase tracking-widest text-[color:var(--color-text-faint)]">
            Internal Secure System
          </p>
        </div>

      </div>
    </div>
  );
}
