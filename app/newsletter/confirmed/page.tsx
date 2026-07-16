import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/page-shell";

export default async function NewsletterConfirmedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const confirmed = status === "confirmed";
  return (
    <MarketingPageShell currentPath="/newsletter/confirmed">
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "5rem 1.5rem", textAlign: "center" }}>
        <h1>{confirmed ? "Subscription confirmed" : "This confirmation link is no longer valid"}</h1>
        <p>{confirmed ? "You’ll now receive Mekor Habracha news and community updates." : "Please return to the homepage and subscribe again for a fresh confirmation link."}</p>
        <Link href={confirmed ? "/newsletters" : "/"}>{confirmed ? "Read past newsletters" : "Return home"}</Link>
      </main>
    </MarketingPageShell>
  );
}
