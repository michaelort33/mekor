import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DaveningRsvpForm } from "@/components/forms/davening-rsvp-form";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { MyZmanimWidget } from "./myzmanim-widget";
import styles from "./page.module.css";

const PATH = "/davening" as const;
const MINYAN_WHATSAPP_URL = "https://chat.whatsapp.com/INZrPssTZeHK5xrx5ghECF";
const MYZMANIM_WIDGET_EMBED_HTML =
  process.env.MYZMANIM_WIDGET_EMBED_HTML || process.env.NEXT_PUBLIC_MYZMANIM_WIDGET_EMBED_HTML || "";
const MYZMANIM_WIDGET_URL = process.env.MYZMANIM_WIDGET_URL || process.env.NEXT_PUBLIC_MYZMANIM_WIDGET_URL || "";

const DAVENING_IMAGES = {
  hero: "/images/davening/hero.jpg",
} as const;

type ScheduleEntry = {
  label: string;
  time: string;
  detail?: string;
  tone?: "daybreak" | "midday" | "evening";
};

type ScheduleDay = {
  day: string;
  kind: "weekday" | "friday" | "shabbat";
  entries: readonly ScheduleEntry[];
  notes?: readonly string[];
};

const WEEKLY_SCHEDULE: readonly ScheduleDay[] = [
  {
    day: "Sunday",
    kind: "weekday",
    entries: [
      {
        label: "Shacharit",
        time: "8:30 AM",
        detail: "followed by BLT: Bagels, Lox, and Torah",
        tone: "daybreak",
      },
      {
        label: "Mincha followed by Ma'ariv",
        time: "around 15 minutes before sunset",
        detail: "Summer",
        tone: "evening",
      },
      {
        label: "Ma'ariv only",
        time: "6:30 PM",
        detail: "Winter",
        tone: "evening",
      },
    ],
    notes: ["Weekday Mincha/Ma'ariv runs when there is sufficient interest"],
  },
  {
    day: "Monday",
    kind: "weekday",
    entries: [
      { label: "Shacharit", time: "6:45 AM", detail: "Mon / Thu / Rosh Chodesh / Fast days", tone: "daybreak" },
      {
        label: "Mincha followed by Ma'ariv",
        time: "around 15 minutes before sunset",
        detail: "Summer",
        tone: "evening",
      },
      { label: "Ma'ariv only", time: "6:30 PM", detail: "Winter", tone: "evening" },
    ],
    notes: ["Weekday Mincha/Ma'ariv runs when there is sufficient interest"],
  },
  {
    day: "Tuesday",
    kind: "weekday",
    entries: [
      { label: "Shacharit", time: "6:55 AM", detail: "Tue / Wed / Fri", tone: "daybreak" },
      {
        label: "Mincha followed by Ma'ariv",
        time: "around 15 minutes before sunset",
        detail: "Summer",
        tone: "evening",
      },
      { label: "Ma'ariv only", time: "6:30 PM", detail: "Winter", tone: "evening" },
    ],
    notes: ["Weekday Mincha/Ma'ariv runs when there is sufficient interest"],
  },
  {
    day: "Wednesday",
    kind: "weekday",
    entries: [
      { label: "Shacharit", time: "6:55 AM", detail: "Tue / Wed / Fri", tone: "daybreak" },
      {
        label: "Mincha followed by Ma'ariv",
        time: "around 15 minutes before sunset",
        detail: "Summer",
        tone: "evening",
      },
      { label: "Ma'ariv only", time: "6:30 PM", detail: "Winter", tone: "evening" },
    ],
    notes: ["Weekday Mincha/Ma'ariv runs when there is sufficient interest"],
  },
  {
    day: "Thursday",
    kind: "weekday",
    entries: [
      { label: "Shacharit", time: "6:45 AM", detail: "Mon / Thu / Rosh Chodesh / Fast days", tone: "daybreak" },
      {
        label: "Mincha followed by Ma'ariv",
        time: "around 15 minutes before sunset",
        detail: "Summer",
        tone: "evening",
      },
      { label: "Ma'ariv only", time: "6:30 PM", detail: "Winter", tone: "evening" },
    ],
    notes: ["Weekday Mincha/Ma'ariv runs when there is sufficient interest"],
  },
  {
    day: "Friday",
    kind: "friday",
    entries: [
      { label: "Shacharit", time: "6:55 AM", detail: "Tue / Wed / Fri", tone: "daybreak" },
      {
        label: "Mincha / Kabbalat Shabbat / Ma'ariv",
        time: "7:00 PM",
        detail: "Summer",
        tone: "evening",
      },
      {
        label: "Mincha / Kabbalat Shabbat / Ma'ariv",
        time: "around candle-lighting",
        detail: "Winter",
        tone: "evening",
      },
    ],
    notes: ["RSVP by Friday afternoon is appreciated, but you can still come even without RSVP."],
  },
  {
    day: "Shabbat",
    kind: "shabbat",
    entries: [
      { label: "Shacharit", time: "9:15 AM", tone: "daybreak" },
      { label: "Hot Kiddush", time: "around 11:30 AM", tone: "midday" },
      { label: "Shabbat class", time: "~30 min before Mincha (summer)", tone: "midday" },
      { label: "Early Mincha (winter only)", time: "12:20 PM after Kiddush", tone: "midday" },
      { label: "Mincha + Seudah Shlishit", time: "~30 min before sundown", tone: "evening" },
    ],
    notes: ["Visitors are always welcome.", "Early Mincha is in addition to the later Mincha before sundown."],
  },
] as const;

const WEEKDAY_NOTES = [
  "Major secular holidays: 8:30 AM",
  "Weekday morning and evening services are followed by a brief halachic insight from Rabbi Hirsch or Rabbi Gotlib. Amud Yomi follows most morning services.",
  "If you are interested in participating in the weekday morning or evening minyan, kindly email admin@mekorhabracha.org and specify the day(s) you are signing up for.",
  "We will send you an email confirmation if the minyan will take place. You can also join the minyan WhatsApp group to stay up to date on everything.",
  "On occasion, you may find the building door locked. If so, please call the shul at (215) 525-4246 and leave a message to gain access, or wait by the door for one of our members to arrive with a building key.",
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function DaveningPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Services"
        title="Davening at Mekor"
        subtitle="Shabbat and weekday minyanim in Center City"
        className={styles.heroSection}
        image={{
          src: DAVENING_IMAGES.hero,
          alt: "Mekor sanctuary during davening",
          objectFit: "cover",
          objectPosition: "50% 38%",
        }}
        description={[
          "Service times vary seasonally. It is preferred that you RSVP by Friday afternoon by emailing admin@mekorhabracha.org.",
          "However, an RSVP is not required, and you can safely assume there will be a minyan even if you arrive without having RSVP'd. Join the WhatsApp thread and email us to help confirm weekday attendance.",
        ]}
        actions={[
          { label: "Join Minyan WhatsApp", href: MINYAN_WHATSAPP_URL },
          { label: "Email admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
        ]}
      />

      <SectionCard className={`${styles.sectionCard} ${styles.calendarSection}`}>
        <div className={styles.scheduleIntro}>
          <div>
            <p className={styles.scheduleEyebrow}>Shabbat Services</p>
            <h2 className={styles.scheduleTitle}>Weekly Schedule Updates</h2>
          </div>
          <p className={styles.scheduleLead}>
            Exact zmanim can shift each week. For the most current service timing, use the minyan WhatsApp and email
            confirmation.
          </p>
        </div>

        <div className={styles.infoBand}>
          <p>RSVP by afternoon on Friday to mekorhabracha@gmail.com.</p>
          <p>At this time, weekday Mincha and Ma&apos;ariv will only be held if there is sufficient interest.</p>
        </div>

        <div className={styles.desktopCalendar} aria-label="Seven-day davening calendar">
          {WEEKLY_SCHEDULE.map((scheduleDay) => (
            <article key={scheduleDay.day} className={styles.dayColumn} data-kind={scheduleDay.kind}>
              <header className={styles.dayHeader}>
                <p className={styles.dayName}>{scheduleDay.day}</p>
              </header>
              <div className={styles.entryStack}>
                {scheduleDay.entries.map((entry) => (
                  <div key={`${scheduleDay.day}-${entry.label}-${entry.time}`} className={styles.entryCard} data-tone={entry.tone ?? "midday"}>
                    <p className={styles.entryLabel}>{entry.label}</p>
                    <p className={styles.entryTime}>{entry.time}</p>
                    {entry.detail ? <p className={styles.entryDetail}>{entry.detail}</p> : null}
                  </div>
                ))}
              </div>
              {scheduleDay.notes?.length ? (
                <div className={styles.dayNotes}>
                  {scheduleDay.notes.map((note) => (
                    <p key={`${scheduleDay.day}-${note}`}>{note}</p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className={styles.mobileCalendar}>
          {WEEKLY_SCHEDULE.map((scheduleDay) => (
            <article key={`mobile-${scheduleDay.day}`} className={styles.mobileDayCard} data-kind={scheduleDay.kind}>
              <header className={styles.mobileDayHeader}>
                <p className={styles.dayName}>{scheduleDay.day}</p>
              </header>
              <div className={styles.mobileEntryList}>
                {scheduleDay.entries.map((entry) => (
                  <div key={`mobile-${scheduleDay.day}-${entry.label}-${entry.time}`} className={styles.mobileEntryRow}>
                    <div>
                      <p className={styles.entryLabel}>{entry.label}</p>
                      {entry.detail ? <p className={styles.entryDetail}>{entry.detail}</p> : null}
                    </div>
                    <p className={styles.mobileEntryTime}>{entry.time}</p>
                  </div>
                ))}
              </div>
              {scheduleDay.notes?.length ? (
                <div className={styles.dayNotes}>
                  {scheduleDay.notes.map((note) => (
                    <p key={`mobile-${scheduleDay.day}-${note}`}>{note}</p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Live Zmanim"
        description="For up-to-the-minute daily zmanim, use the MyZmanim widget below when available. The Mekor service schedule above remains the primary davening schedule."
        className={styles.sectionCard}
      >
        {MYZMANIM_WIDGET_EMBED_HTML || MYZMANIM_WIDGET_URL ? (
          <div className={styles.zmanimEmbedWrap}>
            <MyZmanimWidget
              embedHtml={MYZMANIM_WIDGET_EMBED_HTML}
              embedUrl={MYZMANIM_WIDGET_URL}
              className={styles.zmanimEmbed}
            />
          </div>
        ) : (
          <div className={styles.zmanimFallback}>
            <p>
              MyZmanim requires an account and a site-specific issued widget embed. To activate the live embed, set
              <code> MYZMANIM_WIDGET_EMBED_HTML</code> or <code> NEXT_PUBLIC_MYZMANIM_WIDGET_EMBED_HTML</code> to the
              issued MyZmanim embed code. If MyZmanim gave you a direct iframe URL instead, <code> MYZMANIM_WIDGET_URL</code>
              and <code> NEXT_PUBLIC_MYZMANIM_WIDGET_URL</code> are still supported.
            </p>
            <CTACluster
              className={styles.linkCluster}
              items={[
                { label: "Open MyZmanim", href: "https://www.myzmanim.com/" },
                { label: "Join Minyan WhatsApp", href: MINYAN_WHATSAPP_URL },
              ]}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Weekday Services"
        description="Please notify us if you plan to attend weekday minyanim."
        className={styles.sectionCard}
      >
        <div className={styles.noteGrid}>
          {WEEKDAY_NOTES.map((note) => (
            <article key={note} className={styles.noteCard}>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="RSVP or Participate"
        description="Use this intake for weekday minyan interest, Shabbat attendance coordination, leining, leading davening, or yahrzeit-related requests."
        className={styles.sectionCard}
      >
        <DaveningRsvpForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard title="Nearby Weekday Minyanim" className={styles.sectionCard}>
        <CTACluster
          className={styles.linkCluster}
          items={[
            { label: "Orthodox Community at Penn (Hillel)", href: "https://pennhillel.org/program/orthodox-community-at-penn/" },
            { label: "Penn OCP Minyan Schedule", href: "https://www.pennocp.org/minyan/" },
            { label: "Mikveh Israel Synagogue", href: "https://www.mikvehisrael.org/" },
            { label: "Bnai Abraham Chabad", href: "https://www.phillyshul.com/" },
            { label: "Lower Merion Synagogue", href: "https://www.lowermerionsynagogue.org/" },
            { label: "Young Israel of the Main Line", href: "https://www.yiml.org/" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Participate in Davening" className={`${styles.sectionCard} ${styles.participateCard}`}>
        <p className={styles.noteText}>
          Interested in reading Torah or Haftorah, or leading davening? Have an upcoming yahrzeit? Reach out and we
          will help coordinate.
        </p>
        <CTACluster
          className={styles.linkCluster}
          items={[
            { label: "Sign up by Email", href: "mailto:admin@mekorhabracha.org?subject=Davening%20Participation" },
            { label: "Call (215) 525-4246", href: "tel:+12155254246" },
            { label: "View Events Calendar", href: "/events" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
