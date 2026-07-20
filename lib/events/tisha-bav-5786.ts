import type { EventScheduleDay } from "@/lib/templates/template-data";

export const TISHA_BAV_5786_SCHEDULE: EventScheduleDay[] = [
  {
    dayLabel: "Wednesday, July 22nd",
    items: [
      { time: "8:15pm", label: "Mincha" },
      { time: "8:23pm", label: "Beginning of Fast" },
      { time: "8:30pm", label: "Maariv followed by Megilat Eicha" },
    ],
  },
  {
    dayLabel: "Thursday, July 23rd",
    items: [
      { time: "6:45am", label: "Morning Services" },
      { time: "~7:30am", label: "Kinnot" },
      { time: "1:06pm", label: "Midday" },
      { time: "7:00pm", label: "Class with Rabbi Hirsch" },
      { time: "8:00pm", label: "Mincha" },
      { time: "8:30pm", label: "Maariv" },
      { time: "8:57pm", label: "Fast Ends" },
    ],
  },
];

export const TISHA_BAV_5786_EVENT = {
  id: "a17e2026tishabav5786event000000000abcdef",
  slug: "tisha-bav-5786",
  documentSlug: "events-1__tisha-bav-5786",
  path: "/events-1/tisha-bav-5786",
  title: "Tisha B’Av 5786",
  shortDate: "Jul 22–23, 2026",
  location: "Mekor Habracha / Center City Synagogue",
  timeLabel: "Wed 8:15 PM – Thu 8:57 PM",
  detailTimeLabel: "Wed, Jul 22, 8:15 PM – Thu, Jul 23, 8:57 PM",
  startAt: "2026-07-22T20:15:00-04:00",
  endAt: "2026-07-23T20:57:00-04:00",
  capturedAt: "2026-07-20T12:00:00.000Z",
  featured: true,
  description:
    "Tisha B’Av 5786 at Mekor Habracha / Center City Synagogue — Mincha, the beginning of the fast, and Maariv with Megilat Eicha on Wednesday evening, July 22nd; morning services, Kinnot, a class with Rabbi Hirsch, Mincha, Maariv, and the end of the fast on Thursday, July 23rd.",
  about: [
    "Tisha B’Av 5786 at Mekor Habracha / Center City Synagogue. The full schedule for Wednesday, July 22nd and Thursday, July 23rd is below.",
    "The fast begins on Wednesday, July 22nd at 8:23pm and ends on Thursday, July 23rd at 8:57pm.",
  ],
  searchExcerpt:
    "Tisha B’Av services at Mekor Habracha: Mincha, the beginning of the fast, and Maariv with Megilat Eicha on Wednesday, July 22nd; morning services, Kinnot, a class with Rabbi Hirsch, Mincha, Maariv, and the end of the fast on Thursday, July 23rd.",
  searchTerms: [
    "tisha",
    "b'av",
    "tisha b'av",
    "5786",
    "fast",
    "eicha",
    "kinnot",
    "mincha",
    "maariv",
    "rabbi hirsch",
    "event",
  ],
  schedule: TISHA_BAV_5786_SCHEDULE,
};
