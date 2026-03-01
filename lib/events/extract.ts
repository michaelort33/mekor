import { load } from "cheerio";

import { listDocumentsByType } from "@/lib/mirror/loaders";
import type { PageDocument } from "@/lib/mirror/types";

export type ExtractedEvent = {
  slug: string;
  path: string;
  title: string;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: Date | null;
  endAt: Date | null;
  isClosed: boolean;
  capturedAt: string;
  sourceJson: Record<string, unknown>;
};

const EVENT_PATH_PREFIX = "/events-1/";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getSlugFromPath(path: string) {
  return path.startsWith(EVENT_PATH_PREFIX) ? path.slice(EVENT_PATH_PREFIX.length) : path;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseEventDateRange(text: string) {
  const normalized = normalizeWhitespace(text);
  const match = normalized.match(
    /([A-Za-z]{3}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s+[AP]M)\s*[–-]\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s+[AP]M|\d{1,2}:\d{2}\s+[AP]M)/,
  );

  if (!match) {
    return {
      startAt: null,
      endAt: null,
      timeLabel: "",
    };
  }

  const startLabel = match[1] ?? "";
  const endLabelRaw = match[2] ?? "";
  const startAt = parseDate(startLabel);
  const endLabel = endLabelRaw.includes(",")
    ? endLabelRaw
    : startLabel.replace(/\d{1,2}:\d{2}\s+[AP]M$/, endLabelRaw);
  const endAt = parseDate(endLabel);

  return {
    startAt,
    endAt,
    timeLabel: `${startLabel} – ${endLabelRaw}`,
  };
}

function extractEvent(document: PageDocument): ExtractedEvent | null {
  if (!document.path.startsWith(EVENT_PATH_PREFIX)) {
    return null;
  }

  const $ = load(document.bodyHtml || document.renderHtml || "");
  const title = normalizeWhitespace(
    $('[data-hook="event-title"]').first().text() || document.title.replace(/\s*\|\s*Mekor 3$/i, ""),
  );
  const shortDate = normalizeWhitespace($('[data-hook="event-short-date"]').first().text());
  const location = normalizeWhitespace($('[data-hook="event-short-location"]').first().text());
  const closedText = normalizeWhitespace($('[data-hook="closed-registration"]').first().text());
  const isClosed =
    Boolean($('[data-hook="closed-registration"]').first().length) ||
    /registration is closed/i.test(closedText) ||
    /registration is closed/i.test(document.text);

  const { startAt, endAt, timeLabel } = parseEventDateRange(document.text);
  const slug = getSlugFromPath(document.path);

  return {
    slug,
    path: document.path,
    title,
    shortDate,
    location,
    timeLabel,
    startAt,
    endAt,
    isClosed,
    capturedAt: document.capturedAt,
    sourceJson: {
      headings: document.headings,
      description: document.description,
      canonical: document.canonical,
      links: document.links,
      textHash: document.textHash,
    },
  };
}

export async function loadExtractedEvents() {
  const docs = await listDocumentsByType("event");
  const extracted = docs
    .map((doc) => extractEvent(doc))
    .filter((row): row is ExtractedEvent => Boolean(row));

  // Mirror has duplicate historical numeric event pages. Keep one representative per title + date.
  const deduped = new Map<string, ExtractedEvent>();
  for (const row of extracted) {
    const key = `${row.title.toLowerCase()}|${row.timeLabel.toLowerCase()}|${row.location.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
      continue;
    }

    if (existing.capturedAt < row.capturedAt) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    const aTime = a.startAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.startAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}
