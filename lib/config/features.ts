import { getDb } from "@/db/client";
import { systemSettings } from "@/db/schema";

type FeatureName = "FEATURE_DUES" | "FEATURE_EVENT_SIGNUPS" | "FEATURE_PUBLIC_DIRECTORY";

let settingsCache: Map<string, string> | null = null;
let lastCacheTime = 0;
let inflight: Promise<Map<string, string>> | null = null;
const CACHE_TTL = 30_000;

async function loadSettingsFromDb(): Promise<Map<string, string>> {
  const db = getDb();
  const settings = await db.select().from(systemSettings);
  return new Map(settings.map((s) => [s.key, s.value]));
}

async function getSettingsFromDb(): Promise<Map<string, string>> {
  const now = Date.now();
  if (settingsCache && now - lastCacheTime < CACHE_TTL) {
    return settingsCache;
  }
  if (inflight) {
    return inflight;
  }
  inflight = loadSettingsFromDb()
    .then((map) => {
      settingsCache = map;
      lastCacheTime = Date.now();
      return map;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function clearSettingsCache() {
  settingsCache = null;
  lastCacheTime = 0;
  inflight = null;
}

export async function prefetchFeatureFlags(): Promise<void> {
  await getSettingsFromDb();
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
