import { createHash, createPublicKey, verify } from "node:crypto";

export function verifySendGridEventSignature(input: {
  payload: string;
  timestamp: string;
  signature: string;
  publicKey: string;
}) {
  if (!input.payload || !input.timestamp || !input.signature || !input.publicKey) return false;
  const key = input.publicKey.includes("BEGIN PUBLIC KEY")
    ? createPublicKey(input.publicKey)
    : createPublicKey({ key: Buffer.from(input.publicKey, "base64"), format: "der", type: "spki" });
  return verify(
    "sha256",
    Buffer.from(`${input.timestamp}${input.payload}`),
    key,
    Buffer.from(input.signature, "base64"),
  );
}

export function sendGridEventKey(event: Record<string, unknown>) {
  if (typeof event.sg_event_id === "string" && event.sg_event_id) return event.sg_event_id;
  return createHash("sha256").update(JSON.stringify(event)).digest("hex");
}
