import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function read(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("studio chat drawer connects SheetTitle for accessibility", async () => {
  const source = await read("app/admin/templates/[id]/studio/studio-chat-drawer.tsx");
  assert.match(source, /<SheetTitle[\s\S]*Show it in Chat/);
  assert.match(source, /<SheetDescription/);
});

test("studio send confirm uses AlertDialogTitle", async () => {
  const source = await read("app/admin/templates/[id]/studio/studio-send-bar.tsx");
  assert.match(source, /<AlertDialogTitle>Send newsletter\?<\/AlertDialogTitle>/);
  assert.match(source, /AlertDialogDescription/);
});

test("studio preview iframe is sandboxed", async () => {
  const source = await read("app/admin/templates/[id]/studio/studio-client.tsx");
  assert.match(source, /sandbox="allow-same-origin"/);
});

test("studio chat uses AI Elements-style message and tool parts", async () => {
  const source = await read("app/admin/templates/[id]/studio/studio-chat-drawer.tsx");
  assert.match(source, /@\/components\/ai-elements\/message/);
  assert.match(source, /@\/components\/ai-elements\/tool/);
  assert.match(source, /message\.parts/);
  assert.doesNotMatch(source, /message\.content\b/);
});
