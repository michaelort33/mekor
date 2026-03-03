import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function read(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proxy protects /api/admin routes", async () => {
  const source = await read("proxy.ts");
  assert.match(source, /pathname\.startsWith\("\/api\/admin"\)/);
  assert.match(source, /SESSION_COOKIE/);
});

test("admin member-ops endpoints enforce session guard", async () => {
  const routes = [
    "app/api/admin/ops/dashboard/route.ts",
    "app/api/admin/events/rsvps-export.csv/route.ts",
    "app/api/admin/households/import-csv/route.ts",
    "app/api/admin/member-connect/[id]/approve/route.ts",
    "app/api/admin/member-connect/[id]/reject/route.ts",
    "app/api/admin/member-connect/[id]/relay/route.ts",
  ];

  for (const route of routes) {
    const source = await read(route);
    assert.match(source, /ensureAdminApiSession/);
  }
});

test("admin landing redirects to operations dashboard", async () => {
  const source = await read("app/admin/page.tsx");
  assert.match(source, /redirect\("\/admin\/operations"\)/);
});
