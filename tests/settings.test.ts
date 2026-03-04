import { describe, it } from "node:test";
import assert from "node:assert";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { systemSettings } from "@/db/schema";
import { isFeatureEnabled, clearSettingsCache } from "@/lib/config/features";

describe("System Settings", () => {
  it("should have feature flags seeded in database", async () => {
    const db = getDb();
    const settings = await db.select().from(systemSettings);

    assert.ok(settings.length >= 3, "Should have at least 3 settings seeded");

    const featureKeys = settings.map((s) => s.key);
    assert.ok(featureKeys.includes("FEATURE_EVENT_SIGNUPS"), "Should have FEATURE_EVENT_SIGNUPS");
    assert.ok(featureKeys.includes("FEATURE_DUES"), "Should have FEATURE_DUES");
    assert.ok(featureKeys.includes("FEATURE_PUBLIC_DIRECTORY"), "Should have FEATURE_PUBLIC_DIRECTORY");
  });

  it("should read feature flags from database", async () => {
    const isEnabled = await isFeatureEnabled("FEATURE_EVENT_SIGNUPS");
    assert.strictEqual(typeof isEnabled, "boolean", "Should return a boolean");
  });

  it("should return true for enabled features", async () => {
    const db = getDb();
    
    await db
      .update(systemSettings)
      .set({ value: "true" })
      .where(eq(systemSettings.key, "FEATURE_EVENT_SIGNUPS"));

    clearSettingsCache();
    const isEnabled = await isFeatureEnabled("FEATURE_EVENT_SIGNUPS");
    assert.strictEqual(isEnabled, true, "Should return true when set to 'true'");
  });

  it("should return false for disabled features", async () => {
    const db = getDb();
    
    await db
      .update(systemSettings)
      .set({ value: "false" })
      .where(eq(systemSettings.key, "FEATURE_DUES"));

    clearSettingsCache();
    const isEnabled = await isFeatureEnabled("FEATURE_DUES");
    assert.strictEqual(isEnabled, false, "Should return false when set to 'false'");

    await db
      .update(systemSettings)
      .set({ value: "true" })
      .where(eq(systemSettings.key, "FEATURE_DUES"));
    clearSettingsCache();
  });
});
