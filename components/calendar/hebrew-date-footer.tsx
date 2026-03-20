"use client";

import { useEffect, useState } from "react";

const HEBREW_CALENDAR_LOCALE = "en-US-u-ca-hebrew";
const MEKOR_TIME_ZONE = "America/New_York";
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function formatHebrewDate(date: Date) {
  return new Intl.DateTimeFormat(HEBREW_CALENDAR_LOCALE, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: MEKOR_TIME_ZONE,
  }).format(date);
}

type HebrewDateFooterProps = {
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export function HebrewDateFooter({
  className,
  labelClassName,
  valueClassName,
}: HebrewDateFooterProps) {
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const updateDate = () => {
      setFormattedDate(formatHebrewDate(new Date()));
    };

    updateDate();

    const intervalId = window.setInterval(updateDate, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className={className}>
      <span className={labelClassName}>Hebrew date</span>
      <span className={valueClassName}>{formattedDate || "Loading..."}</span>
    </div>
  );
}
