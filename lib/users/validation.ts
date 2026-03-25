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

export const passwordResetRequestPayloadSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const passwordResetCompletePayloadSchema = z
  .object({
    token: z.string().trim().min(24).max(2048),
    password: z.string().min(USER_PASSWORD_MIN_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
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
  profileDetails: z.object({
    school: z.string().trim().max(160),
    occupation: z.string().trim().max(160),
    interests: z.string().trim().max(500),
    hobbies: z.string().trim().max(500),
    funFacts: z.string().trim().max(500),
  }),
  profileFieldVisibility: z.object({
    displayName: z.enum(["public", "private"]),
    bio: z.enum(["public", "private"]),
    city: z.enum(["public", "private"]),
    avatarUrl: z.enum(["public", "private"]),
    school: z.enum(["public", "private"]),
    occupation: z.enum(["public", "private"]),
    interests: z.enum(["public", "private"]),
    hobbies: z.enum(["public", "private"]),
    funFacts: z.enum(["public", "private"]),
  }),
  profileVisibility: z.enum(["private", "members", "public", "anonymous"]),
});

export function normalizeUserEmail(value: string) {
  return value.trim().toLowerCase();
}
