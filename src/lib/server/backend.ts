import type { FeeTrackStaff } from "./session";

type BackendPayload = Record<string, unknown> & {
  action: string;
  staff?: FeeTrackStaff;
};

const BACKEND_TIMEOUT_MS = 6_500;
const PRODUCTION_SKF_KARATE_URL = "https://www.skfkarate.org";

type BackendCallOptions = {
  timeoutMs?: number;
};

function isLocalBackendUrl(url: URL) {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
}

function backendBaseUrl() {
  const base =
    process.env.FEETRACK_BACKEND_URL ||
    process.env.SKF_KARATE_BACKEND_URL ||
    process.env.NEXT_PUBLIC_SKF_KARATE_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_SKF_KARATE_URL : "");

  if (!base) {
    throw new Error("FEETRACK_BACKEND_URL is required.");
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`FEETRACK_BACKEND_URL is invalid: ${base}`);
  }

  if (process.env.NODE_ENV === "production" && isLocalBackendUrl(url)) {
    return new URL(PRODUCTION_SKF_KARATE_URL);
  }

  return url;
}

export function karateBackendUrl(path: string) {
  return new URL(path, backendBaseUrl());
}

export async function callKarateBackend<T>(
  payload: BackendPayload,
  options: BackendCallOptions = {},
): Promise<T> {
  const apiKey = process.env.FEETRACK_API_KEY;
  if (!apiKey) {
    throw new Error("FEETRACK_API_KEY is required.");
  }

  const url = karateBackendUrl("/api/integrations/feetrack");
  const timeoutMs = options.timeoutMs || BACKEND_TIMEOUT_MS;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-feetrack-api-key": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      throw new Error(
        `FeeTrack backend timed out at ${url.origin}. Check that SKF-Karate is running and FEETRACK_BACKEND_URL is correct.`,
      );
    }

    throw new Error(
      `FeeTrack backend is unreachable at ${url.origin}. Start the SKF-Karate backend or update FEETRACK_BACKEND_URL.`,
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    if (response.status === 404) {
      throw new Error(
        `FeeTrack backend endpoint was not found at ${url.origin}. Set FEETRACK_BACKEND_URL to the SKF-Karate app, not the FeeTrack app.`,
      );
    }

    throw new Error(data?.error || `Backend request failed (${response.status}).`);
  }

  return data as T;
}
