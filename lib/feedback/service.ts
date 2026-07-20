import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import { siteFeedbackSessions, siteSuggestions } from "@/db/schema";
import type { SaveSuggestionInput } from "@/lib/feedback/save-suggestion-schema";
import { sanitizeSuggestionBody, sanitizeSuggestionText } from "@/lib/feedback/sanitize";
import {
  type FeedbackTranscriptMessage,
  type SiteSuggestionDetail,
  type SiteSuggestionKind,
  type SiteSuggestionStatus,
  type SiteSuggestionSummary,
  isSiteSuggestionKind,
  isSiteSuggestionStatus,
} from "@/lib/feedback/types";

const MAX_TRANSCRIPT_MESSAGES = 40;

function mapSuggestionRow(row: typeof siteSuggestions.$inferSelect): SiteSuggestionSummary {
  return {
    id: row.id,
    sessionId: row.sessionId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    categoryDetail: row.categoryDetail,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    priority: row.priority,
    status: row.status,
    adminNotes: row.adminNotes,
    sourcePath: row.sourcePath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createOrGetFeedbackSession(input: {
  publicId?: string | null;
  sourcePath?: string;
  userId?: number | null;
  userAgent?: string;
}) {
  const db = getDb();
  const requestedPublicId = input.publicId?.trim() || "";

  if (requestedPublicId) {
    const [existing] = await db
      .select({
        id: siteFeedbackSessions.id,
        publicId: siteFeedbackSessions.publicId,
      })
      .from(siteFeedbackSessions)
      .where(eq(siteFeedbackSessions.publicId, requestedPublicId))
      .limit(1);

    if (existing) {
      if (input.userId && input.userId > 0) {
        await db
          .update(siteFeedbackSessions)
          .set({
            userId: input.userId,
            updatedAt: new Date(),
          })
          .where(eq(siteFeedbackSessions.id, existing.id));
      }
      return existing;
    }
  }

  const publicId = requestedPublicId || randomUUID();
  const [created] = await db
    .insert(siteFeedbackSessions)
    .values({
      publicId,
      sourcePath: input.sourcePath?.trim().slice(0, 512) || "",
      userId: input.userId && input.userId > 0 ? input.userId : null,
      userAgent: input.userAgent?.trim().slice(0, 512) || "",
      transcriptJson: [],
    })
    .returning({
      id: siteFeedbackSessions.id,
      publicId: siteFeedbackSessions.publicId,
    });

  if (!created) {
    throw new Error("Unable to create feedback session");
  }

  return created;
}

export async function appendTranscript(
  sessionId: number,
  messages: FeedbackTranscriptMessage[],
) {
  const trimmed = messages
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .slice(-MAX_TRANSCRIPT_MESSAGES);

  await getDb()
    .update(siteFeedbackSessions)
    .set({
      transcriptJson: trimmed,
      updatedAt: new Date(),
    })
    .where(eq(siteFeedbackSessions.id, sessionId));
}

export async function saveSuggestionFromTool(input: {
  sessionId: number;
  sourcePath?: string;
  payload: SaveSuggestionInput;
}) {
  const [row] = await getDb()
    .insert(siteSuggestions)
    .values({
      sessionId: input.sessionId,
      kind: input.payload.kind,
      title: sanitizeSuggestionText(input.payload.title, 200),
      body: sanitizeSuggestionBody(input.payload.body, 5000),
      categoryDetail: sanitizeSuggestionText(input.payload.categoryDetail || "", 120),
      contactName: sanitizeSuggestionText(input.payload.contactName || "", 120),
      contactEmail: sanitizeSuggestionText(input.payload.contactEmail || "", 255),
      priority: input.payload.priority || "normal",
      sourcePath: sanitizeSuggestionText(input.sourcePath || "", 512),
    })
    .returning({ id: siteSuggestions.id });

  if (!row) {
    throw new Error("Unable to save suggestion");
  }

  await getDb()
    .update(siteFeedbackSessions)
    .set({ updatedAt: new Date() })
    .where(eq(siteFeedbackSessions.id, input.sessionId));

  return { suggestionId: row.id };
}

export async function listSuggestionsForAdmin(input: {
  q?: string;
  status?: string;
  kind?: string;
  limit?: number;
  cursor?: number | null;
}) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const filters = [];

  if (input.status && isSiteSuggestionStatus(input.status)) {
    filters.push(eq(siteSuggestions.status, input.status));
  }
  if (input.kind && isSiteSuggestionKind(input.kind)) {
    filters.push(eq(siteSuggestions.kind, input.kind as SiteSuggestionKind));
  }
  if (input.q?.trim()) {
    const needle = `%${input.q.trim()}%`;
    filters.push(
      or(
        ilike(siteSuggestions.title, needle),
        ilike(siteSuggestions.body, needle),
        ilike(siteSuggestions.contactName, needle),
        ilike(siteSuggestions.contactEmail, needle),
        ilike(siteSuggestions.categoryDetail, needle),
      ),
    );
  }
  if (input.cursor && Number.isInteger(input.cursor) && input.cursor > 0) {
    filters.push(sql`${siteSuggestions.id} < ${input.cursor}`);
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const rows = await getDb()
    .select()
    .from(siteSuggestions)
    .where(whereClause)
    .orderBy(desc(siteSuggestions.id))
    .limit(limit + 1);

  const hasNextPage = rows.length > limit;
  const items = rows.slice(0, limit).map(mapSuggestionRow);
  const nextCursor = hasNextPage ? items[items.length - 1]?.id ?? null : null;

  return {
    items,
    pageInfo: {
      nextCursor,
      hasNextPage,
      limit,
    },
  };
}

export async function getSuggestionDetail(id: number): Promise<SiteSuggestionDetail | null> {
  if (!Number.isInteger(id) || id < 1) return null;

  const [row] = await getDb()
    .select({
      suggestion: siteSuggestions,
      sessionPublicId: siteFeedbackSessions.publicId,
      transcriptJson: siteFeedbackSessions.transcriptJson,
    })
    .from(siteSuggestions)
    .innerJoin(siteFeedbackSessions, eq(siteSuggestions.sessionId, siteFeedbackSessions.id))
    .where(eq(siteSuggestions.id, id))
    .limit(1);

  if (!row) return null;

  return {
    ...mapSuggestionRow(row.suggestion),
    sessionPublicId: row.sessionPublicId,
    transcript: Array.isArray(row.transcriptJson) ? row.transcriptJson : [],
  };
}

export async function updateSuggestionStatus(input: {
  id: number;
  status: SiteSuggestionStatus;
  adminNotes?: string;
}) {
  const updates: {
    status: SiteSuggestionStatus;
    updatedAt: Date;
    adminNotes?: string;
  } = {
    status: input.status,
    updatedAt: new Date(),
  };

  if (typeof input.adminNotes === "string") {
    updates.adminNotes = input.adminNotes.trim().slice(0, 5000);
  }

  const [row] = await getDb()
    .update(siteSuggestions)
    .set(updates)
    .where(eq(siteSuggestions.id, input.id))
    .returning();

  return row ? mapSuggestionRow(row) : null;
}
