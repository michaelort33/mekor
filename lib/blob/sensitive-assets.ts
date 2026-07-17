/**
 * Form inquiry exports contain personal contact data and must never be
 * published to public Vercel Blob or linked from the repo.
 */
export const SENSITIVE_PUBLIC_BLOB_URLS = [
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/d39c0c0706199c6f94763bb5715ca89ef021d7cf-home-contact-form.csv",
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/0f2bc13599345570d1af0cd0b3beb7cc97c0115f-kosher-inquiry.csv",
] as const;

export const SENSITIVE_BLOB_KEYS = [
  "mekor/d39c0c0706199c6f94763bb5715ca89ef021d7cf-home-contact-form.csv",
  "mekor/0f2bc13599345570d1af0cd0b3beb7cc97c0115f-kosher-inquiry.csv",
] as const;

const SENSITIVE_PATH_MARKERS = [
  "forms inquiries csv",
  "home contact form.csv",
  "kosher inquiry.csv",
  "home-contact-form.csv",
  "kosher-inquiry.csv",
] as const;

export function isSensitiveFormInquiryAsset(source: string): boolean {
  const normalized = source.trim().toLowerCase().replace(/\\/g, "/");
  if (SENSITIVE_PUBLIC_BLOB_URLS.some((url) => normalized.includes(url.toLowerCase()))) {
    return true;
  }
  if (SENSITIVE_BLOB_KEYS.some((key) => normalized.includes(key.toLowerCase()))) {
    return true;
  }
  return SENSITIVE_PATH_MARKERS.some((marker) => normalized.includes(marker));
}
