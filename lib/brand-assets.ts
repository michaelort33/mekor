const BRAND_ASSET_BASE_URL =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/brand/2026-07-13";

function brandAsset(filename: string, alt: string, width: number, height: number) {
  return {
    filename,
    url: `${BRAND_ASSET_BASE_URL}/${filename}`,
    alt,
    width,
    height,
  };
}

type BrandAsset = ReturnType<typeof brandAsset>;

function catalogAsset(asset: BrandAsset, label: string, description: string, previewUrl = asset.url) {
  return {
    ...asset,
    label,
    description,
    previewUrl,
  };
}

export const BRAND_ASSETS = {
  primaryWordmark: brandAsset(
    "mekor-habracha-logo-rectangle-2328x480.png",
    "Mekor Habracha Center City Synagogue",
    2328,
    480,
  ),
  compactWordmark: brandAsset(
    "mekor-habracha-logo-rectangle-291x60.png",
    "Mekor Habracha Center City Synagogue",
    291,
    60,
  ),
  icon: brandAsset("mekor-habracha-icon-transparent-1024.png", "Mekor Habracha icon", 1024, 1024),
  squareIcon: brandAsset("mekor-habracha-profile-square-icon-1024.png", "Mekor Habracha icon", 1024, 1024),
  circleIcon: brandAsset("mekor-habracha-profile-circle-icon-1024.png", "Mekor Habracha icon", 1024, 1024),
  squareFullLogo: brandAsset(
    "mekor-habracha-profile-square-full-logo-1024.png",
    "Mekor Habracha Center City Synagogue",
    1024,
    1024,
  ),
  circleFullLogo: brandAsset(
    "mekor-habracha-profile-circle-full-logo-1024.png",
    "Mekor Habracha Center City Synagogue",
    1024,
    1024,
  ),
  faviconPng: brandAsset("mekor-habracha-favicon-512.png", "Mekor Habracha favicon", 512, 512),
  faviconIco: brandAsset("mekor-habracha-favicon.ico", "Mekor Habracha favicon", 256, 256),
} as const;

export const BRAND_ASSET_CATALOG = [
  catalogAsset(
    BRAND_ASSETS.primaryWordmark,
    "Primary wordmark",
    "High-resolution horizontal logo used in the site navigation.",
  ),
  catalogAsset(
    BRAND_ASSETS.compactWordmark,
    "Compact wordmark",
    "Original-size horizontal logo for constrained placements.",
  ),
  catalogAsset(BRAND_ASSETS.icon, "Transparent icon", "Icon-only mark with a transparent background."),
  catalogAsset(BRAND_ASSETS.squareIcon, "Square profile icon", "Icon-only square profile image on white."),
  catalogAsset(
    BRAND_ASSETS.circleIcon,
    "Circle profile icon",
    "Icon-only circular profile image with transparent corners.",
  ),
  catalogAsset(
    BRAND_ASSETS.squareFullLogo,
    "Square full logo",
    "Full logo composed for square profile placements.",
  ),
  catalogAsset(
    BRAND_ASSETS.circleFullLogo,
    "Circle full logo",
    "Full logo composed for circular profile placements.",
  ),
  catalogAsset(
    BRAND_ASSETS.faviconPng,
    "Favicon PNG",
    "Icon-only PNG for app icons and platforms that prefer PNG.",
  ),
  catalogAsset(
    BRAND_ASSETS.faviconIco,
    "Favicon ICO",
    "Multi-resolution icon used by browser tabs.",
    BRAND_ASSETS.faviconPng.url,
  ),
] as const;
