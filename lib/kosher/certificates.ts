export type KosherCertificateLink = {
  href: string;
  label: string;
};

type ResolveKosherCertificateInput = {
  path: string;
  title: string;
  website: string;
  supervision: string;
  sourceLinks: string[];
};

const GOLDIE_MULTI_LOCATION_CERTIFICATE_URL =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/781820cf0bafa2033af694cfdba57c79fe6b4f32-goldie-5-locations.pdf";
const CHERRY_HILL_KOSHER_ESTABLISHMENTS_URL = "https://www.yicherryhill.com/kosher-establishments";

const CERTIFICATE_OVERRIDES: Record<string, KosherCertificateLink> = {
  "/post/goldie": {
    href: GOLDIE_MULTI_LOCATION_CERTIFICATE_URL,
    label: "Certificate (PDF)",
  },
  "/post/goldie-1": {
    href: GOLDIE_MULTI_LOCATION_CERTIFICATE_URL,
    label: "Certificate (PDF)",
  },
  "/post/goldie-2": {
    href: GOLDIE_MULTI_LOCATION_CERTIFICATE_URL,
    label: "Certificate (PDF)",
  },
  "/post/goldie-3": {
    href: GOLDIE_MULTI_LOCATION_CERTIFICATE_URL,
    label: "Certificate (PDF)",
  },
  "/post/goldie-4": {
    href: GOLDIE_MULTI_LOCATION_CERTIFICATE_URL,
    label: "Certificate (PDF)",
  },
  "/post/la-chic-n-sweet": {
    href: "https://www.facebook.com/Beit-Harambam-Congragation-151373124922044/",
    label: "Certification page",
  },
  "/post/mike-s-chicken": {
    href: "https://mikeschicken.com/kashrus/",
    label: "Certification page",
  },
  "/post/primo-water-ice": {
    href: CHERRY_HILL_KOSHER_ESTABLISHMENTS_URL,
    label: "Certification page",
  },
  "/post/that-sushi-spot-lkwd-nj-lakewood": {
    href: "https://vaadhakashrus.org/listing/that-sushi-spot/",
    label: "Certification page",
  },
  "/post/the-bagel-spot": {
    href: CHERRY_HILL_KOSHER_ESTABLISHMENTS_URL,
    label: "Certification page",
  },
};

const EXCLUDED_HOSTS = new Set([
  "maps.app.goo.gl",
  "g.co",
  "chat.whatsapp.com",
  "www.instagram.com",
  "instagram.com",
  "www.youtube.com",
  "youtube.com",
  "www.facebook.com",
  "facebook.com",
  "www.tiktok.com",
  "tiktok.com",
  "order.toasttab.com",
]);

const CERTIFIER_HOST_SCORES: Record<string, number> = {
  "wxacuvlwlalejd25.public.blob.vercel-storage.com": 100,
  "keystone-k.org": 84,
  "www.keystone-k.org": 84,
  "kclkashrus.org": 84,
  "www.kclkashrus.org": 84,
  "yicherryhill.com": 82,
  "www.yicherryhill.com": 82,
  "shiva.com": 60,
  "www.shiva.com": 60,
};

function isPdfLink(href: string) {
  return /\.pdf(?:$|[?#])/i.test(href);
}

function normalizeLink(href: string) {
  const trimmed = href.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function createCertificateLabel(href: string) {
  return isPdfLink(href) ? "Certificate (PDF)" : "Certification page";
}

function scoreCertificateLink(href: string, input: ResolveKosherCertificateInput) {
  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return -1;
  }

  if (EXCLUDED_HOSTS.has(url.hostname)) {
    return -1;
  }

  if (isPdfLink(href)) {
    return 100;
  }

  const normalizedPath = `${url.hostname}${url.pathname}`.toLowerCase();
  const normalizedWebsite = input.website.toLowerCase();

  if (normalizedWebsite && href.toLowerCase().startsWith(normalizedWebsite) && /kashrus|kosher|certificate/.test(normalizedPath)) {
    return 92;
  }

  if (/kashrus|certificate/.test(normalizedPath)) {
    return 90;
  }

  if (/\/kosher(?:$|\/)/.test(url.pathname.toLowerCase())) {
    return 88;
  }

  const certifierScore = CERTIFIER_HOST_SCORES[url.hostname];
  if (certifierScore) {
    return certifierScore;
  }

  if (/supervision/i.test(input.supervision) && /kosher|kashrus/.test(normalizedPath)) {
    return 72;
  }

  return -1;
}

export function resolveKosherCertificateLink(
  input: ResolveKosherCertificateInput,
): KosherCertificateLink | null {
  const override = CERTIFICATE_OVERRIDES[input.path];
  if (override) {
    return override;
  }

  const candidates = input.sourceLinks
    .map(normalizeLink)
    .filter(Boolean)
    .map((href) => ({
      href,
      score: scoreCertificateLink(href, input),
    }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best) {
    return null;
  }

  return {
    href: best.href,
    label: createCertificateLabel(best.href),
  };
}
