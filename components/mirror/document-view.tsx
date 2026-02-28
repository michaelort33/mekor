import type { PageDocument } from "@/lib/mirror/types";
import { getStyleBundleById } from "@/lib/mirror/loaders";
import { KosherRestaurantsEnhancer } from "@/components/mirror/kosher-restaurants-enhancer";
import { InternalNavigationBridge } from "@/components/mirror/internal-navigation-bridge";
import { PageFixes } from "@/components/mirror/page-fixes";
import { SiteNavigation } from "@/components/navigation/site-navigation";

type Props = {
  document: PageDocument;
};

export async function DocumentView({ document }: Props) {
  const styleBundle = await getStyleBundleById(document.styleBundleId);
  const html = document.bodyHtml || document.renderHtml || "";
  const nativeNavEnabled = process.env.NEXT_PUBLIC_NATIVE_NAV === "true";

  return (
    <main
      className="mirror-root"
      data-path={document.path}
      data-native-nav={nativeNavEnabled ? "true" : undefined}
    >
      {styleBundle ? (
        <link
          rel="stylesheet"
          href={styleBundle.href}
          data-mirror-style-bundle={styleBundle.id}
        />
      ) : null}
      {nativeNavEnabled ? <SiteNavigation currentPath={document.path} /> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <InternalNavigationBridge />
      <KosherRestaurantsEnhancer path={document.path} />
      <PageFixes path={document.path} />
    </main>
  );
}
