import { cookies } from "next/headers";

import { karateBackendUrl } from "@/lib/server/backend";
import { FEETRACK_SESSION_COOKIE, readFeeTrackSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeStoragePath(path: string) {
  if (!path || path.length > 300) return false;
  if (path.startsWith("/") || path.includes("\\")) return false;
  if (path.includes("..")) return false;
  return /^[A-Za-z0-9._/-]+$/.test(path);
}

export async function GET(request: Request) {
  try {
    const apiKey = process.env.FEETRACK_API_KEY;
    if (!apiKey) throw new Error("FEETRACK_API_KEY is required.");

    const cookieStore = await cookies();
    const staff = readFeeTrackSession(cookieStore.get(FEETRACK_SESSION_COOKIE)?.value);
    if (!staff) {
      return Response.json(
        { success: false, error: "FeeTrack session expired. Please sign in again." },
        { status: 401 },
      );
    }

    const path = String(new URL(request.url).searchParams.get("path") || "").trim();
    if (!isSafeStoragePath(path)) {
      return Response.json({ success: false, error: "Invalid practice photo path." }, { status: 400 });
    }

    const backendUrl = karateBackendUrl("/api/integrations/feetrack/practice-photos/preview");
    backendUrl.search = new URLSearchParams({ path, staff: JSON.stringify(staff) }).toString();

    const upstream = await fetch(backendUrl, {
      headers: { "x-feetrack-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { success: false, error: `Practice photo unavailable (${upstream.status}).` },
        { status: upstream.status || 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Practice photo unavailable." },
      { status: 500 },
    );
  }
}