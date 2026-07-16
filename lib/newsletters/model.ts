export const NEWSLETTER_CATEGORY_LABELS = {
  weekly: "Weekly Newsletter",
  community: "Community",
  events: "Events",
  eruv: "Eruv",
  classes: "Classes",
} as const;

export type NewsletterCategory = keyof typeof NEWSLETTER_CATEGORY_LABELS;

export type NewsletterContentNode =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "image"; src: string; alt: string }
  | { type: "link"; href: string; children: NewsletterContentNode[] }
  | {
      type: "element";
      tag: string;
      children: NewsletterContentNode[];
      align?: "left" | "center" | "right" | "justify";
      variant?: "small" | "large";
      id?: string;
    };

export type NewsletterBlock =
  | { kind: "rich"; nodes: NewsletterContentNode[] }
  | { kind: "image"; node: Extract<NewsletterContentNode, { type: "image" }>; href?: string }
  | { kind: "divider" }
  | { kind: "button"; label: string; href: string }
  | { kind: "links"; links: { label: string; href: string }[] };

export type NewsletterTocItem = {
  id: string;
  label: string;
  level: number;
};

export type Newsletter = {
  slug: string;
  campaignId: string;
  title: string;
  category: NewsletterCategory;
  sentOn: string;
  preview: string;
  coverImage: string | null;
  readingMinutes: number;
  searchText: string;
  toc: NewsletterTocItem[];
  blocks: NewsletterBlock[];
  bodyHtml?: string;
};

export type NewsletterSummary = Pick<
  Newsletter,
  "slug" | "title" | "category" | "sentOn" | "preview" | "coverImage" | "readingMinutes" | "searchText"
>;

export function formatNewsletterDate(sentOn: string, format: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: format === "long" ? "long" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${sentOn}T12:00:00Z`));
}
