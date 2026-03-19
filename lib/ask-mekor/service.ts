import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { Resend } from "resend";

import { getDb } from "@/db/client";
import {
  askMekorCategories,
  askMekorQuestions,
  askMekorReplies,
  askMekorSubcategories,
  inboxMessages,
  inboxParticipants,
  inboxThreads,
  notificationsOutbox,
  users,
} from "@/db/schema";
import {
  type QuestionCategory,
  type QuestionSubcategory,
  type AskMekorQuestionSummary,
  type AskMekorQuestionDetail,
} from "@/lib/ask-mekor/types";
import { getFormNotifyFrom, getFormNotifyTo, getResendApiKey } from "@/lib/forms/config";

const DEFAULT_CATEGORIES = [
  {
    slug: "kashrut",
    label: "Kashrut",
    description: "Food, supervision, ingredients, and kosher product questions.",
  },
  {
    slug: "shabbat",
    label: "Shabbat",
    description: "Questions about Shabbat observance and practical halachah.",
  },
  {
    slug: "holidays",
    label: "Holidays",
    description: "Yom Tov, Pesach, fast days, and holiday preparation questions.",
  },
  {
    slug: "prayer",
    label: "Prayer",
    description: "Davening, brachot, and synagogue-practice questions.",
  },
  {
    slug: "general",
    label: "General",
    description: "General rabbinic, community, and guidance questions.",
  },
] as const;

const PREVIEW_PESACH_CREATED_AT = new Date("2026-03-10T14:00:00.000Z");
const PREVIEW_PESACH_ANSWERED_AT = new Date("2026-03-11T16:30:00.000Z");
const PREVIEW_PESACH_CATEGORY: QuestionCategory = {
  id: -1,
  slug: "pesach",
  label: "Pesach",
  description: "Preview questions for Pesach products, ingredients, and preparation.",
  position: 0,
  publicQuestionCount: 1,
  subcategories: [],
};
const PREVIEW_PESACH_SLUG = "pesach-preview-kirkland-pecans";

function shouldUseAskMekorPreviewData() {
  return process.env.NODE_ENV !== "production";
}

function buildPreviewPesachSummary(): AskMekorQuestionSummary {
  return {
    id: -1,
    slug: PREVIEW_PESACH_SLUG,
    title: "Are Kirkland raw pecan halves acceptable for Pesach?",
    visibility: "public",
    status: "answered",
    category: PREVIEW_PESACH_CATEGORY,
    subcategory: null,
    askerName: "Anonymous",
    publicAnonymous: true,
    replyCount: 1,
    createdAt: PREVIEW_PESACH_CREATED_AT,
    updatedAt: PREVIEW_PESACH_ANSWERED_AT,
    answeredAt: PREVIEW_PESACH_ANSWERED_AT,
  };
}

function buildPreviewPesachDetail(): AskMekorQuestionDetail {
  return {
    ...buildPreviewPesachSummary(),
    body: [
      "I found Kirkland raw pecan halves at Costco and want to use them for Pesach baking.",
      "",
      "The package only says raw pecan halves with no added ingredients. Are they acceptable for Pesach as sold, or do they need a specific Pesach certification?",
    ].join("\n"),
    askerEmail: "preview@example.com",
    askerPhone: "",
    askerUserId: null,
    sourcePath: "/ask-mekor",
    linkedThreadId: null,
    replies: [
      {
        id: -1,
        authorUserId: 0,
        authorDisplayName: "Mekor Admin",
        body: "Plain raw pecans are acceptable for Pesach when they contain no additives and no shared-processing concern is indicated on the package. For chopped, candied, or flavored varieties, ask separately.",
        createdAt: PREVIEW_PESACH_ANSWERED_AT,
      },
    ],
    threadMessages: [],
  };
}

export class AskMekorServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(status: number, code: string, message: string): never {
  throw new AskMekorServiceError(status, code, message);
}

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

function slugify(value: string) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

async function ensureDefaultCategories() {
  const now = new Date();
  await getDb()
    .insert(askMekorCategories)
    .values(
      DEFAULT_CATEGORIES.map((category, index) => ({
        slug: category.slug,
        label: category.label,
        description: category.description,
        position: index,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();
}

async function getAdminParticipants() {
  const adminRows = await getDb()
    .select({
      id: users.id,
    })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]));

  if (adminRows.length === 0) {
    fail(500, "ASK_MEKOR_ADMIN_MISSING", "No admin accounts are available for Ask Mekor");
  }

  return adminRows.map((row) => row.id);
}

function buildPrivateThreadSystemBody(input: {
  questionId: number;
  categoryLabel: string;
  subcategoryLabel: string;
  title: string;
  askerName: string;
  askerEmail: string;
  askerPhone: string;
  body: string;
}) {
  return [
    `Ask Mekor private question #${input.questionId}`,
    `Category: ${input.categoryLabel}`,
    input.subcategoryLabel ? `Subcategory: ${input.subcategoryLabel}` : "",
    `Title: ${input.title}`,
    `Asker: ${input.askerName}`,
    `Email: ${input.askerEmail || "Not provided"}`,
    `Phone: ${input.askerPhone || "Not provided"}`,
    "",
    input.body,
  ].join("\n");
}

function getPublicAskerName(input: {
  visibility: "public" | "private";
  publicAnonymous: boolean;
  askerName: string;
}) {
  if (input.visibility === "public" && input.publicAnonymous) {
    return "Anonymous";
  }

  return input.askerName;
}

function mapSummaryRow(input: {
  id: number;
  slug: string;
  title: string;
  visibility: "public" | "private";
  status: "open" | "answered" | "closed";
  askerName: string;
  publicAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  answeredAt: Date | null;
  replyCount: number;
  categoryId: number;
  categorySlug: string;
  categoryLabel: string;
  categoryDescription: string;
  categoryPosition: number;
  categoryPublicCount: number;
  categorySubcategories?: QuestionSubcategory[];
  subcategoryId: number | null;
  subcategorySlug: string | null;
  subcategoryLabel: string | null;
  subcategoryDescription: string | null;
  subcategoryPosition: number | null;
  subcategoryPublicCount: number;
  usePublicAskerName?: boolean;
}): AskMekorQuestionSummary {
  return {
    id: input.id,
    slug: input.slug,
    title: input.title,
    visibility: input.visibility,
    status: input.status,
    askerName: input.usePublicAskerName === false ? input.askerName : getPublicAskerName(input),
    publicAnonymous: input.publicAnonymous,
    replyCount: input.replyCount,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    answeredAt: input.answeredAt,
    category: {
      id: input.categoryId,
      slug: input.categorySlug,
      label: input.categoryLabel,
      description: input.categoryDescription,
      position: input.categoryPosition,
      publicQuestionCount: input.categoryPublicCount,
      subcategories: input.categorySubcategories ?? [],
    },
    subcategory:
      input.subcategoryId === null
        ? null
        : {
            id: input.subcategoryId,
            categoryId: input.categoryId,
            slug: input.subcategorySlug ?? "",
            label: input.subcategoryLabel ?? "",
            description: input.subcategoryDescription ?? "",
            position: input.subcategoryPosition ?? 0,
            publicQuestionCount: input.subcategoryPublicCount,
          },
  };
}

async function listCategoriesInternal() {
  await ensureDefaultCategories();

  const categoryCounts = await getDb()
    .select({
      categoryId: askMekorQuestions.categoryId,
      total: sql<number>`count(*)::int`,
    })
    .from(askMekorQuestions)
    .where(eq(askMekorQuestions.visibility, "public"))
    .groupBy(askMekorQuestions.categoryId);

  const subcategoryCounts = await getDb()
    .select({
      subcategoryId: askMekorQuestions.subcategoryId,
      total: sql<number>`count(*)::int`,
    })
    .from(askMekorQuestions)
    .where(and(eq(askMekorQuestions.visibility, "public"), sql`${askMekorQuestions.subcategoryId} is not null`))
    .groupBy(askMekorQuestions.subcategoryId);

  const categoryCountMap = new Map<number, number>(categoryCounts.map((row) => [row.categoryId, row.total]));
  const subcategoryCountMap = new Map<number, number>(
    subcategoryCounts
      .filter((row): row is { subcategoryId: number; total: number } => row.subcategoryId !== null)
      .map((row) => [row.subcategoryId, row.total]),
  );

  const rows = await getDb()
    .select()
    .from(askMekorCategories)
    .orderBy(asc(askMekorCategories.position), asc(askMekorCategories.label));

  const subcategoryRows = await getDb()
    .select()
    .from(askMekorSubcategories)
    .orderBy(
      asc(askMekorSubcategories.categoryId),
      asc(askMekorSubcategories.position),
      asc(askMekorSubcategories.label),
    );

  const subcategoriesByCategoryId = new Map<number, QuestionSubcategory[]>();
  for (const row of subcategoryRows) {
    const list = subcategoriesByCategoryId.get(row.categoryId) ?? [];
    list.push({
      id: row.id,
      categoryId: row.categoryId,
      slug: row.slug,
      label: row.label,
      description: row.description,
      position: row.position,
      publicQuestionCount: subcategoryCountMap.get(row.id) ?? 0,
    });
    subcategoriesByCategoryId.set(row.categoryId, list);
  }

  return rows.map<QuestionCategory>((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    position: row.position,
    publicQuestionCount: categoryCountMap.get(row.id) ?? 0,
    subcategories: subcategoriesByCategoryId.get(row.id) ?? [],
  }));
}

async function getCategoryBySlug(slug: string) {
  await ensureDefaultCategories();

  const [category] = await getDb()
    .select()
    .from(askMekorCategories)
    .where(eq(askMekorCategories.slug, slug))
    .limit(1);

  if (!category) {
    fail(404, "ASK_MEKOR_CATEGORY_NOT_FOUND", "Category not found");
  }

  return category;
}

async function getSubcategoryForCategory(input: { categoryId: number; subcategorySlug?: string }) {
  const subcategorySlug = clean(input.subcategorySlug);
  if (!subcategorySlug) {
    return null;
  }

  const [subcategory] = await getDb()
    .select()
    .from(askMekorSubcategories)
    .where(and(eq(askMekorSubcategories.categoryId, input.categoryId), eq(askMekorSubcategories.slug, subcategorySlug)))
    .limit(1);

  if (!subcategory) {
    fail(400, "ASK_MEKOR_SUBCATEGORY_NOT_FOUND", "Subcategory not found for category");
  }

  return subcategory;
}

export async function listAskMekorCategories() {
  return listCategoriesInternal();
}

async function ensureUniqueCategorySlug(input: { slug: string; ignoreId?: number }) {
  const [existing] = await getDb()
    .select({ id: askMekorCategories.id })
    .from(askMekorCategories)
    .where(eq(askMekorCategories.slug, input.slug))
    .limit(1);

  if (existing && existing.id !== input.ignoreId) {
    fail(409, "ASK_MEKOR_CATEGORY_SLUG_CONFLICT", "Category slug already exists");
  }
}

async function ensureUniqueSubcategorySlug(input: { categoryId: number; slug: string; ignoreId?: number }) {
  const [existing] = await getDb()
    .select({ id: askMekorSubcategories.id })
    .from(askMekorSubcategories)
    .where(and(eq(askMekorSubcategories.categoryId, input.categoryId), eq(askMekorSubcategories.slug, input.slug)))
    .limit(1);

  if (existing && existing.id !== input.ignoreId) {
    fail(409, "ASK_MEKOR_SUBCATEGORY_SLUG_CONFLICT", "Subcategory slug already exists in this category");
  }
}

export async function saveAskMekorCategory(input: {
  id?: number;
  label: string;
  slug?: string;
  description?: string;
  position?: number;
}) {
  const label = clean(input.label);
  const slug = slugify(input.slug || label);
  const description = clean(input.description);
  const position = input.position ?? 0;

  if (!label || !slug) {
    fail(400, "ASK_MEKOR_CATEGORY_REQUIRED", "Category label is required");
  }

  await ensureUniqueCategorySlug({ slug, ignoreId: input.id });
  const now = new Date();

  if (input.id) {
    const [updated] = await getDb()
      .update(askMekorCategories)
      .set({
        label,
        slug,
        description,
        position,
        updatedAt: now,
      })
      .where(eq(askMekorCategories.id, input.id))
      .returning({ id: askMekorCategories.id });

    if (!updated) {
      fail(404, "ASK_MEKOR_CATEGORY_NOT_FOUND", "Category not found");
    }

    return updated;
  }

  const [created] = await getDb()
    .insert(askMekorCategories)
    .values({
      label,
      slug,
      description,
      position,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: askMekorCategories.id });

  return created;
}

export async function deleteAskMekorCategory(id: number) {
  const [question] = await getDb()
    .select({ id: askMekorQuestions.id })
    .from(askMekorQuestions)
    .where(eq(askMekorQuestions.categoryId, id))
    .limit(1);

  if (question) {
    fail(400, "ASK_MEKOR_CATEGORY_IN_USE", "Category cannot be deleted while questions use it");
  }

  const [subcategory] = await getDb()
    .select({ id: askMekorSubcategories.id })
    .from(askMekorSubcategories)
    .where(eq(askMekorSubcategories.categoryId, id))
    .limit(1);

  if (subcategory) {
    fail(400, "ASK_MEKOR_CATEGORY_HAS_SUBCATEGORIES", "Delete subcategories before deleting the category");
  }

  const [deleted] = await getDb()
    .delete(askMekorCategories)
    .where(eq(askMekorCategories.id, id))
    .returning({ id: askMekorCategories.id });

  if (!deleted) {
    fail(404, "ASK_MEKOR_CATEGORY_NOT_FOUND", "Category not found");
  }

  return deleted;
}

export async function saveAskMekorSubcategory(input: {
  id?: number;
  categoryId: number;
  label: string;
  slug?: string;
  description?: string;
  position?: number;
}) {
  const label = clean(input.label);
  const slug = slugify(input.slug || label);
  const description = clean(input.description);
  const position = input.position ?? 0;

  if (!label || !slug) {
    fail(400, "ASK_MEKOR_SUBCATEGORY_REQUIRED", "Subcategory label is required");
  }

  const [category] = await getDb()
    .select({ id: askMekorCategories.id })
    .from(askMekorCategories)
    .where(eq(askMekorCategories.id, input.categoryId))
    .limit(1);

  if (!category) {
    fail(404, "ASK_MEKOR_CATEGORY_NOT_FOUND", "Category not found");
  }

  await ensureUniqueSubcategorySlug({ categoryId: input.categoryId, slug, ignoreId: input.id });
  const now = new Date();

  if (input.id) {
    const [updated] = await getDb()
      .update(askMekorSubcategories)
      .set({
        categoryId: input.categoryId,
        label,
        slug,
        description,
        position,
        updatedAt: now,
      })
      .where(eq(askMekorSubcategories.id, input.id))
      .returning({ id: askMekorSubcategories.id });

    if (!updated) {
      fail(404, "ASK_MEKOR_SUBCATEGORY_NOT_FOUND", "Subcategory not found");
    }

    return updated;
  }

  const [created] = await getDb()
    .insert(askMekorSubcategories)
    .values({
      categoryId: input.categoryId,
      label,
      slug,
      description,
      position,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: askMekorSubcategories.id });

  return created;
}

export async function deleteAskMekorSubcategory(id: number) {
  const [question] = await getDb()
    .select({ id: askMekorQuestions.id })
    .from(askMekorQuestions)
    .where(eq(askMekorQuestions.subcategoryId, id))
    .limit(1);

  if (question) {
    fail(400, "ASK_MEKOR_SUBCATEGORY_IN_USE", "Subcategory cannot be deleted while questions use it");
  }

  const [deleted] = await getDb()
    .delete(askMekorSubcategories)
    .where(eq(askMekorSubcategories.id, id))
    .returning({ id: askMekorSubcategories.id });

  if (!deleted) {
    fail(404, "ASK_MEKOR_SUBCATEGORY_NOT_FOUND", "Subcategory not found");
  }

  return deleted;
}

export async function listPublicAskMekorQuestions(input: {
  q?: string;
  categorySlug?: string;
  limit?: number;
}) {
  const categories = await listCategoriesInternal();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const q = clean(input.q);

  const rows = await getDb()
    .select({
      id: askMekorQuestions.id,
      slug: askMekorQuestions.slug,
      title: askMekorQuestions.title,
      visibility: askMekorQuestions.visibility,
      status: askMekorQuestions.status,
      askerName: askMekorQuestions.askerName,
      publicAnonymous: askMekorQuestions.publicAnonymous,
      createdAt: askMekorQuestions.createdAt,
      updatedAt: askMekorQuestions.updatedAt,
      answeredAt: askMekorQuestions.answeredAt,
      categoryId: askMekorCategories.id,
      categorySlug: askMekorCategories.slug,
      categoryLabel: askMekorCategories.label,
      categoryDescription: askMekorCategories.description,
      categoryPosition: askMekorCategories.position,
      subcategoryId: askMekorSubcategories.id,
      subcategorySlug: askMekorSubcategories.slug,
      subcategoryLabel: askMekorSubcategories.label,
      subcategoryDescription: askMekorSubcategories.description,
      subcategoryPosition: askMekorSubcategories.position,
      replyCount: sql<number>`count(${askMekorReplies.id})::int`,
    })
    .from(askMekorQuestions)
    .innerJoin(askMekorCategories, eq(askMekorCategories.id, askMekorQuestions.categoryId))
    .leftJoin(askMekorSubcategories, eq(askMekorSubcategories.id, askMekorQuestions.subcategoryId))
    .leftJoin(askMekorReplies, eq(askMekorReplies.questionId, askMekorQuestions.id))
    .where(
      and(
        eq(askMekorQuestions.visibility, "public"),
        input.categorySlug ? eq(askMekorCategories.slug, input.categorySlug) : undefined,
        q
          ? or(
              ilike(askMekorQuestions.title, `%${q}%`),
              ilike(askMekorQuestions.body, `%${q}%`),
              ilike(askMekorCategories.label, `%${q}%`),
              ilike(sql`coalesce(${askMekorSubcategories.label}, '')`, `%${q}%`),
            )
          : undefined,
      ),
    )
    .groupBy(
      askMekorQuestions.id,
      askMekorQuestions.slug,
      askMekorQuestions.title,
      askMekorQuestions.visibility,
      askMekorQuestions.status,
      askMekorQuestions.askerName,
      askMekorQuestions.publicAnonymous,
      askMekorQuestions.createdAt,
      askMekorQuestions.updatedAt,
      askMekorQuestions.answeredAt,
      askMekorCategories.id,
      askMekorCategories.slug,
      askMekorCategories.label,
      askMekorCategories.description,
      askMekorCategories.position,
      askMekorSubcategories.id,
      askMekorSubcategories.slug,
      askMekorSubcategories.label,
      askMekorSubcategories.description,
      askMekorSubcategories.position,
    )
    .orderBy(desc(askMekorQuestions.updatedAt), desc(askMekorQuestions.id))
    .limit(input.limit ?? 50);

  const mappedItems = rows.map((row) =>
    mapSummaryRow({
      ...row,
      categoryPublicCount: categoryMap.get(row.categoryId)?.publicQuestionCount ?? 0,
      categorySubcategories: categoryMap.get(row.categoryId)?.subcategories ?? [],
      subcategoryPublicCount:
        categoryMap
          .get(row.categoryId)
          ?.subcategories.find((item) => item.id === row.subcategoryId)?.publicQuestionCount ?? 0,
      usePublicAskerName: true,
    }),
  );

  if (
    shouldUseAskMekorPreviewData() &&
    !q &&
    mappedItems.length === 0 &&
    (!input.categorySlug || input.categorySlug === PREVIEW_PESACH_CATEGORY.slug)
  ) {
    return {
      categories: categories.some((category) => category.slug === PREVIEW_PESACH_CATEGORY.slug)
        ? categories
        : [...categories, PREVIEW_PESACH_CATEGORY],
      items: [buildPreviewPesachSummary()],
    };
  }

  return {
    categories,
    items: mappedItems,
  };
}

export async function getPublicAskMekorQuestionBySlug(slug: string) {
  if (shouldUseAskMekorPreviewData() && slug === PREVIEW_PESACH_SLUG) {
    return buildPreviewPesachDetail();
  }

  await ensureDefaultCategories();

  const [row] = await getDb()
    .select({
      id: askMekorQuestions.id,
      slug: askMekorQuestions.slug,
      title: askMekorQuestions.title,
      body: askMekorQuestions.body,
      visibility: askMekorQuestions.visibility,
      status: askMekorQuestions.status,
      askerName: askMekorQuestions.askerName,
      publicAnonymous: askMekorQuestions.publicAnonymous,
      askerEmail: askMekorQuestions.askerEmail,
      askerPhone: askMekorQuestions.askerPhone,
      askerUserId: askMekorQuestions.askerUserId,
      sourcePath: askMekorQuestions.sourcePath,
      linkedThreadId: askMekorQuestions.linkedThreadId,
      createdAt: askMekorQuestions.createdAt,
      updatedAt: askMekorQuestions.updatedAt,
      answeredAt: askMekorQuestions.answeredAt,
      categoryId: askMekorCategories.id,
      categorySlug: askMekorCategories.slug,
      categoryLabel: askMekorCategories.label,
      categoryDescription: askMekorCategories.description,
      categoryPosition: askMekorCategories.position,
      subcategoryId: askMekorSubcategories.id,
      subcategorySlug: askMekorSubcategories.slug,
      subcategoryLabel: askMekorSubcategories.label,
      subcategoryDescription: askMekorSubcategories.description,
      subcategoryPosition: askMekorSubcategories.position,
    })
    .from(askMekorQuestions)
    .innerJoin(askMekorCategories, eq(askMekorCategories.id, askMekorQuestions.categoryId))
    .leftJoin(askMekorSubcategories, eq(askMekorSubcategories.id, askMekorQuestions.subcategoryId))
    .where(and(eq(askMekorQuestions.slug, slug), eq(askMekorQuestions.visibility, "public")))
    .limit(1);

  if (!row) {
    return null;
  }

  const categories = await listCategoriesInternal();
  const category = categories.find((item) => item.id === row.categoryId);
  const replies = await getDb()
    .select({
      id: askMekorReplies.id,
      authorUserId: askMekorReplies.authorUserId,
      authorDisplayName: users.displayName,
      body: askMekorReplies.body,
      createdAt: askMekorReplies.createdAt,
    })
    .from(askMekorReplies)
    .innerJoin(users, eq(users.id, askMekorReplies.authorUserId))
    .where(eq(askMekorReplies.questionId, row.id))
    .orderBy(asc(askMekorReplies.createdAt), asc(askMekorReplies.id));

  return {
    ...mapSummaryRow({
      id: row.id,
      slug: row.slug,
      title: row.title,
      visibility: row.visibility,
      status: row.status,
      askerName: row.askerName,
      publicAnonymous: row.publicAnonymous,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      answeredAt: row.answeredAt,
      replyCount: replies.length,
      categoryId: row.categoryId,
      categorySlug: row.categorySlug,
      categoryLabel: row.categoryLabel,
      categoryDescription: row.categoryDescription,
      categoryPosition: row.categoryPosition,
      categoryPublicCount: category?.publicQuestionCount ?? 0,
      categorySubcategories: category?.subcategories ?? [],
      subcategoryId: row.subcategoryId,
      subcategorySlug: row.subcategorySlug,
      subcategoryLabel: row.subcategoryLabel,
      subcategoryDescription: row.subcategoryDescription,
      subcategoryPosition: row.subcategoryPosition,
      subcategoryPublicCount: category?.subcategories.find((item) => item.id === row.subcategoryId)?.publicQuestionCount ?? 0,
      usePublicAskerName: true,
    }),
    body: row.body,
    askerEmail: row.askerEmail,
    askerPhone: row.askerPhone,
    askerUserId: row.askerUserId,
    sourcePath: row.sourcePath,
    linkedThreadId: row.linkedThreadId,
    replies,
    threadMessages: [],
  } satisfies AskMekorQuestionDetail;
}

export async function createAskMekorQuestion(input: {
  categorySlug: string;
  subcategorySlug?: string;
  visibility: "public" | "private";
  publicAnonymous?: boolean;
  title: string;
  body: string;
  askerName: string;
  askerEmail: string;
  askerPhone?: string;
  sourcePath?: string;
  askerUserId?: number | null;
}) {
  const title = clean(input.title);
  const body = clean(input.body);
  const askerName = clean(input.askerName);
  const askerEmail = clean(input.askerEmail).toLowerCase();
  const askerPhone = clean(input.askerPhone);
  const sourcePath = clean(input.sourcePath) || "/ask-mekor";
  const publicAnonymous = input.visibility === "public" ? Boolean(input.publicAnonymous) : false;

  if (!title || !body || !askerName || !askerEmail) {
    fail(400, "ASK_MEKOR_INVALID_INPUT", "Title, details, name, and email are required");
  }

  const category = await getCategoryBySlug(input.categorySlug);
  const subcategory = await getSubcategoryForCategory({
    categoryId: category.id,
    subcategorySlug: input.subcategorySlug,
  });
  const adminIds = input.visibility === "private" ? await getAdminParticipants() : [];

  return getDb().transaction(async (tx) => {
    const now = new Date();
    const [created] = await tx
      .insert(askMekorQuestions)
      .values({
        categoryId: category.id,
        subcategoryId: subcategory?.id ?? null,
        visibility: input.visibility,
        status: "open",
        slug: "pending",
        title,
        body,
        askerUserId: input.askerUserId ?? null,
        askerName,
        publicAnonymous,
        askerEmail,
        askerPhone,
        sourcePath,
        linkedThreadId: null,
        answeredAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: askMekorQuestions.id,
      });

    if (!created) {
      fail(500, "ASK_MEKOR_CREATE_FAILED", "Unable to create question");
    }

    const slug = `${slugify(title) || "question"}-${created.id}`;
    let linkedThreadId: number | null = null;

    if (input.visibility === "private") {
      const [thread] = await tx
        .insert(inboxThreads)
        .values({
          type: "direct",
          subject: `Ask Mekor · ${title}`,
          familyId: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: inboxThreads.id,
        });

      linkedThreadId = thread?.id ?? null;
      if (!linkedThreadId) {
        fail(500, "ASK_MEKOR_THREAD_CREATE_FAILED", "Unable to create private thread");
      }

      for (const adminId of adminIds) {
        await tx
          .insert(inboxParticipants)
          .values({
            threadId: linkedThreadId,
            userId: adminId,
            lastReadAt: null,
            muted: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }

      if (input.askerUserId) {
        await tx
          .insert(inboxParticipants)
          .values({
            threadId: linkedThreadId,
            userId: input.askerUserId,
            lastReadAt: null,
            muted: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }

      await tx.insert(inboxMessages).values({
        threadId: linkedThreadId,
        senderUserId: null,
        messageType: "system",
        body: buildPrivateThreadSystemBody({
          questionId: created.id,
          categoryLabel: category.label,
          subcategoryLabel: subcategory?.label ?? "",
          title,
          askerName,
          askerEmail,
          askerPhone,
          body: input.askerUserId ? "" : body,
        }),
        actionPayloadJson: {
          kind: "ask_mekor_private_question",
          questionId: created.id,
          visibility: input.visibility,
          categorySlug: category.slug,
          subcategorySlug: subcategory?.slug ?? "",
        },
        createdAt: now,
        updatedAt: now,
      });

      if (input.askerUserId) {
        await tx.insert(inboxMessages).values({
          threadId: linkedThreadId,
          senderUserId: input.askerUserId,
          messageType: "text",
          body,
          actionPayloadJson: {},
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await tx
      .update(askMekorQuestions)
      .set({
        slug,
        linkedThreadId,
        updatedAt: now,
      })
      .where(eq(askMekorQuestions.id, created.id));

    return {
      id: created.id,
      slug,
      visibility: input.visibility,
      linkedThreadId,
    };
  });
}

export async function listAdminAskMekorQuestions(input: {
  q?: string;
  visibility?: "public" | "private";
  status?: "open" | "answered" | "closed";
  categorySlug?: string;
}) {
  const categories = await listCategoriesInternal();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const q = clean(input.q);

  const rows = await getDb()
    .select({
      id: askMekorQuestions.id,
      slug: askMekorQuestions.slug,
      title: askMekorQuestions.title,
      visibility: askMekorQuestions.visibility,
      status: askMekorQuestions.status,
      askerName: askMekorQuestions.askerName,
      publicAnonymous: askMekorQuestions.publicAnonymous,
      createdAt: askMekorQuestions.createdAt,
      updatedAt: askMekorQuestions.updatedAt,
      answeredAt: askMekorQuestions.answeredAt,
      categoryId: askMekorCategories.id,
      categorySlug: askMekorCategories.slug,
      categoryLabel: askMekorCategories.label,
      categoryDescription: askMekorCategories.description,
      categoryPosition: askMekorCategories.position,
      subcategoryId: askMekorSubcategories.id,
      subcategorySlug: askMekorSubcategories.slug,
      subcategoryLabel: askMekorSubcategories.label,
      subcategoryDescription: askMekorSubcategories.description,
      subcategoryPosition: askMekorSubcategories.position,
      replyCount: sql<number>`count(${askMekorReplies.id})::int`,
    })
    .from(askMekorQuestions)
    .innerJoin(askMekorCategories, eq(askMekorCategories.id, askMekorQuestions.categoryId))
    .leftJoin(askMekorSubcategories, eq(askMekorSubcategories.id, askMekorQuestions.subcategoryId))
    .leftJoin(askMekorReplies, eq(askMekorReplies.questionId, askMekorQuestions.id))
    .where(
      and(
        input.visibility ? eq(askMekorQuestions.visibility, input.visibility) : undefined,
        input.status ? eq(askMekorQuestions.status, input.status) : undefined,
        input.categorySlug ? eq(askMekorCategories.slug, input.categorySlug) : undefined,
        q
          ? or(
              ilike(askMekorQuestions.title, `%${q}%`),
              ilike(askMekorQuestions.body, `%${q}%`),
              ilike(askMekorQuestions.askerName, `%${q}%`),
              ilike(askMekorQuestions.askerEmail, `%${q}%`),
              ilike(sql`coalesce(${askMekorSubcategories.label}, '')`, `%${q}%`),
            )
          : undefined,
      ),
    )
    .groupBy(
      askMekorQuestions.id,
      askMekorQuestions.slug,
      askMekorQuestions.title,
      askMekorQuestions.visibility,
      askMekorQuestions.status,
      askMekorQuestions.askerName,
      askMekorQuestions.publicAnonymous,
      askMekorQuestions.createdAt,
      askMekorQuestions.updatedAt,
      askMekorQuestions.answeredAt,
      askMekorCategories.id,
      askMekorCategories.slug,
      askMekorCategories.label,
      askMekorCategories.description,
      askMekorCategories.position,
      askMekorSubcategories.id,
      askMekorSubcategories.slug,
      askMekorSubcategories.label,
      askMekorSubcategories.description,
      askMekorSubcategories.position,
    )
    .orderBy(desc(askMekorQuestions.updatedAt), desc(askMekorQuestions.id))
    .limit(200);

  return {
    categories,
    items: rows.map((row) =>
      mapSummaryRow({
        ...row,
        categoryPublicCount: categoryMap.get(row.categoryId)?.publicQuestionCount ?? 0,
        categorySubcategories: categoryMap.get(row.categoryId)?.subcategories ?? [],
        subcategoryPublicCount:
          categoryMap
            .get(row.categoryId)
            ?.subcategories.find((item) => item.id === row.subcategoryId)?.publicQuestionCount ?? 0,
        usePublicAskerName: false,
      }),
    ),
  };
}

export async function getAdminAskMekorQuestionDetail(id: number) {
  await ensureDefaultCategories();

  const [row] = await getDb()
    .select({
      id: askMekorQuestions.id,
      slug: askMekorQuestions.slug,
      title: askMekorQuestions.title,
      body: askMekorQuestions.body,
      visibility: askMekorQuestions.visibility,
      status: askMekorQuestions.status,
      askerName: askMekorQuestions.askerName,
      publicAnonymous: askMekorQuestions.publicAnonymous,
      askerEmail: askMekorQuestions.askerEmail,
      askerPhone: askMekorQuestions.askerPhone,
      askerUserId: askMekorQuestions.askerUserId,
      sourcePath: askMekorQuestions.sourcePath,
      linkedThreadId: askMekorQuestions.linkedThreadId,
      createdAt: askMekorQuestions.createdAt,
      updatedAt: askMekorQuestions.updatedAt,
      answeredAt: askMekorQuestions.answeredAt,
      categoryId: askMekorCategories.id,
      categorySlug: askMekorCategories.slug,
      categoryLabel: askMekorCategories.label,
      categoryDescription: askMekorCategories.description,
      categoryPosition: askMekorCategories.position,
      subcategoryId: askMekorSubcategories.id,
      subcategorySlug: askMekorSubcategories.slug,
      subcategoryLabel: askMekorSubcategories.label,
      subcategoryDescription: askMekorSubcategories.description,
      subcategoryPosition: askMekorSubcategories.position,
    })
    .from(askMekorQuestions)
    .innerJoin(askMekorCategories, eq(askMekorCategories.id, askMekorQuestions.categoryId))
    .leftJoin(askMekorSubcategories, eq(askMekorSubcategories.id, askMekorQuestions.subcategoryId))
    .where(eq(askMekorQuestions.id, id))
    .limit(1);

  if (!row) {
    fail(404, "ASK_MEKOR_NOT_FOUND", "Question not found");
  }

  const categories = await listCategoriesInternal();
  const category = categories.find((item) => item.id === row.categoryId);
  const replies = await getDb()
    .select({
      id: askMekorReplies.id,
      authorUserId: askMekorReplies.authorUserId,
      authorDisplayName: users.displayName,
      body: askMekorReplies.body,
      createdAt: askMekorReplies.createdAt,
    })
    .from(askMekorReplies)
    .innerJoin(users, eq(users.id, askMekorReplies.authorUserId))
    .where(eq(askMekorReplies.questionId, row.id))
    .orderBy(asc(askMekorReplies.createdAt), asc(askMekorReplies.id));

  const threadMessages =
    row.linkedThreadId === null
      ? []
      : await getDb()
          .select({
            id: inboxMessages.id,
            senderUserId: inboxMessages.senderUserId,
            senderDisplayName: users.displayName,
            messageType: inboxMessages.messageType,
            body: inboxMessages.body,
            createdAt: inboxMessages.createdAt,
          })
          .from(inboxMessages)
          .leftJoin(users, eq(users.id, inboxMessages.senderUserId))
          .where(eq(inboxMessages.threadId, row.linkedThreadId))
          .orderBy(asc(inboxMessages.createdAt), asc(inboxMessages.id));

  return {
    ...mapSummaryRow({
      id: row.id,
      slug: row.slug,
      title: row.title,
      visibility: row.visibility,
      status: row.status,
      askerName: row.askerName,
      publicAnonymous: row.publicAnonymous,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      answeredAt: row.answeredAt,
      replyCount: replies.length,
      categoryId: row.categoryId,
      categorySlug: row.categorySlug,
      categoryLabel: row.categoryLabel,
      categoryDescription: row.categoryDescription,
      categoryPosition: row.categoryPosition,
      categoryPublicCount: category?.publicQuestionCount ?? 0,
      categorySubcategories: category?.subcategories ?? [],
      subcategoryId: row.subcategoryId,
      subcategorySlug: row.subcategorySlug,
      subcategoryLabel: row.subcategoryLabel,
      subcategoryDescription: row.subcategoryDescription,
      subcategoryPosition: row.subcategoryPosition,
      subcategoryPublicCount: category?.subcategories.find((item) => item.id === row.subcategoryId)?.publicQuestionCount ?? 0,
      usePublicAskerName: false,
    }),
    body: row.body,
    askerEmail: row.askerEmail,
    askerPhone: row.askerPhone,
    askerUserId: row.askerUserId,
    sourcePath: row.sourcePath,
    linkedThreadId: row.linkedThreadId,
    replies,
    threadMessages,
  } satisfies AskMekorQuestionDetail;
}

export async function createAdminPublicReply(input: {
  actorUserId: number;
  questionId: number;
  body: string;
}) {
  const body = clean(input.body);
  if (!body) {
    fail(400, "ASK_MEKOR_REPLY_REQUIRED", "Reply cannot be empty");
  }

  const [question] = await getDb()
    .select({
      id: askMekorQuestions.id,
      visibility: askMekorQuestions.visibility,
    })
    .from(askMekorQuestions)
    .where(eq(askMekorQuestions.id, input.questionId))
    .limit(1);

  if (!question) {
    fail(404, "ASK_MEKOR_NOT_FOUND", "Question not found");
  }
  if (question.visibility !== "public") {
    fail(400, "ASK_MEKOR_PRIVATE_REPLY_FORBIDDEN", "Use the private reply flow for private questions");
  }

  return getDb().transaction(async (tx) => {
    const now = new Date();
    const [reply] = await tx
      .insert(askMekorReplies)
      .values({
        questionId: input.questionId,
        authorUserId: input.actorUserId,
        body,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: askMekorReplies.id,
      });

    await tx
      .update(askMekorQuestions)
      .set({
        status: "answered",
        answeredAt: now,
        updatedAt: now,
      })
      .where(eq(askMekorQuestions.id, input.questionId));

    return reply;
  });
}

async function sendGuestPrivateReplyEmail(input: {
  toEmail: string;
  askerName: string;
  questionTitle: string;
  replyBody: string;
  threadId: number | null;
}) {
  const subject = `[Mekor] Reply to your Ask Mekor question`;
  const text = [
    `Shalom ${input.askerName || "there"},`,
    "",
    `We replied to your Ask Mekor question: ${input.questionTitle}`,
    "",
    input.replyBody,
    "",
    "If you need to continue the conversation, reply to this email.",
  ].join("\n");

  const now = new Date();
  const [outbox] = await getDb()
    .insert(notificationsOutbox)
    .values({
      userId: null,
      threadId: input.threadId,
      channel: "email",
      toAddress: input.toEmail,
      subject,
      body: text,
      provider: "resend_ask_mekor_reply",
      status: "queued",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: notificationsOutbox.id });

  const resend = new Resend(getResendApiKey());
  try {
    await resend.emails.send({
      from: getFormNotifyFrom(),
      to: [input.toEmail],
      replyTo: getFormNotifyTo(),
      subject,
      text,
    });

    await getDb()
      .update(notificationsOutbox)
      .set({
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificationsOutbox.id, outbox.id));
  } catch (error) {
    await getDb()
      .update(notificationsOutbox)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unable to send Ask Mekor reply",
        updatedAt: new Date(),
      })
      .where(eq(notificationsOutbox.id, outbox.id));
  }
}

export async function createAdminPrivateReply(input: {
  actorUserId: number;
  questionId: number;
  body: string;
}) {
  const body = clean(input.body);
  if (!body) {
    fail(400, "ASK_MEKOR_REPLY_REQUIRED", "Reply cannot be empty");
  }

  const [question] = await getDb()
    .select({
      id: askMekorQuestions.id,
      visibility: askMekorQuestions.visibility,
      linkedThreadId: askMekorQuestions.linkedThreadId,
      askerUserId: askMekorQuestions.askerUserId,
      askerName: askMekorQuestions.askerName,
      askerEmail: askMekorQuestions.askerEmail,
      title: askMekorQuestions.title,
    })
    .from(askMekorQuestions)
    .where(eq(askMekorQuestions.id, input.questionId))
    .limit(1);

  if (!question) {
    fail(404, "ASK_MEKOR_NOT_FOUND", "Question not found");
  }
  if (question.visibility !== "private" || !question.linkedThreadId) {
    fail(400, "ASK_MEKOR_NOT_PRIVATE", "Question is not configured for private replies");
  }

  await getDb().transaction(async (tx) => {
    const now = new Date();
    await tx.insert(inboxMessages).values({
      threadId: question.linkedThreadId!,
      senderUserId: input.actorUserId,
      messageType: "text",
      body,
      actionPayloadJson: {},
      createdAt: now,
      updatedAt: now,
    });

    await tx
      .update(inboxThreads)
      .set({
        updatedAt: now,
      })
      .where(eq(inboxThreads.id, question.linkedThreadId!));

    await tx
      .update(askMekorQuestions)
      .set({
        status: "answered",
        answeredAt: now,
        updatedAt: now,
      })
      .where(eq(askMekorQuestions.id, question.id));
  });

  if (!question.askerUserId && question.askerEmail) {
    await sendGuestPrivateReplyEmail({
      toEmail: question.askerEmail,
      askerName: question.askerName,
      questionTitle: question.title,
      replyBody: body,
      threadId: question.linkedThreadId,
    });
  }
}

export async function updateAskMekorQuestionStatus(input: {
  questionId: number;
  status: "open" | "answered" | "closed";
}) {
  const now = new Date();
  const [updated] = await getDb()
    .update(askMekorQuestions)
    .set({
      status: input.status,
      answeredAt: input.status === "answered" ? now : null,
      updatedAt: now,
    })
    .where(eq(askMekorQuestions.id, input.questionId))
    .returning({
      id: askMekorQuestions.id,
    });

  if (!updated) {
    fail(404, "ASK_MEKOR_NOT_FOUND", "Question not found");
  }

  return updated;
}
