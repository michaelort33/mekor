import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { formDeliveryLog, formSubmissions } from "@/db/schema";
import {
  buildInboxSummary,
  createAdminInboxEvent,
  getCategoryForForm,
  getFormLabel,
  type PublicFormType,
} from "@/lib/admin/inbox";
import { sendFormConfirmation } from "@/lib/forms/email";
import { sendAdminInboxAlerts } from "@/lib/notifications/admin-alerts";

export type FormType = PublicFormType;

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

async function deliverAdminInboxNotification(
  submissionId: number,
  payload: {
    formType: FormType;
    name: string;
    email: string;
    phone: string;
    message: string;
    sourcePath: string;
  },
  options: {
    siteOrigin: string;
  },
) {
  const category = getCategoryForForm({
    formType: payload.formType,
    sourcePath: payload.sourcePath,
  });

  try {
    const inboxEvent = await createAdminInboxEvent({
      sourceType: "form_submission",
      category,
      sourceId: String(submissionId),
      title: getFormLabel(payload.formType),
      submitterName: payload.name,
      submitterEmail: payload.email,
      submitterPhone: payload.phone,
      summary: buildInboxSummary({
        message: payload.message,
        sourcePath: payload.sourcePath,
      }),
      payloadJson: {
        submissionId,
        formType: payload.formType,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
        sourcePath: payload.sourcePath,
      },
    });
    const alertResult = await sendAdminInboxAlerts({
      event: inboxEvent,
      category,
      siteOrigin: options.siteOrigin,
    });

    await getDb().insert(formDeliveryLog).values({
      submissionId,
      provider: "sendgrid_admin_alert",
      status: alertResult.recipientCount > 0 ? "sent" : "skipped",
      errorMessage: alertResult.recipientCount > 0 ? "" : "No opted-in super admins for this category",
    });
  } catch (error) {
    await getDb().insert(formDeliveryLog).values({
      submissionId,
      provider: "sendgrid_admin_alert",
      status: "failed",
      errorMessage: String(error).slice(0, 512),
    });
  }
}

async function deliverFormConfirmation(
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
    await sendFormConfirmation({
      ...payload,
      submissionId,
    });

    await getDb().insert(formDeliveryLog).values({
      submissionId,
      provider: "resend_submitter_confirmation",
      status: "sent",
      errorMessage: "",
    });
  } catch (error) {
    await getDb().insert(formDeliveryLog).values({
      submissionId,
      provider: "resend_submitter_confirmation",
      status: "failed",
      errorMessage: String(error).slice(0, 512),
    });
  }
}

export async function submitForm(
  formType: FormType,
  payload: unknown,
  options: {
    siteOrigin: string;
  },
) {
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

  await deliverAdminInboxNotification(
    inserted.id,
    {
      formType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      sourcePath: data.sourcePath,
    },
    options,
  );

  await deliverFormConfirmation(inserted.id, {
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
