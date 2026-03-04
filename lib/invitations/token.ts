import { createHash, randomBytes } from "node:crypto";

export const INVITATION_TTL_HOURS = 72;

export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiryFromNow() {
  return new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
}
