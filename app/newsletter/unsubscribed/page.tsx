import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/page-shell";

export default async function NewsletterUnsubscribedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const removed = status === "unsubscribed";
  return (
    <MarketingPageShell currentPath="/newsletter/unsubscribed">
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "5rem 1.5rem", textAlign: "center" }}>
        <h1>{removed ? "You’re unsubscribed" : "This unsubscribe link is invalid"}</h1>
        <p>{removed ? "You will no longer receive this Mekor Habracha newsletter." : "Contact the Mekor office if you need help changing your email preferences."}</p>
        <Link href="/">Return home</Link>
      </main>
    </MarketingPageShell>
  );
}
