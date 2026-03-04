import { z } from "zod";

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;

export type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

export function parsePageLimit(rawLimit: string | null | undefined) {
  if (!rawLimit) return DEFAULT_PAGE_LIMIT;
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PAGE_LIMIT;
  return Math.min(parsed, MAX_PAGE_LIMIT);
}

export function encodeCursor(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor<T>(rawCursor: string | null | undefined, schema: z.ZodType<T>) {
  if (!rawCursor) {
    return { value: null as T | null, error: null as string | null };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf-8"));
  } catch {
    return { value: null as T | null, error: "Invalid cursor" };
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    return { value: null as T | null, error: "Invalid cursor" };
  }

  return { value: parsed.data, error: null as string | null };
}

export function toPaginatedResult<T>(
  rows: T[],
  limit: number,
  cursorFromRow: (row: T) => Record<string, unknown>,
): { items: T[]; pageInfo: PageInfo } {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage && items.length > 0 ? encodeCursor(cursorFromRow(items[items.length - 1]!)) : null;

  return {
    items,
    pageInfo: {
      nextCursor,
      hasNextPage,
      limit,
    },
  };
}
