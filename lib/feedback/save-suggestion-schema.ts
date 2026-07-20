import { z } from "zod";

export const saveSuggestionInputSchema = z.object({
  kind: z.enum(["suggestion", "feedback", "bug", "praise", "other"]),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(8).max(5000),
  categoryDetail: z.string().trim().max(120).optional().default(""),
  contactName: z.string().trim().max(120).optional().default(""),
  contactEmail: z
    .string()
    .trim()
    .max(255)
    .optional()
    .default("")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Invalid email",
    }),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
});

export type SaveSuggestionInput = z.infer<typeof saveSuggestionInputSchema>;
