import { cookies } from "next/headers";

import { karateBackendUrl } from "@/lib/server/backend";
import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROFILE_PHOTO_BODY_BYTES = 8 * 1024 * 1024;

function requestTooLarge(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;

  const parsedLength = Number(contentLength);
  return Number.isFinite(parsedLength) && parsedLength > MAX_PROFILE_PHOTO_BODY_BYTES;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ skfId: string }> | { skfId: string } },
) {
  try {
    if (requestTooLarge(request)) {
      return Response.json(
        {
          success: false,
          error: `Request body exceeds ${MAX_PROFILE_PHOTO_BODY_BYTES} bytes.`,
          code: "REQUEST_TOO_LARGE",
        },
        { status: 413 },
      );
    }

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

    const params = await Promise.resolve(context.params);
    const skfId = String(params.skfId || "").trim();
    if (!skfId) {
      return Response.json(
        { success: false, error: "SKF ID is required." },
        { status: 400 },
      );
    }

    const incoming = await request.formData();
    const photo = incoming.get("photo");
    const outgoing = new FormData();
    outgoing.set("staff", JSON.stringify(staff));
    outgoing.set("skfId", skfId);

    if (photo) {
      outgoing.set("photo", photo);
    }

    const response = await fetch(
      karateBackendUrl("/api/integrations/feetrack/profile-photo"),
      {
        method: "POST",
        headers: {
          "x-feetrack-api-key": apiKey,
        },
        cache: "no-store",
        body: outgoing,
        signal: AbortSignal.timeout(20_000),
      },
    );

    const data = await response.json().catch(() => null);
    return Response.json(data || { success: false, error: "Profile photo upload failed." }, {
      status: response.status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message =
      name === "AbortError" || name === "TimeoutError"
        ? "Profile photo upload timed out. Please retry."
        : error instanceof Error
          ? error.message
          : "Profile photo upload failed.";

    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
