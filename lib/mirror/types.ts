export type DocumentType =
  | "page"
  | "post"
  | "news"
  | "event"
  | "category"
  | "tag"
  | "profile";

export type RouteContractRecord = {
  path: string;
  sourceUrl: string;
};

export type StatusOverrideRecord = {
  path: string;
  status: number;
  sourceUrl: string;
};

export type AliasRecord = {
  from: string;
  to: string;
  reason: string;
};

export type PageDocument = {
  id: string;
  type: DocumentType;
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
  headings: string[];
  text: string;
  textHash: string;
  links: string[];
  assets: string[];
  renderHtml: string;
  capturedAt: string;
};

export type ContentIndexRecord = {
  path: string;
  type: DocumentType;
  file: string;
};

export type AssetCandidateRecord = {
  sourceType: "zip" | "snapshot";
  sourceUrl: string;
  localPath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  sha1: string;
};

export type AssetBlobRecord = {
  sourceUrl: string;
  path: string;
  blobKey: string;
  blobUrl: string;
  contentType: string;
  sha1: string;
  size: number;
};

export type SearchIndexRecord = {
  path: string;
  type: DocumentType;
  title: string;
  description: string;
  excerpt: string;
  terms: string[];
};
