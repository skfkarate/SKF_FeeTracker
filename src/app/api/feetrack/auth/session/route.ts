import { cookies } from "next/headers";

import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const staff = readFeeTrackSession(cookieStore.get(FEETRACK_SESSION_COOKIE)?.value);
    if (!staff) {
      return Response.json({ authenticated: false, success: false, error: "Not authenticated" }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      success: true,
      user: staff.name || staff.id,
      role: staff.role,
    });
  } catch (error) {
    return Response.json(
      { authenticated: false, success: false, error: error instanceof Error ? error.message : "Session check failed" },
      { status: 500 },
    );
  }
}
