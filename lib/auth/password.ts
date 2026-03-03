import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const SCRYPT_KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const USER_PASSWORD_MIN_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;

  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}
