import { z } from "zod";

import type { DocumentType } from "@/lib/mirror/types";

export type NativeTemplateType =
  | "events-hub"
  | "in-the-news-directory"
  | "kosher-directory"
  | "search-page";

export type NativeRoutePath =
  | "/events"
  | "/in-the-news"
  | "/center-city"
  | "/cherry-hill"
  | "/main-line-manyunk"
  | "/old-yorkroad-northeast"
  | "/search";

export type NativeContractMatrixRow = {
  routePath: NativeRoutePath;
  templateType: NativeTemplateType;
  viewModel: string;
  dataSource: string;
  requiresMirrorRouteContract: boolean;
  requiredFields: readonly string[];
  optionalFields: readonly string[];
};

export const NATIVE_CONTRACT_MATRIX: readonly NativeContractMatrixRow[] = [
  {
    routePath: "/events",
    templateType: "events-hub",
    viewModel: "ManagedEvent",
    dataSource: "lib/events/store#getManagedEvents",
    requiresMirrorRouteContract: true,
    requiredFields: ["slug", "path", "title", "shortDate", "isClosed"],
    optionalFields: ["location", "timeLabel", "startAt", "endAt"],
  },
  {
    routePath: "/in-the-news",
    templateType: "in-the-news-directory",
    viewModel: "ManagedInTheNewsArticle",
    dataSource: "lib/in-the-news/store#getManagedInTheNews",
    requiresMirrorRouteContract: true,
    requiredFields: ["slug", "path", "title", "excerpt", "bodyText"],
    optionalFields: [
      "publishedLabel",
      "publishedAt",
      "year",
      "author",
      "publication",
      "sourceUrl",
      "sourceCapturedAt",
    ],
  },
  {
    routePath: "/center-city",
    templateType: "kosher-directory",
    viewModel: "ManagedKosherPlace",
    dataSource: "lib/kosher/store#getManagedKosherPlaces",
    requiresMirrorRouteContract: true,
    requiredFields: [
      "slug",
      "path",
      "title",
      "neighborhood",
      "neighborhoodLabel",
      "tags",
      "categoryPaths",
      "tagPaths",
    ],
    optionalFields: [
      "address",
      "phone",
      "website",
      "supervision",
      "summary",
      "locationHref",
      "sourceCapturedAt",
    ],
  },
  {
    routePath: "/cherry-hill",
    templateType: "kosher-directory",
    viewModel: "ManagedKosherPlace",
    dataSource: "lib/kosher/store#getManagedKosherPlaces",
    requiresMirrorRouteContract: true,
    requiredFields: [
      "slug",
      "path",
      "title",
      "neighborhood",
      "neighborhoodLabel",
      "tags",
      "categoryPaths",
      "tagPaths",
    ],
    optionalFields: [
      "address",
      "phone",
      "website",
      "supervision",
      "summary",
      "locationHref",
      "sourceCapturedAt",
    ],
  },
  {
    routePath: "/main-line-manyunk",
    templateType: "kosher-directory",
    viewModel: "ManagedKosherPlace",
    dataSource: "lib/kosher/store#getManagedKosherPlaces",
    requiresMirrorRouteContract: true,
    requiredFields: [
      "slug",
      "path",
      "title",
      "neighborhood",
      "neighborhoodLabel",
      "tags",
      "categoryPaths",
      "tagPaths",
    ],
    optionalFields: [
      "address",
      "phone",
      "website",
      "supervision",
      "summary",
      "locationHref",
      "sourceCapturedAt",
    ],
  },
  {
    routePath: "/old-yorkroad-northeast",
    templateType: "kosher-directory",
    viewModel: "ManagedKosherPlace",
    dataSource: "lib/kosher/store#getManagedKosherPlaces",
    requiresMirrorRouteContract: true,
    requiredFields: [
      "slug",
      "path",
      "title",
      "neighborhood",
      "neighborhoodLabel",
      "tags",
      "categoryPaths",
      "tagPaths",
    ],
    optionalFields: [
      "address",
      "phone",
      "website",
      "supervision",
      "summary",
      "locationHref",
      "sourceCapturedAt",
    ],
  },
  {
    routePath: "/search",
    templateType: "search-page",
    viewModel: "SearchIndexRecord",
    dataSource: "lib/mirror/loaders#loadSearchIndex",
    requiresMirrorRouteContract: false,
    requiredFields: ["path", "type", "title", "excerpt", "terms"],
    optionalFields: ["description"],
  },
] as const;

export const NATIVE_ENABLED_ROUTE_PATHS: readonly NativeRoutePath[] = [
  "/events",
  "/in-the-news",
  "/center-city",
  "/cherry-hill",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
  "/search",
] as const;

export const NATIVE_ENABLED_ROUTE_SET = new Set<NativeRoutePath>(NATIVE_ENABLED_ROUTE_PATHS);
export const NATIVE_MIRROR_BYPASS_PATHS = new Set<NativeRoutePath>(NATIVE_ENABLED_ROUTE_PATHS);

export function isNativeMirrorBypassPath(path: string): path is NativeRoutePath {
  return NATIVE_MIRROR_BYPASS_PATHS.has(path as NativeRoutePath);
}

export type MirrorOnlyFieldLifecycleRecord = {
  dataset: "events" | "in-the-news" | "kosher";
  field: "capturedAt" | "sourceJson" | "sourceCapturedAt";
  currentOwner: string;
  consumedBy: readonly string[];
  phase: "active" | "deprecating" | "remove-after-route-migration";
  removeWhen: string;
};

export const MIRROR_ONLY_FIELD_LIFECYCLE: readonly MirrorOnlyFieldLifecycleRecord[] = [
  {
    dataset: "events",
    field: "capturedAt",
    currentOwner: "lib/events/extract#ExtractedEvent",
    consumedBy: ["db.events.sourceCapturedAt"],
    phase: "deprecating",
    removeWhen: "events ingestion no longer reads mirrored timestamps",
  },
  {
    dataset: "events",
    field: "sourceJson",
    currentOwner: "lib/events/extract#ExtractedEvent",
    consumedBy: ["db.events.sourceJson"],
    phase: "deprecating",
    removeWhen: "events route and audits stop relying on mirror audit payloads",
  },
  {
    dataset: "in-the-news",
    field: "capturedAt",
    currentOwner: "lib/in-the-news/extract#ExtractedInTheNewsArticle",
    consumedBy: ["db.in_the_news.sourceCapturedAt"],
    phase: "deprecating",
    removeWhen: "news ingestion no longer uses mirror capture timestamps",
  },
  {
    dataset: "in-the-news",
    field: "sourceJson",
    currentOwner: "lib/in-the-news/extract#ExtractedInTheNewsArticle",
    consumedBy: ["db.in_the_news.sourceJson"],
    phase: "deprecating",
    removeWhen: "news ingestion/audits no longer require mirrored source payload",
  },
  {
    dataset: "kosher",
    field: "capturedAt",
    currentOwner: "lib/kosher/extract#ExtractedKosherPlace",
    consumedBy: ["db.kosher_places.sourceCapturedAt", "page_freshness fallback calculation"],
    phase: "deprecating",
    removeWhen: "freshness is sourced from native ingestion metadata",
  },
  {
    dataset: "kosher",
    field: "sourceJson",
    currentOwner: "lib/kosher/extract#ExtractedKosherPlace",
    consumedBy: ["db.kosher_places.sourceJson"],
    phase: "deprecating",
    removeWhen: "kosher ingestion/audits stop requiring mirror payload snapshots",
  },
  {
    dataset: "events",
    field: "sourceCapturedAt",
    currentOwner: "lib/events/store#ManagedEvent",
    consumedBy: ["database sync path only"],
    phase: "remove-after-route-migration",
    removeWhen: "all event consumers read native ingestion timestamps",
  },
  {
    dataset: "in-the-news",
    field: "sourceCapturedAt",
    currentOwner: "lib/in-the-news/store#ManagedInTheNewsArticle",
    consumedBy: ["database sync path only"],
    phase: "remove-after-route-migration",
    removeWhen: "all article consumers read native ingestion timestamps",
  },
  {
    dataset: "kosher",
    field: "sourceCapturedAt",
    currentOwner: "lib/kosher/store#ManagedKosherPlace",
    consumedBy: ["database sync path only"],
    phase: "remove-after-route-migration",
    removeWhen: "all place consumers read native ingestion timestamps",
  },
] as const;

const DOCUMENT_TYPES: readonly [DocumentType, ...DocumentType[]] = [
  "page",
  "post",
  "news",
  "event",
  "category",
  "tag",
  "profile",
];

const nonEmptyString = z
  .string()
  .refine((value) => value.trim().length > 0, { message: "expected a non-empty string" });

const internalPathString = z.string().refine(
  (value) => value === "/" || value.startsWith("/"),
  { message: "expected an internal path starting with /" },
);

const internalOrAbsoluteUrlPathString = z.string().refine(
  (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
  { message: "expected an internal path or absolute URL" },
);

const maybeAbsoluteUrlString = z.string().refine(
  (value) => {
    if (!value) {
      return true;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "expected an empty string or absolute http(s) URL" },
);

const isoDateTimeString = z.string().datetime({ offset: true });

export const managedEventContractSchema = z
  .object({
    slug: nonEmptyString,
    path: internalPathString.refine((value) => value.startsWith("/events-1/"), {
      message: "expected event path under /events-1/",
    }),
    title: nonEmptyString,
    shortDate: z.string(),
    location: z.string(),
    timeLabel: z.string(),
    startAt: isoDateTimeString.nullable(),
    endAt: isoDateTimeString.nullable(),
    isClosed: z.boolean(),
  })
  .strict();

export type ManagedEventContract = z.infer<typeof managedEventContractSchema>;

export const managedInTheNewsArticleContractSchema = z
  .object({
    slug: nonEmptyString,
    path: internalOrAbsoluteUrlPathString,
    title: nonEmptyString,
    publishedLabel: z.string(),
    publishedAt: isoDateTimeString.nullable(),
    year: z.number().int().nullable(),
    author: z.string(),
    publication: z.string(),
    excerpt: nonEmptyString,
    bodyText: nonEmptyString,
    sourceUrl: maybeAbsoluteUrlString,
    sourceCapturedAt: isoDateTimeString.nullable(),
  })
  .strict();

export type ManagedInTheNewsArticleContract = z.infer<typeof managedInTheNewsArticleContractSchema>;

export const managedKosherPlaceContractSchema = z
  .object({
    slug: nonEmptyString,
    path: internalPathString.refine((value) => value.startsWith("/post/"), {
      message: "expected kosher place path under /post/",
    }),
    title: nonEmptyString,
    neighborhood: z.enum([
      "center-city",
      "main-line-manyunk",
      "old-yorkroad-northeast",
      "cherry-hill",
      "unknown",
    ]),
    neighborhoodLabel: nonEmptyString,
    tags: z.array(z.string()),
    categoryPaths: z.array(z.string()),
    tagPaths: z.array(z.string()),
    address: z.string(),
    phone: z.string(),
    website: maybeAbsoluteUrlString,
    supervision: z.string(),
    summary: z.string(),
    locationHref: maybeAbsoluteUrlString,
    sourceCapturedAt: isoDateTimeString.nullable(),
  })
  .strict();

export type ManagedKosherPlaceContract = z.infer<typeof managedKosherPlaceContractSchema>;

export const searchIndexRecordContractSchema = z
  .object({
    path: internalPathString,
    type: z.enum(DOCUMENT_TYPES),
    title: nonEmptyString,
    description: z.string(),
    excerpt: nonEmptyString,
    terms: z.array(nonEmptyString).min(1),
  })
  .strict();

export type SearchIndexRecordContract = z.infer<typeof searchIndexRecordContractSchema>;

const managedEventsCollectionSchema = z.array(managedEventContractSchema);
const managedInTheNewsCollectionSchema = z.array(managedInTheNewsArticleContractSchema);
const managedKosherPlacesCollectionSchema = z.array(managedKosherPlaceContractSchema);
const searchIndexCollectionSchema = z.array(searchIndexRecordContractSchema);

function formatZodPath(path: PropertyKey[]) {
  if (path.length === 0) {
    return "(root)";
  }

  return path
    .map((part) => {
      if (typeof part === "number") {
        return `[${part}]`;
      }

      return String(part);
    })
    .join(".")
    .replace(/\.\[/g, "[");
}

function parseWithContract<T>(schema: z.ZodType<T>, value: unknown, scope: string): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const issueLines = parsed.error.issues
    .slice(0, 12)
    .map((issue) => `${formatZodPath(issue.path)}: ${issue.message}`);

  throw new Error(
    [`Native contract validation failed for ${scope}:`, ...issueLines].join("\n"),
  );
}

export function validateManagedEventsContract(value: unknown, scope = "ManagedEvent[]") {
  return parseWithContract(managedEventsCollectionSchema, value, scope);
}

export function validateManagedInTheNewsContract(
  value: unknown,
  scope = "ManagedInTheNewsArticle[]",
) {
  return parseWithContract(managedInTheNewsCollectionSchema, value, scope);
}

export function validateManagedKosherPlacesContract(
  value: unknown,
  scope = "ManagedKosherPlace[]",
) {
  return parseWithContract(managedKosherPlacesCollectionSchema, value, scope);
}

export function validateSearchIndexContract(value: unknown, scope = "SearchIndexRecord[]") {
  return parseWithContract(searchIndexCollectionSchema, value, scope);
}
