import { randomBytes } from "node:crypto";

import { and, asc, eq, ne } from "drizzle-orm";

import { getDb } from "@/db/client";
import { memberProfiles } from "@/db/schema";
import type {
  MemberProfileRecord,
  ProfileVisibility,
  PublicMemberProfileCard,
  ViewerAccessContext,
} from "@/lib/members/types";
import { getPublicViewerContext } from "@/lib/members/viewer";
import {
  isVisibleInPublicDirectory,
  isVisibleOnPublicProfile,
  toPublicProfileView,
} from "@/lib/members/visibility";

export const MEMBER_PROFILE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANONYMOUS_SLUG_PREFIX = "community-member-";

export class MemberProfileStoreError extends Error {
  code: "INVALID_SLUG" | "SLUG_CONFLICT" | "NOT_FOUND";

  constructor(code: "INVALID_SLUG" | "SLUG_CONFLICT" | "NOT_FOUND", message: string) {
    super(message);
    this.code = code;
  }
}

export type CreateMemberProfileInput = {
  slug: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
  city?: string;
  email?: string;
  phone?: string;
  visibility: ProfileVisibility;
};

export type UpdateMemberProfileInput = {
  id: number;
  slug?: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
  city?: string;
  email?: string;
  phone?: string;
  visibility?: ProfileVisibility;
};

function normalizeText(value?: string) {
  return (value ?? "").trim();
}

function normalizeInterests(interests?: string[]) {
  if (!interests) {
    return [];
  }

  return [...new Set(interests.map((entry) => entry.trim()).filter(Boolean))];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeProvidedSlug(value: string) {
  const normalized = slugify(value);
  if (!MEMBER_PROFILE_SLUG_PATTERN.test(normalized)) {
    throw new MemberProfileStoreError("INVALID_SLUG", "Slug format is invalid.");
  }

  return normalized;
}

function isAnonymousSlug(slug: string) {
  return new RegExp(`^${ANONYMOUS_SLUG_PREFIX}[a-z0-9]{8}$`).test(slug);
}

export function isLikelyNameDerivedSlug(slug: string, fullName: string) {
  const normalizedSlug = slugify(slug);
  const normalizedName = slugify(fullName);

  if (!normalizedSlug || !normalizedName) {
    return false;
  }

  if (normalizedSlug === normalizedName) {
    return true;
  }

  if (normalizedSlug.startsWith(`${normalizedName}-`) || normalizedName.startsWith(normalizedSlug)) {
    return true;
  }

  const nameTokens = normalizedName.split("-").filter((token) => token.length >= 3);
  return nameTokens.some((token) => normalizedSlug.includes(token));
}

async function slugExists(slug: string, excludeId?: number) {
  const db = getDb();
  const rows = excludeId !== undefined
    ? await db
        .select({ id: memberProfiles.id })
        .from(memberProfiles)
        .where(and(eq(memberProfiles.slug, slug), ne(memberProfiles.id, excludeId)))
        .limit(1)
    : await db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.slug, slug)).limit(1);
  return rows.length > 0;
}

async function assertSlugAvailable(slug: string, excludeId?: number) {
  if (await slugExists(slug, excludeId)) {
    throw new MemberProfileStoreError("SLUG_CONFLICT", "Slug is already in use.");
  }
}

async function generateAnonymousSlug(excludeId?: number): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(4).toString("hex");
    const slug = `${ANONYMOUS_SLUG_PREFIX}${suffix}`;
    if (!(await slugExists(slug, excludeId))) {
      return slug;
    }
  }

  throw new Error("Could not generate unique anonymous slug.");
}

function mapRecord(row: typeof memberProfiles.$inferSelect): MemberProfileRecord {
  return {
    id: row.id,
    slug: row.slug,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    interests: row.interests,
    city: row.city,
    email: row.email,
    phone: row.phone,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listMemberProfilesForAdmin(): Promise<MemberProfileRecord[]> {
  const rows = await getDb().select().from(memberProfiles).orderBy(asc(memberProfiles.fullName));
  return rows.map(mapRecord);
}

export async function getMemberProfileByIdForAdmin(id: number): Promise<MemberProfileRecord | null> {
  const [row] = await getDb().select().from(memberProfiles).where(eq(memberProfiles.id, id)).limit(1);
  return row ? mapRecord(row) : null;
}

export async function createMemberProfile(input: CreateMemberProfileInput): Promise<MemberProfileRecord> {
  const fullName = normalizeText(input.fullName);
  const avatarUrl = normalizeText(input.avatarUrl);
  const bio = normalizeText(input.bio);
  const city = normalizeText(input.city);
  const email = normalizeText(input.email);
  const phone = normalizeText(input.phone);
  const interests = normalizeInterests(input.interests);

  const slug =
    input.visibility === "anonymous"
      ? await generateAnonymousSlug()
      : normalizeProvidedSlug(normalizeText(input.slug));

  if (input.visibility !== "anonymous") {
    await assertSlugAvailable(slug);
  }

  const [row] = await getDb()
    .insert(memberProfiles)
    .values({
      slug,
      fullName,
      avatarUrl,
      bio,
      interests,
      city,
      email,
      phone,
      visibility: input.visibility,
    })
    .returning();

  return mapRecord(row);
}

export async function updateMemberProfile(input: UpdateMemberProfileInput): Promise<MemberProfileRecord> {
  const existing = await getMemberProfileByIdForAdmin(input.id);

  if (!existing) {
    throw new MemberProfileStoreError("NOT_FOUND", "Member profile not found.");
  }

  const fullName = input.fullName !== undefined ? normalizeText(input.fullName) : existing.fullName;
  const avatarUrl = input.avatarUrl !== undefined ? normalizeText(input.avatarUrl) : existing.avatarUrl;
  const bio = input.bio !== undefined ? normalizeText(input.bio) : existing.bio;
  const interests = input.interests !== undefined ? normalizeInterests(input.interests) : existing.interests;
  const city = input.city !== undefined ? normalizeText(input.city) : existing.city;
  const email = input.email !== undefined ? normalizeText(input.email) : existing.email;
  const phone = input.phone !== undefined ? normalizeText(input.phone) : existing.phone;
  const visibility = input.visibility ?? existing.visibility;

  let slug = existing.slug;

  if (visibility === "anonymous") {
    const candidateSlug =
      input.slug !== undefined ? normalizeProvidedSlug(normalizeText(input.slug)) : existing.slug;
    const switchedToAnonymous = existing.visibility !== "anonymous";
    const generateSlug =
      switchedToAnonymous
        ? !isAnonymousSlug(candidateSlug) || isLikelyNameDerivedSlug(candidateSlug, fullName)
        : !isAnonymousSlug(candidateSlug);

    slug = generateSlug ? await generateAnonymousSlug(existing.id) : candidateSlug;
  } else if (input.slug !== undefined) {
    slug = normalizeProvidedSlug(normalizeText(input.slug));
  } else if (isAnonymousSlug(existing.slug)) {
    throw new MemberProfileStoreError("INVALID_SLUG", "Slug is required when switching from anonymous.");
  }

  await assertSlugAvailable(slug, existing.id);

  const [row] = await getDb()
    .update(memberProfiles)
    .set({
      slug,
      fullName,
      avatarUrl,
      bio,
      interests,
      city,
      email,
      phone,
      visibility,
      updatedAt: new Date(),
    })
    .where(eq(memberProfiles.id, existing.id))
    .returning();

  return mapRecord(row);
}

export async function deleteMemberProfileById(id: number) {
  await getDb().delete(memberProfiles).where(eq(memberProfiles.id, id));
}

export async function listPublicMemberProfiles(
  viewer?: ViewerAccessContext,
): Promise<PublicMemberProfileCard[]> {
  const resolvedViewer = viewer ?? (await getPublicViewerContext());
  const rows = await getDb().select().from(memberProfiles).orderBy(asc(memberProfiles.fullName));

  return rows
    .map(mapRecord)
    .filter((profile) => isVisibleInPublicDirectory(profile, resolvedViewer))
    .map((profile) => toPublicProfileView(profile));
}

export async function getPublicMemberProfileBySlug(
  slug: string,
  viewer?: ViewerAccessContext,
): Promise<PublicMemberProfileCard | null> {
  const resolvedViewer = viewer ?? (await getPublicViewerContext());
  const [row] = await getDb().select().from(memberProfiles).where(eq(memberProfiles.slug, slug)).limit(1);

  if (!row) {
    return null;
  }

  const profile = mapRecord(row);
  if (!isVisibleOnPublicProfile(profile, resolvedViewer)) {
    return null;
  }

  return toPublicProfileView(profile);
}

export async function listPublicProfileSlugsForSitemap(): Promise<string[]> {
  const rows = await getDb()
    .select({ slug: memberProfiles.slug })
    .from(memberProfiles)
    .where(eq(memberProfiles.visibility, "public"))
    .orderBy(asc(memberProfiles.slug));
  return rows.map((row) => row.slug);
}
