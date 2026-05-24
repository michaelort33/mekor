import { z } from "zod";

import {
  displayNameSchema,
  emailSchema,
  longTextSchema,
  optionalUrlSchema,
  phoneSchema,
  shortTextSchema,
  tagsSchema,
} from "./common";

export const PEOPLE_STATUSES = [
  "lead",
  "invited",
  "visitor",
  "guest",
  "member",
  "admin",
  "super_admin",
  "inactive",
] as const;

export type PersonStatus = (typeof PEOPLE_STATUSES)[number];

export const personStatusSchema = z.enum(PEOPLE_STATUSES);

const baseFields = {
  status: personStatusSchema,
  firstName: z.string().trim().max(120).default(""),
  lastName: z.string().trim().max(120).default(""),
  displayName: displayNameSchema,
  email: emailSchema,
  phone: phoneSchema.default(""),
  city: shortTextSchema.default(""),
  notes: longTextSchema.default(""),
  source: shortTextSchema.default("admin"),
  tags: tagsSchema.default([]),
  avatarUrl: optionalUrlSchema.default(""),
};

export const createPersonSchema = z.object({
  ...baseFields,
  status: personStatusSchema.default("lead"),
});

export const updatePersonSchema = z
  .object({
    status: personStatusSchema.optional(),
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    displayName: displayNameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    city: shortTextSchema.optional(),
    notes: longTextSchema.optional(),
    tags: tagsSchema.optional(),
    avatarUrl: optionalUrlSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field must be provided");

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
