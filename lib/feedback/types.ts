export const SITE_SUGGESTION_KINDS = [
  "suggestion",
  "feedback",
  "bug",
  "praise",
  "other",
] as const;

export type SiteSuggestionKind = (typeof SITE_SUGGESTION_KINDS)[number];

export const SITE_SUGGESTION_STATUSES = ["new", "reviewed", "archived"] as const;

export type SiteSuggestionStatus = (typeof SITE_SUGGESTION_STATUSES)[number];

export const SITE_SUGGESTION_PRIORITIES = ["low", "normal", "high"] as const;

export type SiteSuggestionPriority = (typeof SITE_SUGGESTION_PRIORITIES)[number];

export type FeedbackTranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SiteSuggestionSummary = {
  id: number;
  sessionId: number;
  kind: SiteSuggestionKind;
  title: string;
  body: string;
  categoryDetail: string;
  contactName: string;
  contactEmail: string;
  priority: SiteSuggestionPriority;
  status: SiteSuggestionStatus;
  adminNotes: string;
  sourcePath: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SiteSuggestionDetail = SiteSuggestionSummary & {
  sessionPublicId: string;
  transcript: FeedbackTranscriptMessage[];
};

export function getSuggestionKindLabel(kind: SiteSuggestionKind): string {
  switch (kind) {
    case "suggestion":
      return "Suggestion";
    case "feedback":
      return "Feedback";
    case "bug":
      return "Bug";
    case "praise":
      return "Praise";
    case "other":
      return "Other";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function getSuggestionStatusLabel(status: SiteSuggestionStatus): string {
  switch (status) {
    case "new":
      return "New";
    case "reviewed":
      return "Reviewed";
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function isSiteSuggestionStatus(value: string): value is SiteSuggestionStatus {
  return (SITE_SUGGESTION_STATUSES as readonly string[]).includes(value);
}

export function isSiteSuggestionKind(value: string): value is SiteSuggestionKind {
  return (SITE_SUGGESTION_KINDS as readonly string[]).includes(value);
}
