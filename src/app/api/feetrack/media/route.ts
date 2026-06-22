import { karateBackendUrl } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MEDIA_PREFIXES = [
  "/gallery/",
  "/timetables/",
  "/Shop/",
  "/shop/",
  "/products/",
  "/images/",
  "/uploads/",
  "/no-profile/",
  "/logo/",
  "/icons/",
  "/og-",
  "/scanner-to-pay",
];

function isAllowedMediaPath(path: string) {
  return ALLOWED_MEDIA_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const path = String(requestUrl.searchParams.get("path") || "").trim();

    if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || !isAllowedMediaPath(path)) {
      return Response.json({ success: false, error: "Invalid media path." }, { status: 400 });
    }

    const backendUrl = karateBackendUrl(path);
    const response = await fetch(backendUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok || !response.body) {
      return Response.json(
        { success: false, error: `Media unavailable (${response.status}).` },
        { status: response.status || 502 },
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Media unavailable.",
      },
      { status: 500 },
    );
  }
}
