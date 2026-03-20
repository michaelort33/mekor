export type RecurringEvent = {
  title: string;
  path: string;
  heroImage: string;
  cadenceLabel: string;
  scheduleLabel: string;
  location: string;
  summary: string;
};

export const RECURRING_EVENTS: RecurringEvent[] = [
  {
    title: "Mekor's Tot Shabbat",
    path: "/events-1/mekors-tot-shabbat",
    heroImage:
      "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6de32ece86908e29e156c0a76ca5708648f3d311-92f487_a7ee1919f498484d90fb90f912123602-mv2.png",
    cadenceLabel: "Once a month",
    scheduleLabel: "Last Shabbat of the English month around 11 AM",
    location: "Philadelphia",
    summary: "Parsha, songs, and stories for young children and families.",
  },
] as const;
