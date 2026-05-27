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
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void fetchFeeTrackSession().then((session) => {
      if (active && session) router.replace("/dashboard");
    });
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black relative">
      {/* Extremely subtle ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[340px] z-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-10 animate-fade-in">
          <Image
            src="/logo.png"
            alt="SKF Logo"
            width={48}
            height={48}
            priority
            className="rounded-full mb-6 opacity-90"
          />
          <h1 className="font-[family-name:var(--font-space)] text-2xl font-medium tracking-tight text-white mb-1">
            SKF Treasury
          </h1>
          <p className="text-zinc-500 text-sm">Sign in to manage operations</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 animate-slide-up delay-100">
          <div>
            <label htmlFor="feetrack-username" className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-widest text-center">
              Username
            </label>
            <input
              id="feetrack-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder=""
              className="input-minimal text-center font-[family-name:var(--font-space)] text-lg"
              autoCapitalize="none"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="feetrack-password" className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-widest text-center">
              Password
            </label>
            <input
              id="feetrack-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder=""
              className="input-minimal text-center font-[family-name:var(--font-space)] text-lg"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="pt-2">
              <p className="text-red-500 text-xs text-center">{error}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Treasury"}
            </button>
          </div>
        </form>

        <div className="mt-12 text-center animate-fade-in delay-300">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
            Internal Secure System
          </p>
        </div>

      </div>
    </div>
  );
}
