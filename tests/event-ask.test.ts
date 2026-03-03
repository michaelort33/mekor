import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { handleEventAskPost } from "../app/api/forms/event-ask/route";
import { AskOrganizerForm } from "../components/events/ask-organizer-form";
import { createSubmitForm, type FormSubmissionStore } from "../lib/forms/submit";

type SubmissionRecord = {
  id: number;
  formType: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  sourcePath: string;
  createdAt: Date;
};

type DeliveryLogRecord = {
  submissionId: number;
  provider: string;
  status: string;
  errorMessage: string;
};

function createMemoryStore(now: () => Date) {
  let nextId = 1;
  const submissions: SubmissionRecord[] = [];
  const deliveryLogs: DeliveryLogRecord[] = [];

  const store: FormSubmissionStore = {
    async findRecentDuplicateSubmission(formType, data, cutoff) {
      const existing = submissions.find(
        (submission) =>
          submission.formType === formType &&
          submission.name === data.name &&
          submission.email === data.email &&
          submission.phone === data.phone &&
          submission.message === data.message &&
          submission.sourcePath === data.sourcePath &&
          submission.createdAt >= cutoff,
      );

      return existing ? { id: existing.id } : null;
    },
    async createSubmission(formType, data) {
      const created = {
        id: nextId,
        formType,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        sourcePath: data.sourcePath,
        createdAt: now(),
      };
      submissions.push(created);
      nextId += 1;
      return { id: created.id };
    },
    async createDeliveryLog(entry) {
      deliveryLogs.push(entry);
    },
  };

  return {
    store,
    submissions,
    deliveryLogs,
  };
}

test("event-ask API returns 400 and field issues for invalid payload", async () => {
  const now = () => new Date("2026-03-01T10:00:00.000Z");
  const { store } = createMemoryStore(now);
  const submit = createSubmitForm({
    store,
    notify: async () => {},
    now,
  });

  const response = await handleEventAskPost(
    new Request("http://localhost/api/forms/event-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        email: "not-an-email",
        message: "",
        sourcePath: "/events-1/test-event",
      }),
    }),
    submit,
  );

  const body = (await response.json()) as {
    error: string;
    issues: {
      fieldErrors: Record<string, string[] | undefined>;
    };
  };

  assert.equal(response.status, 400);
  assert.equal(body.error, "Invalid payload");
  assert.ok(body.issues.fieldErrors.name?.length);
  assert.ok(body.issues.fieldErrors.email?.length);
  assert.ok(body.issues.fieldErrors.message?.length);
});

test("event-ask API accepts valid payload and returns submission id", async () => {
  const now = () => new Date("2026-03-01T10:00:00.000Z");
  const { store, submissions, deliveryLogs } = createMemoryStore(now);
  const submit = createSubmitForm({
    store,
    notify: async () => {},
    now,
  });

  const response = await handleEventAskPost(
    new Request("http://localhost/api/forms/event-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Leah Cohen",
        email: "leah@example.com",
        phone: "2155550101",
        message: "Can I bring a guest?",
        sourcePath: "/events-1/mekor-pesach-seders",
      }),
    }),
    submit,
  );

  const body = (await response.json()) as {
    ok: boolean;
    submissionId: number;
    redirectTo: string;
  };

  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.submissionId, 1);
  assert.equal(body.redirectTo, "/thank-you");
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0]?.formType, "event-ask");
  assert.equal(submissions[0]?.sourcePath, "/events-1/mekor-pesach-seders");
  assert.equal(deliveryLogs.length, 1);
  assert.equal(deliveryLogs[0]?.status, "sent");
});

test("event-ask API dedupes identical submissions within 10 minutes", async () => {
  let currentTime = new Date("2026-03-01T10:00:00.000Z");
  const now = () => currentTime;
  const { store, submissions, deliveryLogs } = createMemoryStore(now);
  const submit = createSubmitForm({
    store,
    notify: async () => {},
    now,
  });

  const requestPayload = {
    name: "Leah Cohen",
    email: "leah@example.com",
    phone: "2155550101",
    message: "Can I bring a guest?",
    sourcePath: "/events-1/mekor-pesach-seders",
  };

  const firstResponse = await handleEventAskPost(
    new Request("http://localhost/api/forms/event-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    }),
    submit,
  );
  assert.equal(firstResponse.status, 201);

  currentTime = new Date("2026-03-01T10:05:00.000Z");
  const secondResponse = await handleEventAskPost(
    new Request("http://localhost/api/forms/event-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    }),
    submit,
  );
  const secondBody = (await secondResponse.json()) as { submissionId: number };

  assert.equal(secondResponse.status, 200);
  assert.equal(secondBody.submissionId, 1);
  assert.equal(submissions.length, 1);
  assert.equal(deliveryLogs.length, 1);
});

test("ask organizer form includes required privacy copy", () => {
  const html = renderToStaticMarkup(
    createElement(AskOrganizerForm, {
      sourcePath: "/events-1/mekor-pesach-seders",
      eventTitle: "Mekor Pesach Seders",
    }),
  );

  assert.match(html, /Ask organizer/i);
  assert.match(html, /Your message is private and goes directly to staff\./);
  assert.match(html, /Send to organizer/);
});

test("event template wires ask organizer form and keeps comments disabled", async () => {
  const filePath = path.join(process.cwd(), "components/templates/event-template.tsx");
  const source = await fs.readFile(filePath, "utf8");

  assert.match(source, /AskOrganizerForm/);
  assert.match(source, /sourcePath=\{data\.path\}/);
  assert.match(source, /eventTitle=\{data\.title\}/);
  assert.equal(source.includes("comment-thread"), false);
  assert.equal(source.includes("comment-form"), false);
  assert.equal(source.includes("comments-count"), false);
});
