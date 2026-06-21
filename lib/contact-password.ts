import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 32;
const HASH_PREFIX = "scrypt";

export async function hashContactPassword(password: string): Promise<string> {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error("Password is required.");
  }

  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(trimmed, salt, KEY_LENGTH)) as Buffer;
  return `${HASH_PREFIX}$${salt}$${key.toString("base64url")}`;
}

export async function verifyContactPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  const trimmed = password.trim();
  if (!trimmed || !storedHash) return false;

  const [prefix, salt, expectedKey] = storedHash.split("$");
  if (prefix !== HASH_PREFIX || !salt || !expectedKey) return false;

  try {
    const expected = Buffer.from(expectedKey, "base64url");
    const actual = (await scrypt(trimmed, salt, expected.length)) as Buffer;
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
