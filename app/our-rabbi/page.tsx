import type { Metadata } from "next";
import Image from "next/image";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, InlineLink, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
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
        className={styles.heroGraphic}
      />

      <section id="rabbi-eliezer-hirsch" className={styles.anchorSection}>
        <SectionCard className={styles.profileSectionCard}>
          <article className={styles.profileLayout}>
            <div className={styles.profilePhotoWrap}>
              <Image
                src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/3e46359f1d8a8c9a5d886a6f6aa25c734c5de1d0-92f487_e03dc964305644a9b5eb3894502ed630-mv2.jpg"
                alt="Rabbi Eliezer Hirsch"
                width={900}
                height={1200}
                className={styles.profilePhoto}
              />
            </div>
            <div className={styles.profileBody}>
              <h2 className={styles.profileTitle}>Rabbi Eliezer Hirsch</h2>
              <div className={styles.profileText}>
                <p>Rabbi Eliezer Hirsch is the founding rabbi and spiritual leader of Mekor Habracha/Center City Synagogue. Under Rabbi Hirsch&apos;s leadership, Mekor has experienced remarkable growth, helping to strengthen and expand Jewish life in downtown Philadelphia. The community has become a dynamic hub, offering vibrant Shabbat and holiday services, engaging Torah classes, and daily morning and evening minyanim in the Rittenhouse neighborhood.</p>
                <p>Rabbi Hirsch serves as the Director and local halachic advisor for the expansive <InlineLink href="http://www.centercityeruv.org/">Center City Eruv</InlineLink> and is the rabbinic administrator of IKC Kosher Certification in Center City, which has facilitated the substantial growth of <InlineLink href="/center-city">kosher establishments in this area</InlineLink>.</p>
                <p>He has also served as the sponsoring rabbi for dozens of geirei tzedek (Orthodox converts to Judaism) through the Philadelphia Beis Din under HaRav Dov Aaron Brisman zt&quot;l, as well as through several RCA-affiliated batei dinim. In addition, Rabbi Hirsch and the Mekor congregation played a key role in bringing our <InlineLink href="https://philamikvah.org/">community mikvah</InlineLink> to fruition.</p>
                <p>Rabbi Hirsch has made unwavering support for Israel a cornerstone of Mekor, articulating a fervent voice for Israel, and celebrating the many Mekor congregants who have made aliyah. In recognition of his pro-Israel advocacy efforts across the Philadelphia region, Rabbi Hirsch was honored in 2019 with the Guardian of Israel Award from the Philadelphia Chapter of the Zionist Organization of America (ZOA).</p>
                <p>In addition to leading Congregation Mekor Habracha, Rabbi Hirsch serves as Dean of Jewish philosophy at <InlineLink href="https://genesisu.edu/">Genesis University</InlineLink>, a distance-learning college based in Suffern, NY.</p>
                <p>Rabbi Hirsch received rabbinic ordination from <InlineLink href="http://nirc.edu/">Ner Israel Rabbinical College</InlineLink> in Baltimore, Maryland, and <InlineLink href="https://ohrreuven.com/">Yeshivas Ohr Reuven</InlineLink> in Monsey, NY. During his almost two decades of study in yeshiva, he forged close relationships with prominent rabbinic leaders and received years of training from renowned halachic authorities.</p>
                <p>In 2010, Rabbi Hirsch was diagnosed with young-onset Parkinson&apos;s Disease, an incurable and progressive neurological condition. Since publicly sharing his diagnosis, Rabbi Hirsch has welcomed inquiries from individuals across the globe seeking halachic and spiritual guidance to cope with significant personal hardships.</p>
                <CTACluster
                  className={styles.editorialCluster}
                  title="Rabbi Hirsch's Reflections"
                  items={[
                    {
                      label: "On Parkinson's Disease and Emunah",
                      href: "https://rabbieliezerhirsch.substack.com/p/on-parkinsons-disease-and-emunah",
                      description: "Read Rabbi Hirsch's inspirational reflections on Substack.",
                      brand: "substack",
                    },
                  ]}
                />
                <p>Rabbi Hirsch has written three books about Jewish holidays to offer practical guidance and inspire a deeper, year-round connection to Torah and Jewish life:</p>
                <CTACluster
                  className={styles.editorialCluster}
                  title="Rabbi Hirsch's Books"
                  items={[
                    {
                      label: "Pesach Without the Pain: A Practical Guide to the Laws and Practices of Passover",
                      href: "https://www.amazon.com/Pesach-Without-Pain-Practical-Practices-ebook/dp/B07CCYNKWN/ref=sr_1_1?s=digital-text&ie=UTF8&qid=1522369156&sr=1-1",
                      brand: "amazon",
                    },
                    {
                      label: "Bringing Order to the Seder: A Modern Guide to the Traditional Passover Haggadah",
                      href: "https://www.amazon.com/Bringing-Order-Seder-Traditional-Understanding-ebook/dp/B07PY85NJH/ref=sr_1_1?qid=1553724389&refinements=p_27%3ARabbi+Eliezer+Hirsch&s=digital-text&sr=1-1&text=Rabbi+Eliezer+Hirsch",
                      brand: "amazon",
                    },
                    {
                      label: "The Book of Life: A Transformative Guide to the High Holidays",
                      href: "https://www.amazon.com/dp/B08J8DZY9Q?fbclid=IwAR3OBueTFl9cQMrnAYOQbUvv1VzBTuRpMgpg6zk0En1jS_Z5ySoX4k93BYw",
                      brand: "amazon",
                    },
                  ]}
                />
                <p>Through his writing and teaching, Rabbi Hirsch illuminates the Torah&apos;s enduring relevance for Jews of all backgrounds.</p>
                <p>Rabbi Hirsch and his wife Miriam have made Center City their home, finding deep meaning in building Jewish life and serving their beloved community.</p>
                <p>You can reach Rabbi Hirsch at <InlineLink href="mailto:rabbiehirsch@mekorhabracha.org">rabbiehirsch@mekorhabracha.org</InlineLink>.</p>
              </div>
              <CTACluster
                className={styles.linkCluster}
                items={[
                  { label: "Davening schedule", href: "/davening" },
                  { label: "Center City Eruv", href: "http://www.centercityeruv.org/", brand: "website" },
                  { label: "Community Mikvah", href: "https://philamikvah.org/", brand: "website" },
                  { label: "Guardian of Israel Award video", href: "https://www.youtube.com/watch?v=wweUZO6W1rE", brand: "youtube" },
                ]}
              />
            </div>
          </article>
          <CTACluster
            className={styles.onlineCluster}
            title="Rabbi Hirsch Online"
            items={[
              { label: "Rabbi Hirsch's Substack", href: "https://rabbieliezerhirsch.substack.com/", brand: "substack" },
              { label: "Rabbi Hirsch Podcast", href: "https://rabbiehirsch.castos.com/", brand: "podcast" },
              {
                label: "Amazon Author Page",
                href: "https://www.amazon.com/stores/Rabbi-Eliezer-Hirsch/author/B0876V66RG?ref=ap_rdr&store_ref=ap_rdr&isDramIntegrated=true&shoppingPortalEnabled=true",
                brand: "amazon",
              },
            ]}
          />
        </SectionCard>
      </section>

      <section id="rabbi-steven-gotlib" className={styles.anchorSection}>
        <SectionCard className={styles.profileSectionCard}>
          <SplitMediaText
            className={styles.splitProfile}
            reverse
            title="Rabbi Steven Gotlib"
            media={{
              src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/f6e2a6329cfc583701d5241a911d82f1a0cb2a88-66bc7c_7ded87b518b94c619c3f89f470cb4a9d-mv2.jpg",
              alt: "Rabbi Steven Gotlib",
            }}
            paragraphs={[
              "Rabbi Steven Gotlib is Associate Rabbi at Mekor Habracha/Center City Synagogue and Director of the Center City Beit Midrash. Rabbi Gotlib studied Communication, Jewish Studies, and Philosophy at Rutgers University before receiving rabbinic ordination from the Rabbi Isaac Elchanan Theological Seminary at Yeshiva University (RIETS), a Certificate in Mental Health Counseling from the Ferkauf Graduate School of Psychology in partnership with RIETS, and a START Certificate in Spiritual Entrepreneurship from the Glean Network in partnership with Columbia Business School.",
              "Rabbi Gotlib previously served as Interim Rabbi at Young Israel of Ottawa, Assistant Rabbi at the Village Shul/Aish HaTorah Learning Centre in Toronto, a Community Scholar at Beit Midrash Zichron Dov of Toronto, and Head of the Beit Midrash Program at Congregation Shearith Israel: The Spanish and Portuguese Synagogue in New York City.",
              "As a RIETS student, he held rabbinic internships at Congregation Beth Abraham-Jacob of Albany and at Yeshiva University's Zahava and Moshael Straus Center for Torah and Western Thought while working as Webmaster and Social Media Manager for The Lehrhaus.",
              "A popular guest speaker throughout the US and Canada, Rabbi Gotlib's writings can be read in the Lehrhaus, Jewish Action, Tradition Online, 18Forty, and more. He has contributed to several volumes, including Who by Plague: High Holy Days Sermons from COVID19 Times (Hamotzi Press, 2021), Nothing so Whole as a Broken Heart: Reflections for the Days of Awe (Izzun Books, 2024), A Quest for Our Times: The Louis Jacobs Haggadah (Izzun Books, 2025), and The Oxford Handbook of Jewish Law (Oxford University Press, 2025).",
              "He strongly believes in making Jewish theology, philosophy, and law as accessible as possible to all who seek guidance and comfort within our tradition.",
              <>
                Read <InlineLink href="https://rabbistevengotlib.substack.com/">Rabbi Gotlib&apos;s Substack</InlineLink> for more of his writing.
              </>,
            ]}
          />
          <p className={styles.subheading}>
            Rabbi Gotlib lives in Center City with his wife, Ruth Malkah Rohde, and their daughter Zeriza. He can be
            reached at <InlineLink href="mailto:rabbisgotlib@mekorhabracha.org">rabbisgotlib@mekorhabracha.org</InlineLink>.
          </p>
          <CTACluster
            className={styles.linkCluster}
            title="Rabbi Gotlib Online"
            items={[
              { label: "Facebook", href: "https://www.facebook.com/StevenJGotlib/", brand: "facebook" },
              { label: "LinkedIn", href: "https://www.linkedin.com/in/steven-j-gotlib/", brand: "linkedin" },
            ]}
          />
        </SectionCard>
      </section>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
