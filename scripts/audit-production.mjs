#!/usr/bin/env node
/**
 * Production dependency audit gate.
 *
 * Runs `npm audit --omit=dev --json` and fails when a high or critical
 * advisory has no accepted mitigation. Advisories listed in
 * ACCEPTED_ADVISORIES are reported but do not fail the build; each entry
 * documents why the risk is accepted and when it must be reviewed again.
 */
import { spawnSync } from "node:child_process";

const ACCEPTED_ADVISORIES = new Map([
  [
    "GHSA-fc5q-39xc-vjpf",
    {
      package: "picomatch",
      reason:
        "No patched release exists yet (advisory covers <=4.0.7). The package is only reachable through Sentry's build-time bundler plugin and lint/build tooling, never from untrusted runtime input.",
      reviewBy: "2026-12-18",
    },
  ],
]);

const FAIL_SEVERITIES = new Set(["high", "critical"]);

const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});

if (audit.error) {
  console.error(`Unable to run npm audit: ${audit.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout || "{}");
} catch {
  console.error("npm audit did not return JSON.");
  console.error(audit.stdout || audit.stderr || "");
  process.exit(1);
}

if (typeof report.vulnerabilities !== "object" || report.vulnerabilities === null) {
  console.error("npm audit returned an unexpected report.");
  console.error(audit.stderr || audit.stdout || "");
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities;
const acceptedPackages = new Set();
const acceptedAdvisories = new Map();
const unresolvedPackages = new Map();

function advisoryIdFromVia(via) {
  if (!via || typeof via !== "object") return null;
  const url = typeof via.url === "string" ? via.url : "";
  const match = url.match(/GHSA-[a-z0-9-]+/i);
  return match ? match[0] : null;
}

function isAcceptedPackage(name, visiting = new Set()) {
  if (acceptedPackages.has(name)) return true;
  if (visiting.has(name)) return false;
  visiting.add(name);

  const entry = vulnerabilities[name];
  if (!entry) return false;

  const via = Array.isArray(entry.via) ? entry.via : [];
  if (via.length === 0) return false;

  let acceptedSource = false;
  for (const item of via) {
    if (typeof item === "string") {
      if (!isAcceptedPackage(item, visiting)) {
        visiting.delete(name);
        return false;
      }
      acceptedSource = true;
      continue;
    }

    const advisoryId = advisoryIdFromVia(item);
    if (!advisoryId || !ACCEPTED_ADVISORIES.has(advisoryId)) {
      visiting.delete(name);
      return false;
    }
    acceptedAdvisories.set(advisoryId, item);
    acceptedSource = true;
  }

  visiting.delete(name);
  if (!acceptedSource) return false;
  acceptedPackages.add(name);
  return true;
}

for (const [name, entry] of Object.entries(vulnerabilities)) {
  const severity = String(entry.severity || "").toLowerCase();
  if (!FAIL_SEVERITIES.has(severity)) continue;
  if (isAcceptedPackage(name)) continue;
  unresolvedPackages.set(name, entry);
}

for (const [advisoryId, config] of ACCEPTED_ADVISORIES) {
  if (!acceptedAdvisories.has(advisoryId)) continue;
  if (new Date(`${config.reviewBy}T23:59:59Z`) < new Date()) {
    console.error(
      `Accepted advisory ${advisoryId} is past its review date (${config.reviewBy}).`,
    );
    process.exit(1);
  }
}

if (acceptedAdvisories.size > 0) {
  console.log("Accepted advisories (no patched release yet):");
  for (const advisoryId of acceptedAdvisories.keys()) {
    const config = ACCEPTED_ADVISORIES.get(advisoryId);
    console.log(
      `  - ${advisoryId} (${config.package}): ${config.reason} Review by ${config.reviewBy}.`,
    );
  }
}

if (unresolvedPackages.size > 0) {
  console.error("\nUnresolved high/critical production advisories:");
  for (const [name, entry] of unresolvedPackages) {
    console.error(`  - ${name} (${entry.severity})`);
    for (const via of entry.via ?? []) {
      if (typeof via === "string") {
        console.error(`      via ${via}`);
      } else {
        console.error(
          `      ${via.title || via.name || "advisory"} ${via.url || ""}`.trim(),
        );
      }
    }
  }
  process.exit(1);
}

console.log("Production dependency audit passed.");
