import { getToolName, isToolUIPart, type UIMessage } from "ai";

/**
 * Pull the newest HTML snapshot from completed chat tool results so the
 * studio editor/preview can update live without a full page refresh.
 */
export function extractLatestBodyHtmlFromMessages(messages: UIMessage[]): string | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (!message) continue;
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex];
      if (!isToolUIPart(part)) continue;
      const toolName = getToolName(part);
      if (toolName !== "setTemplateHtml" && toolName !== "patchTemplateHtml") continue;
      if (!("state" in part) || part.state !== "output-available") continue;
      const output = "output" in part ? part.output : null;
      if (!output || typeof output !== "object") continue;
      const bodyHtml = (output as { bodyHtml?: unknown }).bodyHtml;
      if (typeof bodyHtml === "string" && bodyHtml.trim()) {
        return bodyHtml;
      }
    }
  }
  return null;
}
