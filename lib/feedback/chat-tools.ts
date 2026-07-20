import { tool } from "ai";

import { saveSuggestionInputSchema } from "@/lib/feedback/save-suggestion-schema";
import { saveSuggestionFromTool } from "@/lib/feedback/service";

export type FeedbackChatToolContext = {
  sessionId: number;
  sourcePath: string;
};

export function createFeedbackChatTools(ctx: FeedbackChatToolContext) {
  return {
    saveSuggestion: tool({
      description:
        "Persist a structured site suggestion or feedback item once you have enough detail from the visitor.",
      inputSchema: saveSuggestionInputSchema,
      execute: async (payload) => {
        const result = await saveSuggestionFromTool({
          sessionId: ctx.sessionId,
          sourcePath: ctx.sourcePath,
          payload,
        });
        return {
          ok: true,
          suggestionId: result.suggestionId,
          message: "Saved for the Mekor team. Thank the visitor warmly.",
        };
      },
    }),
  };
}
