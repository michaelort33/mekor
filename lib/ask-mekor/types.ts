export type QuestionVisibility = "public" | "private";
export type QuestionStatus = "open" | "answered" | "closed";

export type QuestionSubcategory = {
  id: number;
  categoryId: number;
  slug: string;
  label: string;
  description: string;
  position: number;
  publicQuestionCount: number;
};

export type QuestionCategory = {
  id: number;
  slug: string;
  label: string;
  description: string;
  position: number;
  publicQuestionCount: number;
  subcategories: QuestionSubcategory[];
};

export type AskMekorReply = {
  id: number;
  authorUserId: number;
  authorDisplayName: string;
  body: string;
  createdAt: Date;
};

export type AskMekorThreadMessage = {
  id: number;
  senderUserId: number | null;
  senderDisplayName: string | null;
  messageType: "text" | "system" | "action";
  body: string;
  createdAt: Date;
};

export type AskMekorQuestionSummary = {
  id: number;
  slug: string;
  title: string;
  visibility: QuestionVisibility;
  status: QuestionStatus;
  category: QuestionCategory;
  subcategory: QuestionSubcategory | null;
  askerName: string;
  publicAnonymous: boolean;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  answeredAt: Date | null;
};

export type AskMekorQuestionDetail = AskMekorQuestionSummary & {
  body: string;
  askerEmail: string;
  askerPhone: string;
  askerUserId: number | null;
  sourcePath: string;
  linkedThreadId: number | null;
  replies: AskMekorReply[];
  threadMessages: AskMekorThreadMessage[];
};
