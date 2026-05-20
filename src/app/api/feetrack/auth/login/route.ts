import { cookies } from "next/headers";

import {
  createFeeTrackSession,
  FEETRACK_SESSION_COOKIE,
  type FeeTrackStaff,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || body.accessCode || "").trim().toLowerCase();

    if (username !== "krish" && username !== "usha") {
      return Response.json(
        { success: false, error: "Invalid access code." },
        { status: 401 },
      );
    }

    const staff: FeeTrackStaff = {
      id: username,
      name: username === "krish" ? "Krish" : "Usha",
      role: "admin",
      branchScope: "all",
    };

    const cookieStore = await cookies();
    cookieStore.set(FEETRACK_SESSION_COOKIE, createFeeTrackSession(staff), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    return Response.json({
      success: true,
      user: staff.name,
      role: staff.role,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Login failed.",
      },
      { status: 401 },
    );
  }
}
