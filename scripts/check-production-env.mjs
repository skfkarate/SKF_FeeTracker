import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const isProductionDeploy = process.env.VERCEL_ENV === "production";

if (!isProductionDeploy) {
  process.exit(0);
}

const errors = [];

function read(name) {
  return String(process.env[name] || "").trim();
}

function parseUrl(name, value) {
  if (!value) {
    errors.push(`${name} is required for production.`);
    return null;
  }

  try {
    return new URL(value);
  } catch {
    errors.push(`${name} must be a valid absolute URL.`);
    return null;
  }
}

function validateBackendUrl(name, value) {
  const url = parseUrl(name, value);
  if (!url) return;

  const hostname = url.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) {
    errors.push(`${name} cannot point to localhost in production.`);
  }

  if (hostname === "fees.skfkarate.org" || hostname.endsWith(".fees.skfkarate.org")) {
    errors.push(`${name} must point to the SKF-Karate app, not the FeeTrack app.`);
  }
}

validateBackendUrl("FEETRACK_BACKEND_URL", read("FEETRACK_BACKEND_URL"));

const publicKarateUrl = read("NEXT_PUBLIC_SKF_KARATE_URL");
if (publicKarateUrl) {
  validateBackendUrl("NEXT_PUBLIC_SKF_KARATE_URL", publicKarateUrl);
}

if (read("FEETRACK_API_KEY").length < 16) {
  errors.push("FEETRACK_API_KEY must be set and at least 16 characters.");
}

if (read("FEETRACK_SESSION_SECRET").length < 32) {
  errors.push("FEETRACK_SESSION_SECRET must be set and at least 32 characters.");
}

parseUrl("SENTRY_DSN", read("SENTRY_DSN"));

if (!read("SENTRY_AUTH_TOKEN")) {
  errors.push("SENTRY_AUTH_TOKEN is required for production source-map uploads.");
}

if (!read("SENTRY_ORG")) {
  errors.push("SENTRY_ORG is required for production source-map uploads.");
}

if (!read("SENTRY_PROJECT")) {
  errors.push("SENTRY_PROJECT is required for production source-map uploads.");
}

if (errors.length) {
  console.error("FeeTrack production environment is not ready:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("FeeTrack production environment looks deployable.");
