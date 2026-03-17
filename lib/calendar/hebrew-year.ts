const HEBREW_CALENDAR_LOCALE = "en-US-u-ca-hebrew";
const MEKOR_TIME_ZONE = "America/New_York";

export type HebrewYearContext = {
  currentHebrewYear: number;
  currentHebrewYearLabel: string;
  nextRoshHashanaHebrewYear: number;
  nextRoshHashanaHebrewYearLabel: string;
  currentCivilSpanLabel: string;
};

function getHebrewYearPart(date: Date) {
  const formatter = new Intl.DateTimeFormat(HEBREW_CALENDAR_LOCALE, {
    year: "numeric",
    timeZone: MEKOR_TIME_ZONE,
  });

  const yearPart = formatter.formatToParts(date).find((part) => part.type === "year")?.value ?? "";
  const normalizedYear = Number.parseInt(yearPart.replace(/[^\d]/g, ""), 10);

  if (!Number.isFinite(normalizedYear)) {
    throw new Error(`Unable to derive Hebrew year from formatted value: ${yearPart}`);
  }

  return normalizedYear;
}

function getCivilSpanLabel(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    timeZone: MEKOR_TIME_ZONE,
  });
  const parts = formatter.formatToParts(date);
  const gregorianYear = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "", 10);
  const gregorianMonth = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "", 10);

  if (!Number.isFinite(gregorianYear) || !Number.isFinite(gregorianMonth)) {
    throw new Error("Unable to derive Gregorian civil span for Hebrew year");
  }

  if (gregorianMonth >= 9) {
    return `${gregorianYear}-${gregorianYear + 1}`;
  }

  return `${gregorianYear - 1}-${gregorianYear}`;
}

export function getHebrewYearContext(date = new Date()): HebrewYearContext {
  const currentHebrewYear = getHebrewYearPart(date);
  const nextRoshHashanaHebrewYear = currentHebrewYear + 1;

  return {
    currentHebrewYear,
    currentHebrewYearLabel: String(currentHebrewYear),
    nextRoshHashanaHebrewYear,
    nextRoshHashanaHebrewYearLabel: String(nextRoshHashanaHebrewYear),
    currentCivilSpanLabel: getCivilSpanLabel(date),
  };
}

export function getCurrentHebrewYear() {
  return getHebrewYearContext().currentHebrewYear;
}
