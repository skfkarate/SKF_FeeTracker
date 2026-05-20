import type { FeeTrackStaff } from "./session";

type BackendPayload = Record<string, unknown> & {
  action: string;
  staff?: FeeTrackStaff;
};

const BACKEND_TIMEOUT_MS = 6_500;

type BackendCallOptions = {
  timeoutMs?: number;
};

function backendUrl() {
  const base =
    process.env.FEETRACK_BACKEND_URL ||
    process.env.SKF_KARATE_BACKEND_URL ||
    process.env.NEXT_PUBLIC_SKF_KARATE_URL;

  if (!base) {
    throw new Error("FEETRACK_BACKEND_URL is required.");
  }

  return new URL("/api/integrations/feetrack", base);
}

export async function callKarateBackend<T>(
  payload: BackendPayload,
  options: BackendCallOptions = {},
): Promise<T> {
  const apiKey = process.env.FEETRACK_API_KEY;
  if (!apiKey) {
    throw new Error("FEETRACK_API_KEY is required.");
  }

  const url = backendUrl();
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
