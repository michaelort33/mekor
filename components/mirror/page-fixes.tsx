"use client";

import { useEffect } from "react";

type Props = {
  path: string;
};

const HOMEPAGE_MAP_IFRAME_SRC =
  "https://maps.google.com/maps?q=1500%20Walnut%20St%20Suite%20206%20Philadelphia%20PA&t=&z=15&ie=UTF8&iwloc=&output=embed";
const HOMEPAGE_DIRECTIONS_HREF =
  "https://www.google.com/maps/dir/?api=1&destination=1500+Walnut+St+Suite+206+Philadelphia+PA+19102";
const EVENTS_CALENDAR_EMBED_SRC =
  "https://calendar.google.com/calendar/embed?src=david%40mekorhabracha.org&ctz=America%2FNew_York";

function normalizePath(path: string) {
  if (!path || path === "") {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function ensureHomepageMapEmbed() {
  const mapRoot = document.getElementById("comp-m5vlffw5");
  if (!mapRoot || mapRoot.querySelector("iframe")) {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.title = "Mekor Habracha Synagogue Map";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.src = HOMEPAGE_MAP_IFRAME_SRC;
  iframe.setAttribute("allowFullScreen", "");

  const directions = document.createElement("a");
  directions.href = HOMEPAGE_DIRECTIONS_HREF;
  directions.target = "_blank";
  directions.rel = "noreferrer noopener";
  directions.textContent = "Directions";
  directions.className = "mirror-map-directions-link";

  mapRoot.append(iframe, directions);
}

function ensureEventsCalendarEmbed() {
  const calendarFrame = document.querySelector<HTMLIFrameElement>("#comp-lvvd3qr7 iframe");
  if (calendarFrame && !calendarFrame.getAttribute("src")) {
    calendarFrame.src = EVENTS_CALENDAR_EMBED_SRC;
  }

  const wedge = document.querySelector<HTMLElement>(
    '[data-mesh-id="comp-m5ss52xcinlineContent-wedge-5"]',
  );
  if (wedge) {
    wedge.style.display = "none";
    wedge.style.height = "0";
  }
}

export function PageFixes({ path }: Props) {
  const normalizedPath = normalizePath(path);

  useEffect(() => {
    if (normalizedPath === "/") {
      ensureHomepageMapEmbed();
      return;
    }

    if (normalizedPath === "/events") {
      ensureEventsCalendarEmbed();
    }
  }, [normalizedPath]);

  return null;
}
