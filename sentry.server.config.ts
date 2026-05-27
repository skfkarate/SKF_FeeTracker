import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "NetworkError",
    "Load failed",
    "Failed to fetch",
  ],
});
