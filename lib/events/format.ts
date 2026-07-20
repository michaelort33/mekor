export const EVENT_TIME_ZONE = "America/New_York";

export type EventDateParts = {
  year: number;
  monthIndex: number;
  day: number;
  monthShort: string;
  monthLong: string;
  weekdayShort: string;
};

type ZoneFormatters = {
  numeric: Intl.DateTimeFormat;
  monthShort: Intl.DateTimeFormat;
  monthLong: Intl.DateTimeFormat;
  weekdayShort: Intl.DateTimeFormat;
};

const formattersByZone = new Map<string, ZoneFormatters>();

function getFormatters(timeZone: string): ZoneFormatters {
  const cached = formattersByZone.get(timeZone);
  if (cached) {
    return cached;
  }

  const created: ZoneFormatters = {
    numeric: new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }),
    monthShort: new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }),
    monthLong: new Intl.DateTimeFormat("en-US", { timeZone, month: "long" }),
    weekdayShort: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }),
  };
  formattersByZone.set(timeZone, created);
  return created;
}

function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getEventDateParts(
  value: string | Date | null | undefined,
  timeZone: string = EVENT_TIME_ZONE,
): EventDateParts | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }

  const formatters = getFormatters(timeZone);
  const lookup = new Map(
    formatters.numeric.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const year = Number(lookup.get("year"));
  const month = Number(lookup.get("month"));
  const day = Number(lookup.get("day"));

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
    day,
    monthShort: formatters.monthShort.format(date),
    monthLong: formatters.monthLong.format(date),
    weekdayShort: formatters.weekdayShort.format(date),
  };
}
