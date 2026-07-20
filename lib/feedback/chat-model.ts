import { createOpenAI } from "@ai-sdk/openai";
import { gateway } from "ai";

function resolveGatewayModelId() {
  const configured = process.env.FEEDBACK_CHAT_MODEL?.trim() || process.env.NEWSLETTER_CHAT_MODEL?.trim();
  if (!configured) return "openai/gpt-4.1-mini";
  return configured.includes("/") ? configured : `openai/${configured}`;
}

/**
 * Prefer Vercel AI Gateway (OIDC on Vercel, AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN locally).
 * Fall back to direct OpenAI when OPENAI_API_KEY is set and gateway auth is unavailable.
 */
export function createFeedbackChatModel() {
  const canUseGateway = Boolean(
    process.env.VERCEL_ENV ||
      process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  );

  if (canUseGateway) {
    return gateway(resolveGatewayModelId());
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const configured =
      process.env.FEEDBACK_CHAT_MODEL?.trim() ||
      process.env.NEWSLETTER_CHAT_MODEL?.trim() ||
      "gpt-4.1-mini";
    const modelId = configured.includes("/")
      ? configured.split("/").slice(1).join("/")
      : configured;
    return openai(modelId);
  }

  throw new Error(
    "Feedback chat needs AI Gateway auth (VERCEL_OIDC_TOKEN / AI_GATEWAY_API_KEY on Vercel) or OPENAI_API_KEY",
  );
}
