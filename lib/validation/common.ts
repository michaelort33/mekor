import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(255);

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .refine((v) => !v || z.string().email().safeParse(v).success, "Must be a valid email");

export const phoneSchema = z.string().trim().max(60);

export const displayNameSchema = z.string().trim().min(2).max(160);

export const shortTextSchema = z.string().trim().max(120);
export const mediumTextSchema = z.string().trim().max(255);
export const longTextSchema = z.string().trim().max(4000);

export const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20);

export const positiveIntSchema = z.number().int().positive();

export const idParamSchema = z.coerce.number().int().min(1);

export const cursorPageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().trim().min(1).max(2048).optional(),
});

export const moneyCentsSchema = z.number().int().min(0).max(10_000_000);

export const isoDateTimeSchema = z.string().datetime();

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a URL-safe slug");

export const urlSchema = z.string().trim().url().max(2048);

export const optionalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => !v || z.string().url().safeParse(v).success, "Must be a valid URL");

/** Trims, then converts empty strings to undefined. Useful for optional form fields. */
export const optionalTrimmedString = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export type CursorPage = z.infer<typeof cursorPageSchema>;
