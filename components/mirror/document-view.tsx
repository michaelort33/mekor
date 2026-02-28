import type { PageDocument } from "@/lib/mirror/types";
import { getStyleBundleById, getStylePrefetchHints } from "@/lib/mirror/loaders";
import { prepareMirrorDocumentHtml } from "@/lib/mirror/document-html";
import { MirrorRuntime } from "@/components/mirror/mirror-runtime";
import { SiteNavigation } from "@/components/navigation/site-navigation";

type Props = {
  document: PageDocument;
};

export async function DocumentView({ document }: Props) {
  const styleBundle = await getStyleBundleById(document.styleBundleId);
  const stylePrefetchHints = await getStylePrefetchHints(document.links ?? []);
  const html = prepareMirrorDocumentHtml(document.bodyHtml || document.renderHtml || "", document.path);
  const contentId = `mirror-content-${document.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const nativeNavEnabled = process.env.NEXT_PUBLIC_NATIVE_NAV !== "false";

  return (
    <main
      className="mirror-root"
      data-path={document.path}
      data-native-nav={nativeNavEnabled ? "true" : undefined}
      data-styles-ready="false"
      data-style-timeout="false"
    >
      {styleBundle ? (
        <>
          <link
            rel="preload"
            as="style"
            href={styleBundle.href}
            data-mirror-style-preload={styleBundle.id}
          />
          <link
            rel="stylesheet"
            href={styleBundle.href}
            data-mirror-style-bundle={styleBundle.id}
            precedence="high"
          />
        </>
      ) : null}
      {nativeNavEnabled ? <SiteNavigation currentPath={document.path} /> : null}
      <div className="mirror-loading" role="status" aria-live="polite" aria-atomic="true">
        <p className="mirror-loading__pending">Loading page styles...</p>
        <p className="mirror-loading__slow">Still loading style assets. Please wait.</p>
      </div>
      <div id={contentId} className="mirror-content" dangerouslySetInnerHTML={{ __html: html }} />
      <MirrorRuntime
        rootId={contentId}
        path={document.path}
        styleBundleHref={styleBundle?.href ?? null}
        stylePrefetchHints={stylePrefetchHints}
      />
    </main>
  );
}
