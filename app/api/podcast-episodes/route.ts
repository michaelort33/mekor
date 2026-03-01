import { load } from "cheerio";
import { NextRequest, NextResponse } from "next/server";

const PODCAST_FEED_URL = "https://feeds.castos.com/zdz74";
const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 60;

type PodcastEpisode = {
  id: string;
  title: string;
  description: string | null;
  episodeUrl: string | null;
  audioUrl: string | null;
  duration: string | null;
  publishedAt: string | null;
};

function parseLimit(raw: string | null) {
  if (!raw) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, parsed));
}

function toIsoDate(raw: string | null) {
  if (!raw) {
    return null;
  }

  const normalized = new Date(raw);
  if (Number.isNaN(normalized.getTime())) {
    return null;
  }

  return normalized.toISOString();
}

function normalizeText(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const response = await fetch(PODCAST_FEED_URL, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return NextResponse.json({ episodes: [] as PodcastEpisode[] }, { status: 502 });
  }

  const xml = await response.text();
  const $ = load(xml, { xmlMode: true });
  const episodes: PodcastEpisode[] = [];

  $("item").each((index, itemNode) => {
    if (index >= limit) {
      return;
    }

    const item = $(itemNode);
    const title = normalizeText(item.find("title").first().text()) ?? "Untitled Episode";
    const description = normalizeText(item.find("description").first().text());
    const episodeUrl = normalizeText(item.find("link").first().text());
    const duration = normalizeText(item.find("itunes\\:duration").first().text());
    const publishedAt = toIsoDate(normalizeText(item.find("pubDate").first().text()));
    const audioUrl = item.find("enclosure").first().attr("url") ?? null;
    const guid = normalizeText(item.find("guid").first().text());

    episodes.push({
      id: guid ?? `${title}-${index}`,
      title,
      description,
      episodeUrl,
      audioUrl,
      duration,
      publishedAt,
    });
  });

  return NextResponse.json({ episodes }, { status: 200 });
}
