import type { Metadata } from "next";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "@/app/our-rabbi/page.module.css";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/our-rabbi");
  return buildDocumentMetadata(document);
}

export default function OurRabbiPage() {
  return (
    <MarketingPageShell currentPath="/our-rabbi" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        title="Our Rabbis"
        image={{
          src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/d024efffb51cdefe90a026a6cbbde80293c4735e-92f487_d26f360d09cc45e4bebe89d9f14643d3-mv2-20copy2-20-medium-.jpg",
          alt: "Rabbi at Mekor Habracha",
        }}
      />

      <SectionCard>
        <SplitMediaText
          title="Rabbi Eliezer Hirsch"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/d024efffb51cdefe90a026a6cbbde80293c4735e-92f487_d26f360d09cc45e4bebe89d9f14643d3-mv2-20copy2-20-medium-.jpg",
            alt: "Rabbi Eliezer Hirsch",
          }}
          paragraphs={[
            "Rabbi Eliezer Hirsch is the founding rabbi and spiritual leader of Mekor Habracha/Center City Synagogue. Since its inception, Mekor has grown remarkably and contributed significantly to flourishing Jewish life in downtown Philadelphia.",
            "Under Rabbi Hirsch's leadership, Mekor has fostered a dynamic community with vibrant Shabbat and holiday services and daily morning and evening minyanim in the Rittenhouse neighborhood.",
            "He serves as Director and local halachic advisor for the Center City Eruv and rabbinic administrator of IKC Kosher Certification, helping fuel growth of kosher establishments in Center City.",
            "Rabbi Hirsch has made unwavering support for Israel a cornerstone of Mekor and was honored in 2019 with the Guardian of Israel Award from the Philadelphia Chapter of the Zionist Organization of America.",
            "You can reach Rabbi Hirsch at rabbiehirsch@mekorhabracha.org.",
          ]}
          links={[
            { label: "Email Rabbi Hirsch", href: "mailto:rabbiehirsch@mekorhabracha.org" },
            { label: "Davening schedule", href: "/davening" },
            { label: "Center City Eruv", href: "http://www.centercityeruv.org/" },
            { label: "Community Mikvah", href: "https://philamikvah.org/" },
            { label: "Guardian of Israel Award video", href: "https://www.youtube.com/watch?v=wweUZO6W1rE" },
          ]}
        />
        <CTACluster
          title="Rabbi Hirsch's Books and Writing"
          items={[
            {
              label: "Pesach Without the Pain",
              href: "https://www.amazon.com/Pesach-Without-Pain-Practical-Practices-ebook/dp/B07CCYNKWN/ref=sr_1_1?s=digital-text&ie=UTF8&qid=1522369156&sr=1-1",
            },
            {
              label: "Bringing Order to the Seder",
              href: "https://www.amazon.com/Bringing-Order-Seder-Traditional-Understanding-ebook/dp/B07PY85NJH/ref=sr_1_1?qid=1553724389&refinements=p_27%3ARabbi+Eliezer+Hirsch&s=digital-text&sr=1-1&text=Rabbi+Eliezer+Hirsch",
            },
            {
              label: "The Book of Life",
              href: "https://www.amazon.com/dp/B08J8DZY9Q?fbclid=IwAR3OBueTFl9cQMrnAYOQbUvv1VzBTuRpMgpg6zk0En1jS_Z5ySoX4k93BYw",
            },
            { label: "Rabbi Hirsch Substack", href: "https://rabbieliezerhirsch.substack.com/" },
            { label: "Rabbi Hirsch Podcast", href: "https://rabbiehirsch.castos.com/" },
            {
              label: "Amazon Author Page",
              href: "https://www.amazon.com/stores/Rabbi-Eliezer-Hirsch/author/B0876V66RG?ref=ap_rdr&store_ref=ap_rdr&isDramIntegrated=true&shoppingPortalEnabled=true",
            },
          ]}
        />
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          reverse
          title="Rabbi Steven Gotlib"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/0c559a12d9586665be9d15e30e9f5bd86cb69113-r-20gotlib.jpg",
            alt: "Rabbi Steven Gotlib",
          }}
          paragraphs={[
            "Rabbi Steven Gotlib is Associate Rabbi at Mekor Habracha/Center City Synagogue and Director of the Center City Beit Midrash.",
            "Rabbi Gotlib studied Communication, Jewish Studies, and Philosophy at Rutgers University before receiving rabbinic ordination from RIETS and additional training in mental health counseling and spiritual entrepreneurship.",
            "He has served congregations in Ottawa, Toronto, and New York City, and his writings have appeared in The Lehrhaus, Jewish Action, Tradition Online, 18Forty, and more.",
            "Rabbi Gotlib is committed to making Jewish theology, philosophy, and law accessible to all who seek guidance and comfort within our tradition.",
            "He can be reached at rabbisgotlib@mekorhabracha.org.",
          ]}
          links={[
            { label: "Email Rabbi Gotlib", href: "mailto:rabbisgotlib@mekorhabracha.org" },
            { label: "Rabbi Gotlib Substack", href: "https://rabbistevengotlib.substack.com/" },
          ]}
        />
        <p className={styles.subheading}>
          Rabbi Gotlib lives in Center City with his wife, Ruth Malkah Rohde, and their daughter Zeriza.
        </p>
        <CTACluster
          title="Rabbi Gotlib Online"
          items={[
            { label: "Facebook", href: "https://www.facebook.com/StevenJGotlib/" },
            { label: "LinkedIn", href: "https://www.linkedin.com/in/steven-j-gotlib/" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
