import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("global anchor color inherit stays in @layer base so CTA colors can win", async () => {
  const globalsCss = await readTextFile("app/globals.css");
  const inheritPattern = /a:not\(\[data-slot="button"\]\)\s*\{\s*color:\s*inherit;/g;
  const matches = [...globalsCss.matchAll(inheritPattern)];

  assert.equal(matches.length, 1, "expected exactly one global anchor inherit rule");

  const index = matches[0]?.index ?? -1;
  assert.ok(index >= 0);
  const preceding = globalsCss.slice(Math.max(0, index - 240), index);
  assert.match(
    preceding,
    /@layer\s+base/,
    "anchor color:inherit must live inside @layer base (unlayered inherit causes dark-on-dark CTAs)",
  );
});

test("known dark CTA link styles still declare light text colors", async () => {
  const files: Array<{ path: string; selectors: RegExp[] }> = [
    {
      path: "app/page.module.css",
      selectors: [
        /\.bulletinCta\s*\{[\s\S]*?color:\s*#fff/,
        /\.eventsMore\s*\{[\s\S]*?color:\s*#fff/,
        /\.footerArchive\s*\{[\s\S]*?color:\s*#fff/,
      ],
    },
    {
      path: "app/membership/page.module.css",
      selectors: [/\.actionButton\s*\{[\s\S]*?color:\s*#f8fbff/],
    },
    {
      path: "app/membership/apply/page.module.css",
      selectors: [/\.primaryAction[\s\S]*?\{[\s\S]*?color:\s*#fff/],
    },
    {
      path: "components/newsletters/newsletter-article.module.css",
      selectors: [/\.button\s*\{[\s\S]*?color:\s*#fff/],
    },
    {
      path: "app/admin/templates/page.module.css",
      selectors: [/\.createButton\s*\{[\s\S]*?color:\s*#ffffff/],
    },
    {
      path: "components/backend/ui/button.module.css",
      selectors: [
        /\.primary\s*\{[\s\S]*?color:\s*var\(--bk-accent-fg\)/,
        /\.danger\s*\{[\s\S]*?color:\s*var\(--bk-text-inverse\)/,
      ],
    },
    {
      path: "components/navigation/area-switcher.module.css",
      selectors: [/\.linkCurrent[\s\S]*?color:\s*#f7fbff\s*!important/],
    },
  ];

  for (const file of files) {
    const css = await readTextFile(file.path);
    for (const selector of file.selectors) {
      assert.match(css, selector, `Expected light text color in ${file.path}`);
    }
  }
});
