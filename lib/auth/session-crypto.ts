import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const SESSION_ENCRYPTION_VERSION = "v1";
const SESSION_ENCRYPTION_IV_LENGTH = 12;

function readSessionEncryptionKey() {
  const rawKey = process.env.APP_SESSION_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("Missing APP_SESSION_ENCRYPTION_KEY.");
  }

  const key = Buffer.from(rawKey, "base64url");

  if (key.length !== 32) {
    throw new Error(
      "APP_SESSION_ENCRYPTION_KEY must be a 32-byte base64url-encoded string.",
    );
  }

  return key;
}

export function encryptSessionSecret(value: string) {
  const iv = randomBytes(SESSION_ENCRYPTION_IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", readSessionEncryptionKey(), iv);
  const encryptedValue = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SESSION_ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encryptedValue.toString("base64url"),
  ].join(".");
}

export function isEncryptedSessionSecret(value: string) {
  const [version, iv, authTag, encryptedValue] = value.split(".");

  return Boolean(
    version === SESSION_ENCRYPTION_VERSION && iv && authTag && encryptedValue,
  );
}

export function decryptSessionSecret(value: string) {
  if (!isEncryptedSessionSecret(value)) {
    return value;
  }

  const [version, iv, authTag, encryptedValue] = value.split(".");

  if (!version || !iv || !authTag || !encryptedValue) {
    throw new Error("Session secret payload is malformed.");
  }

  if (version !== SESSION_ENCRYPTION_VERSION) {
    throw new Error("Session secret payload version is unsupported.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    readSessionEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
