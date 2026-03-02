import type { Metadata } from "next";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "@/app/about-us/page.module.css";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/about-us");
  return buildDocumentMetadata(document);
}

export default function AboutUsPage() {
  return (
    <MarketingPageShell currentPath="/about-us" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        title="About Us"
        image={{
          src: "https://static.wixstatic.com/media/92f487_9d5ea30d3f994577b7580692f3db4cf1~mv2.jpg",
          alt: "Mekor Habracha sanctuary",
          objectFit: "scale-down",
        }}
      />

      <SectionCard>
        <SplitMediaText
          title="Our History"
          media={{
            src: "https://static.wixstatic.com/media/92f487_317cadc2e57a4f1e9320b1024d4cfa85~mv2.jpeg",
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
            src: "https://static.wixstatic.com/media/92f487_45d2dc5d59b343feb57c0f77fe10f5e5~mv2.jpeg",
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
            src: "https://static.wixstatic.com/media/92f487_4028caf9a1a04e7aa4fdbdeaf23b9025~mv2.jpeg",
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
            src: "https://static.wixstatic.com/media/11062b_8135b27108d04d2a97adc750a341fb79~mv2.jpeg",
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
