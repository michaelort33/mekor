import type {
  ArchiveTemplateData,
  ArticleTemplateData,
  EventTemplateData,
  ProfileTemplateData,
} from "@/lib/templates/template-data";

export type NativeDocumentType =
  | "page"
  | "post"
  | "news"
  | "event"
  | "category"
  | "tag"
  | "profile";

export type NativeContentDocument = {
  id: string;
  type: NativeDocumentType;
  path: string;
  url: string;
  slug: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  capturedAt: string;
};

export type NativeContentIndexRecord = {
  path: string;
  type: NativeDocumentType;
  file: string;
};

export type NativeSearchIndexRecord = {
  path: string;
  type: NativeDocumentType;
  title: string;
  description: string;
  excerpt: string;
  terms: string[];
};

export type NativeRouteContractRecord = {
  path: string;
  sourceUrl: string;
};

export type NativeStatusOverrideRecord = {
  path: string;
  status: number;
  sourceUrl: string;
};

export type NativeAliasRecord = {
  from: string;
  to: string;
  reason: string;
};

export type NativeArticleTemplateRecord = {
  kind: "article";
  document: NativeContentDocument;
  data: ArticleTemplateData;
};

export type NativeEventTemplateRecord = {
  kind: "event";
  document: NativeContentDocument;
  data: EventTemplateData;
};

export type NativeProfileTemplateRecord = {
  kind: "profile";
  document: NativeContentDocument;
  data: ProfileTemplateData;
};

export type NativeArchiveTemplateRecord = {
  kind: "archive";
  document: NativeContentDocument;
  data: ArchiveTemplateData;
};

export type NativeTemplateRecord =
  | NativeArticleTemplateRecord
  | NativeEventTemplateRecord
  | NativeProfileTemplateRecord
  | NativeArchiveTemplateRecord;

export type NativeGeneratedRouteData = {
  canonical: NativeRouteContractRecord[];
  reachable: NativeRouteContractRecord[];
  statusOverrides: NativeStatusOverrideRecord[];
  aliases: NativeAliasRecord[];
};
