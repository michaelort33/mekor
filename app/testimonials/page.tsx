import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, InlineLink, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/testimonials" as const;

const TESTIMONIAL_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8f6095dacde5336ede21eca03b236b3baee040f1-hero.jpg",
  banner: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/606d00884c50bd0bf7c802b228aa2a0be6372063-banner.jpg",
} as const;

const TESTIMONIALS = [
  {
    quote:
      "This donation to your discretionary fund is in honor of the publication of your insightful guide, Bringing Order to the Seder. Kol Hakavod, Rabbi Eliezer. Keep writing. Your work is excellent. [My son] speaks of you often. You are a wonderful teacher/mentor to him and a good friend to him and many others. Thank you for all you do for amcha.",
    by: "Family of alum",
  },
  {
    quote:
      "Thank you, Rabbi Hirsch, for being a role model, teacher, and a friend. With your incredible care, wisdom and brilliance, you guide and support each member of the community through life's greatest challenges. We would not be where we are without you, and we admire you more than words can describe.",
    by: "Member",
  },
  {
    quote: "We are new members, and we're sponsoring Kiddush to thank the Mekor community for their warm welcome.",
    by: "Members",
  },
  {
    quote:
      "My zayde is a congregant of Mekor Habracha. My grandfather played a big part in my wedding, and as a gift, I let him pick an organization of his choice to make a donation in memory of our [family members]. Your synagogue has clearly made such a positive impact on his life, and I thank you for that.",
    by: "Family of member",
  },
  {
    quote: "With admiration for Rabbi Hirsch for his leadership and dedication. May your community continue to thrive.",
    by: "Visitor",
  },
  {
    quote:
      "We are sponsoring kiddush to thank the Mekor Habracha community for being a source of socializing, support, and spirituality for over 7 years. Thanks; we will miss you!",
    by: "Members",
  },
  {
    quote:
      "Rabbi Hirsch, I want to thank you not only for delivering a warm and thoughtful benediction during our Gala, but to tell you that after hearing you, I will never think of the word revenge in the same way again. What you had to say was extremely empowering.",
    by: "Jewish organization",
  },
  {
    quote:
      "With admiration for Rabbi Eliezer Hirsch whose tireless efforts, sincere dedication, and unique wisdom have transformed Center City and Mekor Habracha into a flourishing community. It is a true honor to be a member of Mekor Habracha.",
    by: "Member",
  },
  {
    quote:
      "Mekor Habracha will always hold a special place in our hearts, and we will forever feel part of the family there. We are so appreciative of this pillar of the Center City Jewish community and all Rabbi Hirsch has done for us and people like us over the years.",
    by: "Alum",
  },
  {
    quote:
      "Thank you so much for the honors bestowed on my family on Shabbos. You made us feel like we were long time members of your congregation.",
    by: "Visitor",
  },
  {
    quote:
      "We are so blessed to have Mekor Habracha as our extended family in Philly. The Torah and inspiration you bring us, your love and dedication to our community and the way you are always there for us is incredible. We are so grateful for you.",
    by: "Member",
  },
  {
    quote:
      "My husband and I were in Philly for the last Shabbos in July - a truly unplanned event, since we couldn't get home in time for Shabbos. We had the pleasure of davening at your wonderful shul! My son and daughter-in-law recently moved to Philly for graduate school. I am enclosing a donation to cover their membership. I hope they come regularly! Much hatzlacha always!",
    by: "Family of member",
  },
  {
    quote:
      "In honor of Rabbi Eliezer Hirsch. The way you live your life every day speaks volumes. Your incredible love and concern for every human being, your humility, your perseverance, and your tenacity to do the right thing are constant reminders of what we can strive for.",
    by: "Member",
  },
  {
    quote: "Dear Rabbi Hirsch, I enjoyed speaking with you and davening at Mekor this past Shabbat. It's a wonderful kehilla and I am impressed with your maverick approaches, your intellect and humanity, and your dedication. Kol tuv.",
    by: "Visitor",
  },
  {
    quote:
      "We are sponsoring kiddush in thanks to Rabbi Hirsch, Bruce, the Board and the Mekor Habracha community, with the message, \"We love you very much, and [even though we are leaving Philly] Mekor will always be our shul.\"",
    by: "Member",
  },
  {
    quote:
      "Dear Rabbi Hirsch and Mekor Habracha, Thank you so much for the [Jewish books] you gave me for my Bat Mitzvah... I love that you have created a community where I can go daven every Shabbat.",
    by: "Bat Mitzvah Girl",
  },
  {
    quote:
      "Thank you for saving my life, and thank G-d there are Rabbis like you in the world. This is not to mention that you built a thriving community out of absolutely nothing in Philly. I can't even imagine how many people's lives you have changed. Please keep on doing what you do, because you have the right perspective, character and empathy to be a real light for the Jewish people.",
    by: "Alum",
  },
  {
    quote:
      "Dear Rabbi Hirsch, Thank you for honoring my father with a beautiful service. You have been a rock for my mother, and I'm in awe of all the good you do for the community you lead.",
    by: "Family member",
  },
  {
    quote:
      "I'm sponsoring kiddush on the occasion of my upcoming aliyah to Israel and to thank the Mekor community for six wonderful years.",
    by: "Member",
  },
  {
    quote:
      "Thank you so much for the amazing, vibrant shul and community you provided over my last 5+ years in Philly. ...I wanted to express my appreciation. Shana Tova and Gmar Chatima Tova.",
    by: "Former community member",
  },
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function TestimonialsPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="testimonials"
        title="testimonials"
        subtitle="A Few of Mekor's Eclectic Testimonials"
        image={{
          src: TESTIMONIAL_IMAGES.hero,
          alt: "Mekor community gathering",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description=""
        actions={[
          { label: "Join Us", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
        <Image
          src={TESTIMONIAL_IMAGES.banner}
          alt="Mekor testimonial banner"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
      </SectionCard>

      <SectionCard title="A Few of Mekor's Eclectic Testimonials" className={styles.testimonialsSection}>
        <div className={styles.quoteGrid}>
          {TESTIMONIALS.map((entry, index) => (
            <article key={`${entry.by}-${index}`} className={styles.quoteCard}>
              <p className={styles.quoteText}>&ldquo;{entry.quote}&rdquo;</p>
              <p className={styles.quoteBy}>~ {entry.by}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="More from members" className={styles.connectSection}>
        <p>
          Read a <InlineLink href="/letterfromisrael">pre-Passover letter from a Mekor member living in Israel</InlineLink>, along with <InlineLink href="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8ec79805bb1829cd0e6fc905afa857992bdc6c01-chana_strauss_dinner_speech_excerpt_12-2-22.pdf">inspiring words from another member</InlineLink> about <InlineLink href="/membership-old">Mekor community month</InlineLink>.
        </p>
      </SectionCard>

      <SectionCard title="Connect With Mekor" className={styles.connectSection}>
        <CTACluster
          items={[
            { label: "Membership", href: "/membership" },
            { label: "Visit Us", href: "/visit-us" },
            { label: "Contact Us", href: "/contact-us" },
            { label: "Events", href: "/events" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
