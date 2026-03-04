import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { systemSettings } from "@/db/schema";

const DEFAULT_SETTINGS = [
  {
    key: "FEATURE_EVENT_SIGNUPS",
    value: "true",
    label: "Event Signups",
    description: "Enable event registration and signup functionality",
    settingType: "boolean",
  },
  {
    key: "FEATURE_DUES",
    value: "true",
    label: "Membership Dues",
    description: "Enable membership dues and payment functionality",
    settingType: "boolean",
  },
  {
    key: "FEATURE_PUBLIC_DIRECTORY",
    value: "true",
    label: "Public Directory",
    description: "Enable public community directory",
    settingType: "boolean",
  },
];

async function seedSettings() {
  const db = getDb();

  console.log("Seeding system settings...");

  for (const setting of DEFAULT_SETTINGS) {
    const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, setting.key)).limit(1);

    if (existing) {
      console.log(`✓ Setting ${setting.key} already exists`);
      continue;
    }

    await db.insert(systemSettings).values({
      ...setting,
      updatedAt: new Date(),
    });

    console.log(`✓ Created setting ${setting.key}`);
  }

  console.log("Done!");
  process.exit(0);
}

seedSettings().catch((error) => {
  console.error("Error seeding settings:", error);
  process.exit(1);
});
