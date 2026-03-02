import type { Metadata } from "next";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "@/app/israel/page.module.css";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/israel");
  return buildDocumentMetadata(document);
}

export default function IsraelPage() {
  return (
    <MarketingPageShell currentPath="/israel" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        tone="dark"
        align="center"
        title="Support of Israel"
        subtitle="Events and Initiatives Online and in the Greater Philadelphia Jewish Community"
        description="Updated 12/30/2024"
        image={{
          src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/9a1c305c9b204620be934bd55d866f3e1c06e961-92f487_fe9c18db72464a00804c50ec36bba116-mv2.jpg",
          alt: "Israel solidarity event banner",
        }}
      />

      <SectionCard>
        <SplitMediaText
          title="Israel's Civil Defense Efforts"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/142c369818029b6d312a6fd41107d1c33c93adf9-66bc7c_6e7e760f838c45358a24f54b9f2927ea-mv2.jpg",
            alt: "Mishmar volunteers in Israel",
          }}
          paragraphs={[
            "While the IDF defends Israel's outer borders and police answer emergency calls, Mishmar civilian security volunteers patrol neighborhood borders against criminal and terrorist threats.",
            "Ramot, Jerusalem's largest neighborhood, is exposed to assaults on all sides. Mishmar Ramot is raising funds to train 30 volunteers at a highly professional level and to purchase critical rescue and security equipment.",
            "The following videos portray their work and impact.",
          ]}
          links={[
            { label: "Mishmar Video 1", href: "https://youtu.be/LiwJzESwMjg?si=m2WgAKtM8GH8ORQN" },
            { label: "Mishmar Video 2", href: "https://youtube.com/shorts/-bDUKSgLMk4?si=HefvV8FtjSeoGI4n" },
            { label: "Mishmar Video 3", href: "https://youtu.be/zFB8Jx9xm0g?si=2-hPc2UvWyEfc2qK" },
            { label: "Donate Now", href: "https://my.israelgives.org/en/fundme/MISHMARRAMOT" },
          ]}
        />
      </SectionCard>

      <SectionCard tone="blue" title="SparkIL: Supporting Small Businesses in Israel Through Microlending">
        <div className={styles.sparkGrid}>
          <div>
            <p className={styles.sparkParagraph}>
              See the interview with Mekor member Joe Glyn explaining why he values helping Israeli small
              businesses through SparkIL investment.
            </p>
            <p className={styles.sparkParagraph}>
              If you visit the site and make a micro-loan, apply coupon code <strong>pro36</strong> at
              checkout. Questions can be sent to YishaiGo@sparkil.org.
            </p>
            <CTACluster
              items={[
                {
                  label: "Interview",
                  href: "https://mail.google.com/mail/u/0/#label/ADMIN%2Fnewsltr%2FFB%2Fwebsite/WhctKLbMvJGMWbQhwLVHfgmVfZscGBNFNNNJpZQNJswfxsVkBkrKscqJFpQQqrjdBjDMvwL?projector=1",
                },
                { label: "Video: The business", href: "https://www.youtube.com/watch?v=nxbnMRfIacE" },
                { label: "Video: Our lenders", href: "https://www.youtube.com/watch?v=FWv1nfj7W-8" },
                { label: "Email YishaiGo@sparkil.org", href: "mailto:YishaiGo@sparkil.org" },
                { label: "Visit Us", href: "/visit-us" },
              ]}
            />
          </div>
          <div className={styles.sparkImage}>
            <img
              src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/339de5af025a89406e33ff6ee819d9d9dc11cff2-92f487_34e64b1fb2e94c56886578290ef2bcd0-mv2.jpeg"
              alt="SparkIL community initiative visual"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Advocate for Yourself"
          kicker="A Free Workshop on Responding to Antisemitism"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/2c5b9a0ac2d5bf9d3bffc4513863223e3aeedc58-image1-20-1-.png",
            alt: "Workshop promotional graphic",
          }}
          reverse
          paragraphs={[
            "This free, three-part interactive workshop teaches a practical rhetorical technique to help you confidently respond to antisemitic or anti-Israel comments without engaging in debate.",
            "Led by Dr. Julia Weinberg, a clinical and forensic psychologist with a legal background. Sessions are live, not recorded, and available remotely or in person by arrangement.",
          ]}
          links={[
            { label: "Email drweinberg@outlook.com", href: "mailto:drweinberg@outlook.com" },
            { label: "Call (215) 219-6748", href: "tel:+12152196748" },
            { label: "www.jweinbergjdphd.com", href: "http://www.jweinbergjdphd.com/" },
          ]}
        />
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Simchat Torah Project 2024/5785"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/bbcd24569e126dce77917e2e571f2b1f1c1075fd-92f487_b487ff3e7e4c4f8482887973e48a3412-mv2.png",
            alt: "Simchat Torah project commemorative image",
          }}
          paragraphs={[
            "Updated 10/10/24: Mekor joined a global initiative commemorating the first anniversary of October 7, with a dedicated me'il created in Israel for participating synagogues worldwide.",
            "The project honors the 1200 souls and the soldiers and hostages who have died Al Kiddush Hashem. Mekor's commemorative event displayed the new cover and remembered the kadosh named on our me'il.",
            "May we merit to fulfill the words of Tehillim, 'You have turned my mourning into dancing,' and see the coming of Mashiach speedily in our days.",
          ]}
          links={[{ label: "Rabbi Hirsch's Introduction to Oct 7 Commemoration", href: "/from-the-rabbi-s-desk" }]}
        />
        <p className={styles.longCopy}>
          Mekor Habracha/Center City Synagogue Commemoration of October 7: 6:15pm Mincha, 6:45pm Program.
        </p>
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
