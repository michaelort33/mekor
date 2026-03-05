import { z } from "zod";

import { USER_PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

export const signupPayloadSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    password: z.string().min(USER_PASSWORD_MIN_LENGTH),
    confirmPassword: z.string(),
    familyInviteToken: z.string().trim().min(24).max(2048).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginPayloadSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1),
  familyInviteToken: z.string().trim().min(24).max(2048).optional(),
});

export const profileUpdatePayloadSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(500),
  city: z.string().trim().max(120),
  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => !value || z.url().safeParse(value).success, "Avatar URL must be a valid URL"),
  profileVisibility: z.enum(["private", "members", "public", "anonymous"]),
});

export function normalizeUserEmail(value: string) {
  return value.trim().toLowerCase();
}
