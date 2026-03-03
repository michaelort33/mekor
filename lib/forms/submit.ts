import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { formDeliveryLog, formSubmissions } from "@/db/schema";
import { sendFormNotification } from "@/lib/forms/email";

export type FormType = "contact" | "kosher-inquiry" | "volunteer" | "event-ask";

export const baseFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(1),
  sourcePath: z.string().trim().max(512).optional().default(""),
});

type SubmitFormInput = z.infer<typeof baseFormSchema>;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
type SubmitFormIssues = {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
};

type FormNotificationPayload = {
  formType: FormType;
  name: string;
  email: string;
  phone: string;
  message: string;
  sourcePath: string;
  submissionId: number;
};

export type FormSubmissionStore = {
  findRecentDuplicateSubmission: (
    formType: FormType,
    data: SubmitFormInput,
    cutoff: Date,
  ) => Promise<{ id: number } | null>;
  createSubmission: (formType: FormType, data: SubmitFormInput) => Promise<{ id: number }>;
  createDeliveryLog: (entry: {
    submissionId: number;
    provider: string;
    status: string;
    errorMessage: string;
  }) => Promise<void>;
};

type SubmitFormDependencies = {
  store: FormSubmissionStore;
  notify: (payload: FormNotificationPayload) => Promise<void>;
  now: () => Date;
  dedupeWindowMs: number;
};

export type SubmitFormResult =
  | {
      ok: false;
      status: number;
      error: string;
      issues: SubmitFormIssues;
    }
  | {
      ok: true;
      status: number;
      redirectTo: "/thank-you";
      submissionId: number;
    };

export type SubmitFormHandler = (formType: FormType, payload: unknown) => Promise<SubmitFormResult>;

function createDbSubmissionStore(): FormSubmissionStore {
  return {
    async findRecentDuplicateSubmission(formType, data, cutoff) {
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
    },
    async createSubmission(formType, data) {
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

      return inserted;
    },
    async createDeliveryLog(entry) {
      await getDb().insert(formDeliveryLog).values(entry);
    },
  };
}

function withDefaults(overrides: Partial<SubmitFormDependencies>): SubmitFormDependencies {
  return {
    store: createDbSubmissionStore(),
    notify: sendFormNotification,
    now: () => new Date(),
    dedupeWindowMs: DEDUPE_WINDOW_MS,
    ...overrides,
  };
}

async function deliverFormNotification(
  dependencies: SubmitFormDependencies,
  payload: FormNotificationPayload,
) {
  try {
    await dependencies.notify(payload);

    await dependencies.store.createDeliveryLog({
      submissionId: payload.submissionId,
      provider: "resend",
      status: "sent",
      errorMessage: "",
    });
  } catch (error) {
    await dependencies.store.createDeliveryLog({
      submissionId: payload.submissionId,
      provider: "resend",
      status: "failed",
      errorMessage: String(error).slice(0, 512),
    });
  }
}

export function createSubmitForm(overrides: Partial<SubmitFormDependencies> = {}): SubmitFormHandler {
  const dependencies = withDefaults(overrides);

  return async function submitForm(formType: FormType, payload: unknown): Promise<SubmitFormResult> {
    const parsed = baseFormSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        status: 400,
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      };
    }

    const data: SubmitFormInput = parsed.data;
    const cutoff = new Date(dependencies.now().getTime() - dependencies.dedupeWindowMs);
    const duplicate = await dependencies.store.findRecentDuplicateSubmission(formType, data, cutoff);
    if (duplicate) {
      return {
        ok: true,
        status: 200,
        redirectTo: "/thank-you",
        submissionId: duplicate.id,
      };
    }

    const inserted = await dependencies.store.createSubmission(formType, data);
    await deliverFormNotification(dependencies, {
      formType,
      submissionId: inserted.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      sourcePath: data.sourcePath,
    });

    return {
      ok: true,
      status: 201,
      redirectTo: "/thank-you",
      submissionId: inserted.id,
    };
  };
}

export const submitForm = createSubmitForm();
