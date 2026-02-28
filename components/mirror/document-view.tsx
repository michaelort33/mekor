import type { PageDocument } from "@/lib/mirror/types";
import { getStyleBundleById } from "@/lib/mirror/loaders";
import { prepareMirrorDocumentHtml } from "@/lib/mirror/document-html";
import { MirrorRuntime } from "@/components/mirror/mirror-runtime";

type Props = {
  document: PageDocument;
};

export async function DocumentView({ document }: Props) {
  const styleBundle = await getStyleBundleById(document.styleBundleId);
  const html = prepareMirrorDocumentHtml(document.bodyHtml || document.renderHtml || "", document.path);
  const contentId = `mirror-content-${document.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <main className="mirror-root" data-path={document.path}>
      {styleBundle ? (
        <link
          rel="stylesheet"
          href={styleBundle.href}
          data-mirror-style-bundle={styleBundle.id}
        />
      ) : null}
      <div id={contentId} className="mirror-content" dangerouslySetInnerHTML={{ __html: html }} />
      <MirrorRuntime rootId={contentId} path={document.path} />
    </main>
  );
}
