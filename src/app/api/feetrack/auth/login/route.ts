import { cookies } from "next/headers";

import {
  createFeeTrackSession,
  FEETRACK_SESSION_COOKIE,
  type FeeTrackStaff,
} from "@/lib/server/session";
import { callKarateBackend } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginResponse = {
  staff?: FeeTrackStaff;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return Response.json(
        { success: false, error: "Username and password are required." },
        { status: 400 },
      );
    }

    const data = await callKarateBackend<LoginResponse>({
      action: "login",
      username,
      password,
    });
    const staff = data.staff;
    if (!staff?.id || !staff.role) {
      return Response.json(
        { success: false, error: "Invalid FeeTrack credentials." },
        { status: 401 },
      );
    }

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
