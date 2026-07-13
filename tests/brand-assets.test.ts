import assert from "node:assert";
import { describe, it } from "node:test";

import { BRAND_ASSET_CATALOG, BRAND_ASSETS } from "@/lib/brand-assets";

describe("Mekor brand assets", () => {
  it("publishes the complete asset set from the dedicated Blob release", () => {
    assert.strictEqual(BRAND_ASSET_CATALOG.length, 9);
    assert.ok(
      BRAND_ASSET_CATALOG.every((asset) =>
        asset.url.startsWith("https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/brand/2026-07-13/"),
      ),
    );
  });

  it("uses the high-resolution wordmark and icon-only favicon assets", () => {
    assert.match(BRAND_ASSETS.primaryWordmark.filename, /2328x480/);
    assert.match(BRAND_ASSETS.faviconIco.filename, /favicon\.ico$/);
    assert.match(BRAND_ASSETS.faviconPng.filename, /favicon-512\.png$/);
  });
});
