import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellPath = new URL("../components/backend/shell/backend-shell.tsx", import.meta.url);
const stylesPath = new URL("../components/backend/shell/backend-shell.module.css", import.meta.url);

test("backend header stacks actions and truncates long breadcrumbs on narrow screens", async () => {
  const [shell, styles] = await Promise.all([
    readFile(shellPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(shell, /className=\{styles\.crumbItem\}/);
  assert.match(shell, /className=\{styles\.crumbLabel\} aria-current="page"/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /\.topBar \{[\s\S]*?flex-direction: column;/);
  assert.match(styles, /\.crumbItem:last-child \.crumbLabel \{[\s\S]*?text-overflow: ellipsis;/);
  assert.match(styles, /\.topActions \{[\s\S]*?grid-template-columns: repeat\(auto-fit,/);
});
