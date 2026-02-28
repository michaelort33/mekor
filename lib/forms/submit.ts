import { z } from "zod";

import { getDb } from "@/db/client";
import { formDeliveryLog, formSubmissions } from "@/db/schema";
import { sendFormNotification } from "@/lib/forms/email";

export const baseFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(1),
  sourcePath: z.string().trim().max(512).optional().default(""),
});

type SubmitFormInput = z.infer<typeof baseFormSchema>;

export async function submitForm(formType: "contact" | "kosher-inquiry", payload: unknown) {
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
    .$returningId();

  if (!inserted) {
    throw new Error("Insert failed");
  }

  try {
    await sendFormNotification({
      formType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      sourcePath: data.sourcePath,
      submissionId: inserted.id,
    });

    await getDb().insert(formDeliveryLog).values({
      submissionId: inserted.id,
      provider: "resend",
      status: "sent",
      errorMessage: "",
    });
  } catch (error) {
    await getDb().insert(formDeliveryLog).values({
      submissionId: inserted.id,
      provider: "resend",
      status: "failed",
      errorMessage: String(error).slice(0, 512),
    });

    throw error;
  }

  return {
    ok: true as const,
    status: 201,
    redirectTo: "/thank-you",
    submissionId: inserted.id,
  };
}
