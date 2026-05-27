import { cookies } from "next/headers";

import { karateBackendUrl } from "@/lib/server/backend";
import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_APPROVAL_BODY_BYTES = 10 * 1024 * 1024;

function requestTooLarge(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;

  const parsedLength = Number(contentLength);
  return Number.isFinite(parsedLength) && parsedLength > MAX_APPROVAL_BODY_BYTES;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (requestTooLarge(request)) {
      return Response.json(
        {
          success: false,
          error: `Request body exceeds ${MAX_APPROVAL_BODY_BYTES} bytes.`,
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

    const { id } = await params;
    const incoming = await request.formData();
    const outgoing = new FormData();
    outgoing.set("staff", JSON.stringify(staff));

    for (const [key, value] of incoming.entries()) {
      outgoing.set(key, value);
    }

    const response = await fetch(
      karateBackendUrl(`/api/integrations/feetrack/admissions/${encodeURIComponent(id)}/approve`),
      {
        method: "POST",
        headers: {
          "x-feetrack-api-key": apiKey,
        },
        cache: "no-store",
        body: outgoing,
      },
    );

    const data = await response.json().catch(() => null);
    return Response.json(data || { success: false, error: "Admission approval failed." }, {
      status: response.status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Admission approval failed.",
      },
      { status: 500 },
    );
  }
}
