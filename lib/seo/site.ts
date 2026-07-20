import { BRAND_ASSETS } from "@/lib/brand-assets";

export const SITE_URL = "https://www.mekorhabracha.org";
export const SITE_NAME = "Mekor Habracha";
export const SITE_ALTERNATE_NAME = "Center City Synagogue";
export const SITE_DESCRIPTION =
  "Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community in the heart of Center City, Philadelphia.";
export const DEFAULT_SOCIAL_IMAGE =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/c2c6235de9c6d719cd098e19d77b7f21c18899f1-11062b_8135b27108d04d2a97adc750a341fb79-mv2.jpeg";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORGANIZATION_LOGO = BRAND_ASSETS.squareFullLogo.url;

export function absoluteSiteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SITE_URL).toString();
}
