import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { decodeCursor, encodeCursor, parsePageLimit, toPaginatedResult } from "../lib/pagination/cursor";

test("parsePageLimit clamps and defaults correctly", () => {
  assert.equal(parsePageLimit(null), 25);
  assert.equal(parsePageLimit("abc"), 25);
  assert.equal(parsePageLimit("0"), 25);
  assert.equal(parsePageLimit("10"), 10);
  assert.equal(parsePageLimit("500"), 100);
});

test("cursor encoding/decoding roundtrip", () => {
  const schema = z.object({
    createdAt: z.string(),
    id: z.number(),
  });
  const raw = encodeCursor({ createdAt: "2026-03-04T00:00:00.000Z", id: 44 });
  const decoded = decodeCursor(raw, schema);

  assert.equal(decoded.error, null);
  assert.deepEqual(decoded.value, { createdAt: "2026-03-04T00:00:00.000Z", id: 44 });
});

test("invalid cursor is rejected", () => {
  const schema = z.object({ id: z.number() });
  const decoded = decodeCursor("not-a-valid-cursor", schema);
  assert.equal(decoded.error, "Invalid cursor");
  assert.equal(decoded.value, null);
});

test("toPaginatedResult returns nextCursor only when extra row exists", () => {
  const rows = [
    { id: 1, createdAt: "a" },
    { id: 2, createdAt: "b" },
    { id: 3, createdAt: "c" },
  ];

  const page = toPaginatedResult(rows, 2, (row) => ({ id: row.id, createdAt: row.createdAt }));
  assert.equal(page.items.length, 2);
  assert.equal(page.pageInfo.hasNextPage, true);
  assert.ok(page.pageInfo.nextCursor);
});
