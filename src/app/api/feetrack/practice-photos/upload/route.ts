import { cookies } from "next/headers";

import { karateBackendUrl } from "@/lib/server/backend";
import { FEETRACK_SESSION_COOKIE, readFeeTrackSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.FEETRACK_API_KEY;
    if (!apiKey) throw new Error("FEETRACK_API_KEY is required.");
    const cookieStore = await cookies();
    const staff = readFeeTrackSession(cookieStore.get(FEETRACK_SESSION_COOKIE)?.value);
    if (!staff) return Response.json({ success: false, error: "FeeTrack session expired. Please sign in again." }, { status: 401 });
    const incoming = await request.formData();
    const outgoing = new FormData();
    outgoing.set("staff", JSON.stringify(staff));
    for (const [key, value] of incoming.entries()) outgoing.set(key, value);
    const response = await fetch(karateBackendUrl("/api/integrations/feetrack/practice-photos/upload"), {
      method: "POST", headers: { "x-feetrack-api-key": apiKey }, cache: "no-store", body: outgoing, signal: AbortSignal.timeout(25_000),
    });
    return Response.json(await response.json().catch(() => ({ success: false, error: "Practice photo upload failed." })), { status: response.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Practice photo upload failed." }, { status: 500 });
  }
}
