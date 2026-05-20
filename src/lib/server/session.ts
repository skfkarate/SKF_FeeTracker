import crypto from "node:crypto";

export type FeeTrackStaff = {
  id: string;
  name: string;
  role: string;
  branchScope?: string;
};

export const FEETRACK_SESSION_COOKIE = "skf_feetrack_session";

type SessionPayload = {
  staff: FeeTrackStaff;
  exp: number;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string) {
  const padded = `${input}${"=".repeat((4 - (input.length % 4)) % 4)}`;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sessionSecret() {
  const secret = process.env.FEETRACK_SESSION_SECRET || process.env.FEETRACK_API_KEY;
  if (!secret) {
    throw new Error("FEETRACK_SESSION_SECRET or FEETRACK_API_KEY is required.");
  }
  return secret;
}

function sign(payload: string) {
  return base64url(
    crypto.createHmac("sha256", sessionSecret()).update(payload).digest()
  );
}

export function createFeeTrackSession(staff: FeeTrackStaff) {
  const payload = base64url(
    JSON.stringify({
      staff,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    } satisfies SessionPayload)
  );

  return `${payload}.${sign(payload)}`;
}

export function readFeeTrackSession(value?: string | null): FeeTrackStaff | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64url(payload).toString("utf8")) as SessionPayload;
    if (!parsed.staff?.id || !parsed.staff.role || parsed.exp < Date.now()) return null;
    return parsed.staff;
  } catch {
    return null;
  }
}
