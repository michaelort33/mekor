import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin/session";
import {
  createMemberProfile,
  deleteMemberProfileById,
  listMemberProfilesForAdmin,
  MemberProfileStoreError,
  updateMemberProfile,
} from "@/lib/members/store";

const visibilitySchema = z.enum(["private", "members_only", "public", "anonymous"]);

const createSchema = z.object({
  slug: z.string().default(""),
  fullName: z.string().min(1),
  avatarUrl: z.string().default(""),
  bio: z.string().default(""),
  interests: z.array(z.string()).default([]),
  city: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  visibility: visibilitySchema,
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().optional(),
  fullName: z.string().min(1).optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
  city: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  visibility: visibilitySchema.optional(),
});

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequestResponse(error: string, issues?: unknown) {
  return NextResponse.json({ error, issues }, { status: 400 });
}

function validateCreatePayload(payload: z.infer<typeof createSchema>) {
  if (payload.visibility !== "anonymous" && payload.slug.trim().length === 0) {
    return badRequestResponse("Slug is required for non-anonymous profiles.");
  }

  return null;
}

function toStoreErrorResponse(error: MemberProfileStoreError) {
  if (error.code === "NOT_FOUND") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error.code === "SLUG_CONFLICT") {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ error: error.message }, { status: 400 });
}

async function requireAdmin() {
  return getAdminSession();
}

export async function GET() {
  if (!(await requireAdmin())) {
    return unauthorizedResponse();
  }

  const profiles = await listMemberProfilesForAdmin();
  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return unauthorizedResponse();
  }

  const json = await request.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return badRequestResponse("Invalid request payload.", parsed.error.issues);
  }

  const payload = parsed.data;
  const payloadError = validateCreatePayload(payload);
  if (payloadError) {
    return payloadError;
  }

  try {
    const profile = await createMemberProfile({
      slug: payload.slug,
      fullName: payload.fullName,
      avatarUrl: payload.avatarUrl,
      bio: payload.bio,
      interests: payload.interests,
      city: payload.city,
      email: payload.email,
      phone: payload.phone,
      visibility: payload.visibility,
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof MemberProfileStoreError) {
      return toStoreErrorResponse(error);
    }
    throw error;
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return unauthorizedResponse();
  }

  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return badRequestResponse("Invalid request payload.", parsed.error.issues);
  }

  try {
    const profile = await updateMemberProfile(parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof MemberProfileStoreError) {
      return toStoreErrorResponse(error);
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return badRequestResponse("A valid id query param is required.");
  }

  await deleteMemberProfileById(id);
  return NextResponse.json({ deleted: true });
}
