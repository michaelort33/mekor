import type { PageDocument } from "@/lib/mirror/types";
import { getStyleBundleById } from "@/lib/mirror/loaders";
import { prepareMirrorDocumentHtml } from "@/lib/mirror/document-html";
import { MirrorRuntime } from "@/components/mirror/mirror-runtime";
import { SiteNavigation } from "@/components/navigation/site-navigation";

type Props = {
  document: PageDocument;
};

export async function DocumentView({ document }: Props) {
  const styleBundle = await getStyleBundleById(document.styleBundleId);
  const html = prepareMirrorDocumentHtml(document.bodyHtml || document.renderHtml || "", document.path);
  const contentId = `mirror-content-${document.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
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
      <div id={contentId} className="mirror-content" dangerouslySetInnerHTML={{ __html: html }} />
      <MirrorRuntime rootId={contentId} path={document.path} />
    </main>
  );
}
