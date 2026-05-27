import { cookies } from "next/headers";

import { callKarateBackend } from "@/lib/server/backend";
import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdmissionPhotoResponse = {
  success: boolean;
  data?: {
    application?: {
      id?: string;
      studentName?: string;
      approvedSkfId?: string;
      finalPhotoUrl?: string;
      status?: string;
    };
  };
};

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "athlete-profile-photo";
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) return "jpg";
  return "jpg";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const cookieStore = await cookies();
    const staff = readFeeTrackSession(cookieStore.get(FEETRACK_SESSION_COOKIE)?.value);
    if (!staff) {
      return Response.json({ success: false, error: "Session expired." }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const applicationId = String(params.id || "").trim();
    if (!applicationId) {
      return Response.json(
        { success: false, error: "Admission application ID is required." },
        { status: 400 },
      );
    }

    const result = await callKarateBackend<AdmissionPhotoResponse>({
      action: "get_admission_application",
      applicationId,
      staff,
    });
    const application = result.data?.application;
    const photoUrl = String(application?.finalPhotoUrl || "").trim();

    if (application?.status !== "approved" || !photoUrl) {
      return Response.json(
        { success: false, error: "Approved athlete profile photo is not available." },
        { status: 404 },
      );
    }

    const photoResponse = await fetch(photoUrl, { cache: "no-store" });
    if (!photoResponse.ok || !photoResponse.body) {
      return Response.json(
        { success: false, error: "Athlete profile photo could not be downloaded." },
        { status: photoResponse.status || 502 },
      );
    }

    const contentType = photoResponse.headers.get("Content-Type") || "image/jpeg";
    const filenameBase = safeFilename(
      application.approvedSkfId || application.studentName || application.id || "athlete-profile-photo",
    );
    const filename = `${filenameBase}-profile-photo.${extensionForContentType(contentType)}`;

    return new Response(photoResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Athlete profile photo download failed.",
      },
      { status: 500 },
    );
  }
}
