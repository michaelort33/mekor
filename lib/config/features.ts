import { getDb } from "@/db/client";
import { systemSettings } from "@/db/schema";

type FeatureName = "FEATURE_DUES" | "FEATURE_EVENT_SIGNUPS" | "FEATURE_PUBLIC_DIRECTORY";

let settingsCache: Map<string, string> | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5000;

async function getSettingsFromDb(): Promise<Map<string, string>> {
  const now = Date.now();
  if (settingsCache && now - lastCacheTime < CACHE_TTL) {
    return settingsCache;
  }

  const db = getDb();
  const settings = await db.select().from(systemSettings);
  settingsCache = new Map(settings.map((s) => [s.key, s.value]));
  lastCacheTime = now;
  return settingsCache;
}

export function clearSettingsCache() {
  settingsCache = null;
  lastCacheTime = 0;
}

export async function isFeatureEnabled(name: FeatureName): Promise<boolean> {
  const dbSettings = await getSettingsFromDb();
  const dbValue = dbSettings.get(name);
  
  if (dbValue !== undefined) {
    return dbValue === "true";
  }
  
  return process.env[name] === "true";
}

export function featureDisabledResponse(feature: FeatureName) {
  return {
    error: `${feature} is disabled`,
  };
}
