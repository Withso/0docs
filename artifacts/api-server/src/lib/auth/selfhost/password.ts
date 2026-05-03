import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;
const SALT_LEN = 16;

// Stored format: scrypt$<salt-hex>$<hash-hex>
const PREFIX = "scrypt$";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `${PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!stored.startsWith(PREFIX)) return false;
  const [saltHex, hashHex] = stored.slice(PREFIX.length).split("$");
  if (!saltHex || !hashHex) return false;
  let salt: Buffer;
  let hash: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    hash = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (hash.length !== KEY_LEN) return false;
  const candidate = await scrypt(password, salt, KEY_LEN);
  return timingSafeEqual(candidate, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 256) return "Password is too long.";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 320;
}
