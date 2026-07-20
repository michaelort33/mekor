import type { EventTemplateData } from "@/lib/templates/template-data";
import {
  absoluteSiteUrl,
  ORGANIZATION_ID,
  ORGANIZATION_LOGO,
  SITE_ALTERNATE_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  WEBSITE_ID,
} from "@/lib/seo/site";

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export const SITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": ORGANIZATION_ID },
      inLanguage: "en-US",
    },
    {
      "@type": ["Organization", "PlaceOfWorship"],
      "@id": ORGANIZATION_ID,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      description: SITE_DESCRIPTION,
      logo: {
        "@type": "ImageObject",
        url: ORGANIZATION_LOGO,
      },
      image: ORGANIZATION_LOGO,
      email: "admin@mekorhabracha.org",
      telephone: "+1-215-525-4246",
      address: {
        "@type": "PostalAddress",
        streetAddress: "1500 Walnut St, Suite 206",
        addressLocality: "Philadelphia",
        addressRegion: "PA",
        postalCode: "19102",
        addressCountry: "US",
      },
      sameAs: [
        "https://www.instagram.com/mekorhabracha/",
        "https://www.youtube.com/channel/UCfj7vuvPA80HMVN-09ZxOHA",
      ],
    },
  ],
};

export function buildEventStructuredData(data: EventTemplateData) {
  if (!data.startAt) {
    return null;
  }

  const locationIsMekor = /mekor habracha|center city synagogue/i.test(data.location);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.title,
    description: data.subtitle || data.about.join(" "),
    startDate: data.startAt,
    ...(data.endAt ? { endDate: data.endAt } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteSiteUrl(data.path),
    organizer: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(data.location
      ? {
          location: {
            "@type": "Place",
            name: data.location,
            ...(locationIsMekor
              ? {
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "1500 Walnut St, Suite 206",
                    addressLocality: "Philadelphia",
                    addressRegion: "PA",
                    postalCode: "19102",
                    addressCountry: "US",
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(data.heroImage ? { image: [absoluteSiteUrl(data.heroImage)] } : {}),
  };
}

export function buildArticleStructuredData(input: {
  path: string;
  title: string;
  description: string;
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
  image?: string | null;
}) {
  const datePublished = input.datePublished
    ? new Date(input.datePublished).toISOString()
    : undefined;
  const dateModified = input.dateModified
    ? new Date(input.dateModified).toISOString()
    : datePublished;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteSiteUrl(input.path),
    url: absoluteSiteUrl(input.path),
    publisher: { "@id": ORGANIZATION_ID },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(input.image ? { image: [absoluteSiteUrl(input.image)] } : {}),
  };
}

export function buildQuestionStructuredData(input: {
  path: string;
  title: string;
  body: string;
  askerName: string;
  createdAt: Date;
  replies: Array<{
    body: string;
    authorDisplayName: string;
    createdAt: Date;
  }>;
}) {
  const answers = input.replies.map((reply) => ({
    "@type": "Answer",
    text: reply.body,
    dateCreated: reply.createdAt.toISOString(),
    author: {
      "@type": "Person",
      name: reply.authorDisplayName,
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: input.title,
      text: input.body,
      dateCreated: input.createdAt.toISOString(),
      author: {
        "@type": "Person",
        name: input.askerName,
      },
      answerCount: answers.length,
      ...(answers[0] ? { acceptedAnswer: answers[0] } : {}),
      ...(answers.length > 1 ? { suggestedAnswer: answers.slice(1) } : {}),
    },
    url: absoluteSiteUrl(input.path),
  };
}
