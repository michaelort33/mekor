import type { EventScheduleDay } from "@/lib/templates/template-data";
import { TISHA_BAV_5786_EVENT } from "@/lib/events/tisha-bav-5786";

export type SpecialDaveningSchedule = {
  id: string;
  title: string;
  dateLabel: string;
  startAt: string;
  endAt: string;
  href: string;
  note: string;
  days: EventScheduleDay[];
};

export const SPECIAL_DAVENING_SCHEDULES: SpecialDaveningSchedule[] = [
  {
    id: TISHA_BAV_5786_EVENT.slug,
    title: TISHA_BAV_5786_EVENT.title,
    dateLabel: TISHA_BAV_5786_EVENT.shortDate,
    startAt: TISHA_BAV_5786_EVENT.startAt,
    endAt: TISHA_BAV_5786_EVENT.endAt,
    href: TISHA_BAV_5786_EVENT.path,
    note: "This special timetable replaces the regular Wednesday evening and Thursday service times shown below.",
    days: TISHA_BAV_5786_EVENT.schedule,
  },
];

export function splitSpecialDaveningSchedules(
  schedules: SpecialDaveningSchedule[],
  now: Date,
) {
  const currentTime = now.getTime();
  const upcoming = schedules.filter((schedule) => Date.parse(schedule.endAt) > currentTime);
  const past = schedules.filter((schedule) => Date.parse(schedule.endAt) <= currentTime);

  return { upcoming, past };
}
