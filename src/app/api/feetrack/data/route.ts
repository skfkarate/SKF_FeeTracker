import { cookies } from "next/headers";

import { callKarateBackend, KarateBackendError } from "@/lib/server/backend";
import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const staff = readFeeTrackSession(cookieStore.get(FEETRACK_SESSION_COOKIE)?.value);

    if (!staff) {
      return Response.json(
        { success: false, error: "FeeTrack session expired. Please sign in again." },
        { status: 401 },
      );
    }

    const data = await callKarateBackend(
      {
        ...body,
        staff,
      },
    );

    return Response.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof KarateBackendError ? error.status : 500;

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "FeeTrack request failed.",
        code: error instanceof KarateBackendError ? error.code : undefined,
        details: error instanceof KarateBackendError ? error.details : undefined,
      },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
