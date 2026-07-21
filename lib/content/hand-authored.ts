import type {
  NativeContentDocument,
  NativeContentIndexRecord,
  NativeGeneratedRouteData,
  NativeSearchIndexRecord,
  NativeTemplateRecord,
} from "@/lib/content/types";
import { TISHA_BAV_5786_EVENT } from "@/lib/events/tisha-bav-5786";

const event = TISHA_BAV_5786_EVENT;
const eventUrl = `https://www.mekorhabracha.org${event.path}`;

const tishaBavDocument: NativeContentDocument = {
  id: event.id,
  type: "event",
  path: event.path,
  url: eventUrl,
  slug: event.documentSlug,
  title: event.title,
  description: event.description,
  canonical: event.path,
  ogTitle: event.title,
  ogDescription: event.description,
  ogImage: "",
  twitterCard: "summary_large_image",
  twitterTitle: event.title,
  twitterDescription: event.description,
  capturedAt: event.capturedAt,
};

export const HAND_AUTHORED_DOCUMENTS: NativeContentDocument[] = [tishaBavDocument];

export const HAND_AUTHORED_INDEX: NativeContentIndexRecord[] = [
  {
    path: event.path,
    type: "event",
    file: "documents/event/events-1__tisha-bav-5786--a17e2026tis.json",
  },
];

export const HAND_AUTHORED_TEMPLATES: NativeTemplateRecord[] = [
  {
    kind: "event",
    document: tishaBavDocument,
    data: {
      path: event.path,
      eventId: null,
      title: event.title,
      subtitle: event.description,
      heroImage: "",
      shortDate: event.shortDate,
      location: event.location,
      timeLabel: event.detailTimeLabel,
      startAt: event.startAt,
      endAt: event.endAt,
      isClosed: false,
      isPast: false,
      isSpecialSchedule: event.specialSchedule,
      scheduleTitle: "Tisha B’Av service schedule",
      scheduleNote:
        "These special service times replace the regular Davening schedule on Wednesday evening and Thursday.",
      signupEnabled: false,
      about: event.about,
      schedule: event.schedule,
      seeOtherEventsHref: "/events",
    },
  },
];

export const HAND_AUTHORED_ROUTES: Pick<NativeGeneratedRouteData, "canonical" | "reachable"> = {
  canonical: [{ path: event.path, sourceUrl: eventUrl }],
  reachable: [],
};

export const HAND_AUTHORED_SEARCH: NativeSearchIndexRecord[] = [
  {
    path: event.path,
    type: "event",
    title: event.title,
    description: event.description,
    excerpt: event.searchExcerpt,
    terms: event.searchTerms,
  },
];
