import path from "node:path";

export const SITE_URL = "https://www.mekorhabracha.org";
export const MIRROR_DATA_DIR = path.join(process.cwd(), "mirror-data");

export const ROUTES_DIR = path.join(MIRROR_DATA_DIR, "routes");
export const CONTENT_DIR = path.join(MIRROR_DATA_DIR, "content");
export const SEO_DIR = path.join(MIRROR_DATA_DIR, "seo");
export const SEARCH_DIR = path.join(MIRROR_DATA_DIR, "search");
export const ASSETS_DIR = path.join(MIRROR_DATA_DIR, "assets");
