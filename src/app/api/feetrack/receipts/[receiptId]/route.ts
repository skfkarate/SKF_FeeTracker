import { cookies } from "next/headers";

import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";
import { karateBackendUrl } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendReceiptUrl(receiptId: string) {
  return karateBackendUrl(`/api/integrations/feetrack/receipts/${encodeURIComponent(receiptId)}`);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ receiptId: string }> | { receiptId: string } },
) {
  try {
    const cookieStore = await cookies();
    const staff = readFeeTrackSession(cookieStore.get(FEETRACK_SESSION_COOKIE)?.value);
    if (!staff) {
      return Response.json({ success: false, error: "Session expired." }, { status: 401 });
    }

    const params = await Promise.resolve(context.params);
    const receiptId = String(params.receiptId || "").trim();
    if (!receiptId) {
      return Response.json({ success: false, error: "Receipt ID is required." }, { status: 400 });
    }

    const response = await fetch(backendReceiptUrl(receiptId), {
      headers: {
        "x-feetrack-api-key": process.env.FEETRACK_API_KEY || "",
        "x-feetrack-staff": Buffer.from(JSON.stringify(staff)).toString("base64url"),
      },
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => null);
      return Response.json(
        { success: false, error: data?.error || "Receipt not available." },
        { status: response.status || 500 },
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition": response.headers.get("Content-Disposition") || "inline",
        "Cache-Control": response.headers.get("Cache-Control") || "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Receipt failed." },
      { status: 500 },
    );
  }
}
