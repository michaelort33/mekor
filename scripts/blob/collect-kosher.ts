import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import fs from "node:fs/promises";
import { getManagedKosherPlaces } from "@/lib/kosher/store";

async function main() {
  const places = (await getManagedKosherPlaces()) as Array<{ heroImage?: string }>;
  const urls = new Set<string>();
  for (const p of places) {
    const h = p.heroImage || "";
    if (h.includes("static.wixstatic.com")) urls.add(h);
  }
  await fs.writeFile("/tmp/kosher_wix.json", JSON.stringify([...urls], null, 2));
  console.log("kosher places:", places.length, "| unmapped wixstatic hero URLs:", urls.size);
}
main().catch((e) => { console.error(e); process.exit(1); });
