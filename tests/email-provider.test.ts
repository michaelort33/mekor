import assert from "node:assert/strict";
import test from "node:test";

import { sendEventOrganizerMessage } from "../lib/events/email";
import { sendFormConfirmation, sendFormNotification } from "../lib/forms/email";

test("form and event emails use SendGrid with the Mekor admin address", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.SENDGRID_API_KEY;
  const originalFrom = process.env.FORM_NOTIFY_EMAIL_FROM;
  const originalTo = process.env.FORM_NOTIFY_EMAIL_TO;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  process.env.SENDGRID_API_KEY = "SG.test-key";
  process.env.FORM_NOTIFY_EMAIL_FROM = "admin@mekorhabracha.org";
  process.env.FORM_NOTIFY_EMAIL_TO = "admin@mekorhabracha.org";
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      init,
    });
    return new Response(null, {
      status: 202,
      headers: { "x-message-id": `msg_${calls.length}` },
    });
  };

  try {
    const formPayload = {
      formType: "contact",
      name: "Test Person",
      email: "person@example.com",
      phone: "",
      message: "Please send more information.",
      sourcePath: "/contact-us",
      submissionId: 42,
    };
    await sendFormNotification(formPayload);
    await sendFormConfirmation(formPayload);
    await sendEventOrganizerMessage({
      organizerEmail: "organizer@example.com",
      eventTitle: "Community Dinner",
      senderName: "Test Person",
      senderEmail: "person@example.com",
      subject: "Dietary question",
      message: "Is a vegetarian option available?",
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SENDGRID_API_KEY = originalApiKey;
    process.env.FORM_NOTIFY_EMAIL_FROM = originalFrom;
    process.env.FORM_NOTIFY_EMAIL_TO = originalTo;
  }

  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.url, "https://api.sendgrid.com/v3/mail/send");
    assert.equal(call.init?.method, "POST");
    const body = JSON.parse(String(call.init?.body));
    assert.equal(body.from.email, "admin@mekorhabracha.org");
  }

  const notification = JSON.parse(String(calls[0]?.init?.body));
  assert.equal(notification.personalizations[0].to[0].email, "admin@mekorhabracha.org");
  assert.equal(notification.reply_to.email, "person@example.com");

  const confirmation = JSON.parse(String(calls[1]?.init?.body));
  assert.equal(confirmation.personalizations[0].to[0].email, "person@example.com");
  assert.equal(confirmation.reply_to.email, "admin@mekorhabracha.org");

  const organizerMessage = JSON.parse(String(calls[2]?.init?.body));
  assert.equal(organizerMessage.personalizations[0].to[0].email, "organizer@example.com");
  assert.equal(organizerMessage.reply_to.email, "person@example.com");
});
