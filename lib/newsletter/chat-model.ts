import { createOpenAI } from "@ai-sdk/openai";

/**
 * Prefer Vercel AI Gateway when configured; otherwise use OpenAI directly.
 */
export function createNewsletterChatModel() {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (gatewayKey) {
    const gateway = createOpenAI({
      apiKey: gatewayKey,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });
    const modelId = process.env.NEWSLETTER_CHAT_MODEL?.trim() || "openai/gpt-4.1-mini";
    return gateway(modelId);
  }

  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const modelId =
      process.env.NEWSLETTER_CHAT_MODEL?.trim() ||
      process.env.OPENAI_EMAIL_TEMPLATE_MODEL?.trim() ||
      "gpt-4.1-mini";
    return openai(modelId);
  }

  throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for newsletter chat");
}
