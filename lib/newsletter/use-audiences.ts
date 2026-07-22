"use client";

import { useEffect, useState } from "react";

import { NEWSLETTER_AUDIENCE_OPTIONS } from "@/lib/newsletter/recipient-lists";

export type NewsletterAudienceChoice = {
  key: string;
  name: string;
  description: string;
  recipientGroup: "recipient_list" | "newsletter_subscribers" | "admins_only";
  topic?: string;
  count?: number;
};

/** Static fallback shown until the live audience list (with subscriber counts) arrives. */
const STATIC_AUDIENCES: NewsletterAudienceChoice[] = NEWSLETTER_AUDIENCE_OPTIONS.map((option) => ({
  key: option.key,
  name: option.name,
  description: option.description,
  recipientGroup: option.recipientGroup,
  topic: option.key === "newsletter_subscribers" ? "weekly" : undefined,
}));

/**
 * Audience options for the newsletter wizard and Studio, fetched from the
 * database (every subscription topic with live counts). Server components
 * can pass `initialAudiences` (from listNewsletterAudiences) so the first
 * render is already correct; otherwise the hardcoded trio fills in until
 * the fetch lands.
 */
export function useNewsletterAudiences(initialAudiences?: NewsletterAudienceChoice[]) {
  const [audiences, setAudiences] = useState<NewsletterAudienceChoice[]>(
    initialAudiences?.length ? initialAudiences : STATIC_AUDIENCES,
  );
  const [audiencesLoaded, setAudiencesLoaded] = useState(Boolean(initialAudiences?.length));

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/admin/templates/audiences");
        if (!response.ok) return;
        const payload = (await response.json().catch(() => ({}))) as {
          audiences?: NewsletterAudienceChoice[];
        };
        if (active && payload.audiences?.length) {
          setAudiences(payload.audiences);
        }
      } catch {
        // Keep the static fallback.
      } finally {
        if (active) setAudiencesLoaded(true);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return { audiences, audiencesLoaded };
}
