import Link from "next/link";

import { SiteNavigation } from "@/components/navigation/site-navigation";

export default function NotFound() {
  return (
    <main className="not-found-page" data-native-nav="true">
      <SiteNavigation currentPath="/" />
      <section className="mirror-error">
        <h1>404 - Not Found</h1>
        <p>The requested URL does not exist in the mirrored public route contract.</p>
        <p>
          <Link href="/">Go back to home</Link>
        </p>
      </section>
    </main>
  );
}
