import type { PageDocument } from "@/lib/mirror/types";
import { getStyleBundleById } from "@/lib/mirror/loaders";
import { sanitizeMirrorHtml } from "@/lib/mirror/sanitize-html";
import { KosherRestaurantsEnhancer } from "@/components/mirror/kosher-restaurants-enhancer";
import { InternalNavigationBridge } from "@/components/mirror/internal-navigation-bridge";
import { PageFixes } from "@/components/mirror/page-fixes";

type Props = {
  document: PageDocument;
};

export async function DocumentView({ document }: Props) {
  const styleBundle = await getStyleBundleById(document.styleBundleId);
  const html = sanitizeMirrorHtml(document.bodyHtml || document.renderHtml || "");

  return (
    <main className="mirror-root" data-path={document.path}>
      {styleBundle ? (
        <link
          rel="stylesheet"
          href={styleBundle.href}
          data-mirror-style-bundle={styleBundle.id}
        />
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <InternalNavigationBridge />
      <KosherRestaurantsEnhancer path={document.path} />
      <PageFixes path={document.path} />
    </main>
  );
}
