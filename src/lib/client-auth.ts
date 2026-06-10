"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FEETRACK_SESSION_TTL_MS } from "@/lib/feetrack-session";

const USER_KEY = "skf_user";
const LOGIN_TIME_KEY = "skf_login_time";

type SessionResponse = {
  authenticated?: boolean;
  user?: string;
  role?: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function clearFeeTrackSessionStorage() {
  if (!canUseStorage()) return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LOGIN_TIME_KEY);
}

export function storeFeeTrackSession(user: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(USER_KEY, user.toLowerCase());
  localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
}

export function getStoredFeeTrackUser() {
  if (!canUseStorage()) return null;

  const storedUser = localStorage.getItem(USER_KEY);
  const loginTime = Number(localStorage.getItem(LOGIN_TIME_KEY) || 0);
  if (!storedUser || !Number.isFinite(loginTime)) return null;

  if (Date.now() - loginTime > FEETRACK_SESSION_TTL_MS) {
    clearFeeTrackSessionStorage();
    return null;
  }

  return storedUser;
}

export async function fetchFeeTrackSession() {
  try {
    const response = await fetch("/api/feetrack/auth/session", {
      cache: "no-store",
    });

    if (!response.ok) {
      clearFeeTrackSessionStorage();
      return null;
    }

    const data = (await response.json()) as SessionResponse;
    if (!data.authenticated || !data.user) {
      clearFeeTrackSessionStorage();
      return null;
    }

    storeFeeTrackSession(String(data.user));
    return {
      user: String(data.user).toLowerCase(),
      role: data.role || "",
    };
  } catch {
    clearFeeTrackSessionStorage();
    return null;
  }
}

export function useFeeTrackAuth() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const storedUser = getStoredFeeTrackUser();
    if (storedUser) setUser(storedUser);

    async function checkSession() {
      const session = await fetchFeeTrackSession();
      if (!active) return;

      if (!session) {
        setUser(null);
        setChecking(false);
        router.replace("/");
        return;
      }

      setUser(session.user);
      setChecking(false);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  return { user, checking };
}
