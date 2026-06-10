import { karateBackendUrl } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ skfId: string }> | { skfId: string } },
) {
  try {
    const params = await Promise.resolve(context.params);
    const skfId = String(params.skfId || "").trim();
    if (!skfId) {
      return Response.json({ success: false, error: "SKF ID is required." }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const backendUrl = karateBackendUrl(`/api/profile-photos/${encodeURIComponent(skfId)}`);
    const gender = requestUrl.searchParams.get("gender");
    if (gender) backendUrl.searchParams.set("gender", gender);

    const response = await fetch(backendUrl, { cache: "no-store" });
    if (!response.ok) {
      return Response.json(
        { success: false, error: `Profile photo unavailable (${response.status}).` },
        { status: response.status },
      );
    }

    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": response.headers.get("Content-Type") || "image/png",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Profile photo unavailable.",
      },
      { status: 500 },
    );
  }
}
