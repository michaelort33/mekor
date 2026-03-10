import type { Metadata } from "next";

import { ContactForm } from "@/components/medium-pages/contact-form";
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
          objectFit: "cover",
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
            "Since Rabbi Hirsch's arrival, the congregation has grown and flourished, becoming an independent synagogue in 2008, and is now a vital force in strengthening Jewish life in Center City. Mekor has played a key role in supporting the expansion of kosher dining, helping establish a community eruv, spearheading the building of a mikvah, and sponsoring many Orthodox converts to Judaism.",
            "In 2024, Rabbi Steven Gotlib joined Mekor Habracha as Associate Rabbi. His thoughtful leadership, strong Torah scholarship, and deep sense of connection to the community have already made a meaningful impact, complementing Rabbi Hirsch's vision and helping guide the congregation into its next chapter.",
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
          City&apos;s diverse Jewish community. We aspire to provide an environment where people of all ages
          and religious backgrounds are welcome to participate in the synagogue&apos;s activities and Orthodox
          services.
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
            "Since it was founded in 2007, the shul has attracted, and continues to attract, a diverse group of people including students, young professionals, newlyweds, families, and empty nesters. We offer a range of religious, educational, and social activities, as well as plenty of opportunities for community members to get involved.",
            "We are proud that a number of wonderfully matched married couples first met at Mekor.",
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
            "At Mekor, we strive for transformative Jewish learning, putting the texts of our tradition in dialogue with pressing issues in our lives. Our community is turned to for the unique philosophy we represent in our sermons, classes, and publications.",
            "Our approach to Jewish learning is both profound and practical, addressing real-life issues through a blend of substantive dialogue with Jewish tradition and texts, a desire for genuine and personal spiritual exploration, and a passion for truth.",
            "This methodology, influenced by Rabbi Hirsch's esteemed teachers who were and are revolutionary thinkers and halachic experts, brings all of Torah in conversation with modern life, offering a holistic and profound religious education.",
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

      <SectionCard title="Send an Inquiry" description="Questions about membership, programs, or community life can be sent here directly from the About Us page.">
        <ContactForm sourcePath="/about-us" />
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
