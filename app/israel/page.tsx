import type { Metadata } from "next";
import Image from "next/image";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { HeroSection, InlineLink, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
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
        subtitle="Events & Initiatives Online & in the Greater Philadelphia Jewish Community"
        description="Updated 12/30/2024"
        image={{
          src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/75a8b93c54e785acf273abb9bf498ac450c1eb42-92f487_fe9c18db72464a00804c50ec36bba116-mv2.jpg",
          alt: "Israel solidarity event banner",
          objectFit: "cover",
        }}
      />

      <SectionCard>
        <SplitMediaText
          title="Israel's Civil Defense Efforts"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6a8386370bce554c38eb3bdb11b4a76134bf2052-66bc7c_6e7e760f838c45358a24f54b9f2927ea-mv2.jpg",
            alt: "Mishmar volunteers in Israel",
          }}
          paragraphs={[
            "While the IDF defends Israel's outer borders, and the police force answers emergency calls inside Israel's borders, it is Israel's Mishmar civilian security volunteers who patrol many neighborhood borders from criminals & terrorists.",
            "Ramot, Israel's largest neighborhood, is located on Jerusalem's northern border and is exposed to terrorist assaults on all sides.",
            "Mishmar Ramot now seeks to raise $50,000 for 2 goals. First, these funds will be used to train 30 volunteers to attain a highly professional level of skill, by using a curriculum tailored to the Ramot's needs. Secondly, the funds will enable Mishmar to purchase rescue & security equipment, as well as overhead for headquarters where security activities are coordinated.",
            <>
              The following videos vividly portray their work: <InlineLink href="https://youtu.be/LiwJzESwMjg?si=m2WgAKtM8GH8ORQN">Mishmar Video 1 (Hebrew)</InlineLink>, <InlineLink href="https://youtube.com/shorts/-bDUKSgLMk4?si=HefvV8FtjSeoGI4n">Mishmar Video 2</InlineLink>, and <InlineLink href="https://youtu.be/zFB8Jx9xm0g?si=2-hPc2UvWyEfc2qK">Mishmar Video 3 (Hebrew)</InlineLink>. You can also <InlineLink href="https://my.israelgives.org/en/fundme/MISHMARRAMOT">support Mishmar Ramot&apos;s campaign</InlineLink>.
            </>,
          ]}
        />
      </SectionCard>

      <SectionCard tone="blue" title="SparkIL: Supporting Small Businesses in Israel Through Microlending">
        <div className={styles.sparkGrid}>
          <div>
            <p className={styles.sparkParagraph}>
              See <InlineLink href="https://mail.google.com/mail/u/0/#label/ADMIN%2Fnewsltr%2FFB%2Fwebsite/WhctKLbMvJGMWbQhwLVHfgmVfZscGBNFNNNJpZQNJswfxsVkBkrKscqJFpQQqrjdBjDMvwL?projector=1">Mekor member Joe Glyn&apos;s interview</InlineLink>, explaining why he values the opportunity to help Israeli small businesses by investing through SparkIL.
            </p>
            <p className={styles.sparkParagraph}>
              For more information, watch the <InlineLink href="https://www.youtube.com/watch?v=nxbnMRfIacE">video about the business</InlineLink> and the <InlineLink href="https://www.youtube.com/watch?v=FWv1nfj7W-8">video about SparkIL lenders</InlineLink>. If you make a micro-loan, apply the $36 coupon code <strong>pro36</strong> at checkout. Questions can be sent to <InlineLink href="mailto:YishaiGo@sparkil.org">YishaiGo@sparkil.org</InlineLink>.
            </p>
          </div>
          <div className={styles.sparkImage}>
            <Image
              src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/b562092e8484e9d5c6e62671c670e606b2d338cc-92f487_34e64b1fb2e94c56886578290ef2bcd0-mv2.jpeg"
              alt="SparkIL community initiative visual"
              width={1200}
              height={900}
              sizes="(max-width: 900px) 100vw, 40vw"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Advocate for Yourself"
          kicker="A Free Workshop on Responding to Antisemitism"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/2185286fefa434f6bb0293a7f66831bca3b4cfd6-92f487_be81df46a7ea4ddbb37daf1934fb12e6-mv2.png",
            alt: "Workshop promotional graphic",
          }}
          reverse
          paragraphs={[
            "This free, three-part interactive workshop teaches a practical rhetorical technique to help you confidently respond to antisemitic or anti-Israel comments--without engaging in debate.",
            "Led by Dr. Julia Weinberg, a clinical and forensic psychologist with a legal background, the sessions are live, not recorded, and available remotely or in person by arrangement.",
            "The workshop helps you identify manipulative rhetoric, practice effective responses, and apply them to real-life scenarios.",
            <>
              Contact Dr. Weinberg by <InlineLink href="mailto:drweinberg@outlook.com">email</InlineLink>, at <InlineLink href="tel:+12152196748">(215) 219-6748</InlineLink>, or through <InlineLink href="http://www.jweinbergjdphd.com/">her website</InlineLink>.
            </>,
          ]}
        />
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Simchat Torah Project 2024/5785"
          media={{
            src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6c49d55d1ef7ff295cde83c9b1ffb1ae6922117b-92f487_b487ff3e7e4c4f8482887973e48a3412-mv2.png",
            alt: "Simchat Torah project commemorative image",
          }}
          paragraphs={[
            "The Simchat Torah Project (Updated 10/10/24): We are pleased to bring you an update on the Simchat Torah Project, a global initiative to commemorate this first anniversary of October 7.",
            "A new me'il (Torah cover) was created in Israel for each of the participating synagogues worldwide, including Mekor. This beautiful me'il proclaims that this Torah is dedicated in memory of the 1200 souls and the many soldiers and hostages who have since died, Al Kiddush Hashem.",
            "On Simchat Torah, when we dance with our scroll, Mekor will connect with communities around the world who joined in this project. May we merit to fulfill the words of Tehillim, 'You have turned my mourning into dancing,' and see the coming of Mashiach speedily in our days.",
            <>
              Read <InlineLink href="/from-the-rabbi-s-desk">Rabbi Hirsch&apos;s reflections on October 7</InlineLink>.
            </>,
          ]}
        />
        <p className={styles.longCopy}>
          Mekor Habracha/Center City Synagogue Commemoration of October 7: 6:15pm Mincha - 6:45pm Program.
        </p>
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
