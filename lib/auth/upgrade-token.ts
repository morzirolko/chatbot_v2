import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const UPGRADE_TOKEN_VERSION = "v1";
const UPGRADE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

interface UpgradeTokenPayload {
  purpose: "anonymous-upgrade";
  sourceUserId: string;
  exp: number;
}

export class InvalidUpgradeTokenError extends Error {
  constructor(message = "Invalid upgrade token.") {
    super(message);
    this.name = "InvalidUpgradeTokenError";
  }
}

function getUpgradeTokenSecret() {
  const secret =
    process.env.AUTH_UPGRADE_TOKEN_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing upgrade token secret.");
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getUpgradeTokenSecret())
    .update(`${UPGRADE_TOKEN_VERSION}.${encodedPayload}`)
    .digest("base64url");
}

export function createAnonymousUpgradeToken(sourceUserId: string) {
  const payload: UpgradeTokenPayload = {
    purpose: "anonymous-upgrade",
    sourceUserId,
    exp: Math.floor(Date.now() / 1000) + UPGRADE_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${UPGRADE_TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifyAnonymousUpgradeToken(token: string) {
  const [version, encodedPayload, signature] = token.split(".");

  if (
    !version ||
    !encodedPayload ||
    !signature ||
    version !== UPGRADE_TOKEN_VERSION
  ) {
    throw new InvalidUpgradeTokenError();
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedSignature = Buffer.from(signature, "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    throw new InvalidUpgradeTokenError();
  }

  const payload = JSON.parse(
    decodeBase64Url(encodedPayload),
  ) as UpgradeTokenPayload;

  if (
    payload.purpose !== "anonymous-upgrade" ||
    !payload.sourceUserId ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    throw new InvalidUpgradeTokenError("Upgrade token expired or invalid.");
  }

  return payload;
}
