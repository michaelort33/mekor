import type { PageDocument } from "@/lib/mirror/types";
import { KosherRestaurantsEnhancer } from "@/components/mirror/kosher-restaurants-enhancer";

type Props = {
  document: PageDocument;
};

export function DocumentView({ document }: Props) {
  return (
    <main className="mirror-root" data-path={document.path}>
      <div dangerouslySetInnerHTML={{ __html: document.renderHtml }} />
      <KosherRestaurantsEnhancer path={document.path} />
    </main>
  );
}
