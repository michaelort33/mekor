import type { Metadata } from "next";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { getMirrorRouteMetadata } from "@/lib/marketing/route-metadata";
import styles from "@/app/about-us/page.module.css";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return getMirrorRouteMetadata("/about-us");
}

export default function AboutUsPage() {
  return (
    <MarketingPageShell currentPath="/about-us" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        title="About Us"
        image={{
          src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/416cf4a103c7a317e2f090e7d97cf07ae14b7bf1-92f487_9d5ea30d3f994577b7580692f3db4cf1-mv2.jpg",
          alt: "Mekor Habracha sanctuary",
        }}
      />

      <SectionCard>
        <SplitMediaText
          title="Our History"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/f4d82f5857bf98502fd2de163b68d288ac320101-03bc1ca6-099c-4064-943d-0c1b1e7f7723-20-medium-.jpeg",
            alt: "Historic Mekor community photo",
          }}
          paragraphs={[
            "Mekor Habracha began as an independent chavura in the Rittenhouse Square area of Philadelphia in the 1990s.",
            "From 1999 to 2001, the group met under the auspices of Etz Chaim (now Aish Chaim), before returning to a primarily lay-led model. In 2006, Etz Chaim recruited Rabbi Eliezer Hirsch from New York to serve as the group's rabbi.",
            "Since Rabbi Hirsch's arrival, the congregation has grown and flourished, becoming an independent synagogue in 2008, and is now a vital force in strengthening Jewish life in Center City.",
            "In 2024, Rabbi Steven Gotlib joined Mekor Habracha as Associate Rabbi, helping guide the congregation into its next chapter.",
          ]}
          links={[
            { label: "Aish Chaim", href: "https://aishchaim.com/" },
            { label: "Read Mekor's origins", href: "https://mekorhabracha.github.io/2013/10/16/modern-orthodox-community.html" },
            {
              label: "Jewish Exponent feature",
              href: "https://www.jewishexponent.com/mekor-habracha-continues-to-bring-orthodox-vibrancy-to-center-city/",
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="Our Mission">
        <p className={styles.missionText}>
          The mission of Mekor Habracha is to serve the spiritual, social, and educational needs of Center
          City&apos;s diverse Jewish community. We provide an environment where people of all ages and
          religious backgrounds are welcome to participate in synagogue life and Orthodox services.
        </p>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          kicker="Who we are"
          title="Vibrant and inclusive"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/81ce580ba25d1cd5e16437ff16e8fa89e5cefd06-aa1c0948-1dfd-4749-b079-c968f254d204.jpeg",
            alt: "Mekor community members together",
          }}
          paragraphs={[
            "Mekor Habracha is a vibrant and inclusive congregation in Center City Philadelphia, with diverse membership from across the city.",
            "Visitors, whether local residents or out-of-towners, are always welcome.",
          ]}
          links={[
            { label: "Center City kosher dining", href: "/center-city" },
            { label: "Center City Eruv", href: "http://www.centercityeruv.org/" },
            { label: "Philadelphia Mikvah", href: "https://philamikvah.org/" },
          ]}
        />
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          reverse
          kicker="Learning at Mekor"
          title="Profound and practical"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/b75c8065c078c9501d97548f119e93026a21d16c-7c838ce6-6309-46ca-977c-f57adb624379-20-medium-.jpeg",
            alt: "Learning session at Mekor",
          }}
          paragraphs={[
            "Since it was founded in 2007, the shul has attracted a diverse group of students, young professionals, newlyweds, families, and empty nesters.",
            "We offer religious, educational, and social opportunities with meaningful ways for community members to get involved.",
          ]}
          links={[{ label: "Mekor Couples", href: "/mekorcouples" }]}
        />
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          kicker="Contact Us"
          title="We'd love to hear from you"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/7dc3a7780b86ba65f8cfcacb4c78de1b9c7067ab-aa134484-c36e-4f68-8e8f-d14d2acfc78a-20-medium-.jpeg",
            alt: "Mekor synagogue gathering",
          }}
          paragraphs={[
            "Reach out to Mekor for membership, programs, and community involvement.",
          ]}
          links={[
            { label: "Visit Us", href: "/visit-us" },
            { label: "Call (215) 525-4246", href: "tel:+12155254246" },
            { label: "Email admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
          ]}
        />
      </SectionCard>

      <SectionCard>
        <p className={styles.contactText}>
          Mekor Habracha Center City Synagogue is located at 1500 Walnut St, Suite 206, Philadelphia, PA
          19102.
        </p>
        <CTACluster
          title="Community Resources"
          items={[
            { label: "Davening", href: "/davening" },
            { label: "Center City Beit Midrash", href: "/center-city-beit-midrash" },
            { label: "In The News", href: "/in-the-news" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
