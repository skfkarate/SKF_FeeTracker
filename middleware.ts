import { NextResponse, type NextRequest } from "next/server";

function buildContentSecurityPolicy() {
  // Next.js 16/Turbopack doesn't propagate nonces to inline RSC scripts yet,
  // so we use 'unsafe-inline' as a pragmatic fallback for this internal tool.
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];
  const styleSrcElem = ["'self'", "'unsafe-inline'"];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src-elem ${styleSrcElem.join(" ")}`,
    "style-src-attr 'unsafe-inline'",
    "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://sentry.io",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const csp = buildContentSecurityPolicy();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.json|.*\\..*).*)"],
};
