import { karateBackendUrl } from "@/lib/server/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = karateBackendUrl("/api/integrations/feetrack");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const data = await response.json().catch(() => null);
    const configured = Boolean(data?.configured);
    const healthy = response.ok && Boolean(data?.success) && configured;

    return Response.json(
      {
        success: healthy,
        backend: {
          origin: url.origin,
          endpoint: url.pathname,
          status: response.status,
          reachable: response.ok,
          configured,
          features: data?.features || {},
        },
        deployment: {
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
          commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
          id: process.env.VERCEL_DEPLOYMENT_ID || null,
          region: process.env.VERCEL_REGION || null,
        },
        error: healthy
          ? undefined
          : "SKF-Karate FeeTrack backend is not deployed or FEETRACK_API_KEY is missing there.",
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        backend: {
          origin: url.origin,
          endpoint: url.pathname,
          reachable: false,
        },
        deployment: {
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
          commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
          id: process.env.VERCEL_DEPLOYMENT_ID || null,
          region: process.env.VERCEL_REGION || null,
        },
        error: error instanceof Error ? error.message : "FeeTrack backend health check failed.",
      },
      { status: 503 },
    );
  }
}
