import assert from "node:assert/strict";
import test from "node:test";
import type { UIMessage } from "ai";

import { extractLatestBodyHtmlFromMessages } from "../lib/newsletter/studio-live-html";

test("extractLatestBodyHtmlFromMessages reads newest tool HTML output", () => {
  const messages = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-setTemplateHtml",
          toolCallId: "a",
          toolName: "setTemplateHtml",
          state: "output-available",
          input: { html: "<p>old</p>" },
          output: { ok: true, bodyHtml: "<p>first</p>" },
        },
      ],
    },
    {
      id: "2",
      role: "assistant",
      parts: [
        {
          type: "tool-patchTemplateHtml",
          toolCallId: "b",
          toolName: "patchTemplateHtml",
          state: "output-available",
          input: { find: "first", replace: "second" },
          output: { ok: true, bodyHtml: "<p>second</p>" },
        },
      ],
    },
  ] as unknown as UIMessage[];

  assert.equal(extractLatestBodyHtmlFromMessages(messages), "<p>second</p>");
});

test("extractLatestBodyHtmlFromMessages ignores incomplete tool calls", () => {
  const messages = [
    {
      id: "1",
      role: "assistant",
      parts: [
        {
          type: "tool-setTemplateHtml",
          toolCallId: "a",
          toolName: "setTemplateHtml",
          state: "input-streaming",
          input: { html: "<p>pending</p>" },
        },
      ],
    },
  ] as unknown as UIMessage[];

  assert.equal(extractLatestBodyHtmlFromMessages(messages), null);
});
