import { cookies } from "next/headers";

import { FEETRACK_SESSION_COOKIE } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(FEETRACK_SESSION_COOKIE);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 },
    );
  }
}
