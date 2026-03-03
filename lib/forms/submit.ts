import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { formDeliveryLog, formSubmissions } from "@/db/schema";
import { sendFormNotification } from "@/lib/forms/email";

type FormType = "contact" | "kosher-inquiry" | "volunteer";

export const baseFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(1),
  sourcePath: z.string().trim().max(512).optional().default(""),
});

type SubmitFormInput = z.infer<typeof baseFormSchema>;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

async function findRecentDuplicateSubmission(
  formType: FormType,
  data: SubmitFormInput,
) {
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);

  const [existing] = await getDb()
    .select({ id: formSubmissions.id })
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.formType, formType),
        eq(formSubmissions.name, data.name),
        eq(formSubmissions.email, data.email),
        eq(formSubmissions.phone, data.phone),
        eq(formSubmissions.message, data.message),
        eq(formSubmissions.sourcePath, data.sourcePath),
        gte(formSubmissions.createdAt, cutoff),
      ),
    )
    .limit(1);

  return existing ?? null;
}

async function deliverFormNotification(
  submissionId: number,
  payload: {
    formType: FormType;
    name: string;
    email: string;
    phone: string;
    message: string;
    sourcePath: string;
  },
) {
  try {
    await sendFormNotification({
      ...payload,
      submissionId,
    });

    await getDb().insert(formDeliveryLog).values({
      submissionId,
      provider: "resend",
      status: "sent",
      errorMessage: "",
    });
  } catch (error) {
    await getDb().insert(formDeliveryLog).values({
      submissionId,
      provider: "resend",
      status: "failed",
      errorMessage: String(error).slice(0, 512),
    });
  }
}

export async function submitForm(formType: FormType, payload: unknown) {
  const parsed = baseFormSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid payload",
      issues: parsed.error.flatten(),
    };
  }

  const data: SubmitFormInput = parsed.data;
  const duplicate = await findRecentDuplicateSubmission(formType, data);
  if (duplicate) {
    return {
      ok: true as const,
      status: 200,
      redirectTo: "/thank-you",
      submissionId: duplicate.id,
    };
  }

  const [inserted] = await getDb()
    .insert(formSubmissions)
    .values({
      formType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      sourcePath: data.sourcePath,
      payloadJson: data as Record<string, unknown>,
    })
    .returning({ id: formSubmissions.id });

  if (!inserted) {
    throw new Error("Insert failed");
  }

  await deliverFormNotification(inserted.id, {
    formType,
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    sourcePath: data.sourcePath,
  });

  return {
    ok: true as const,
    status: 201,
    redirectTo: "/thank-you",
    submissionId: inserted.id,
  };
}
