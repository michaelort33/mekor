import type { Metadata } from "next";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import { VolunteerForm } from "@/components/volunteer/volunteer-form";

export const metadata: Metadata = {
  title: "Volunteer | Mekor Habracha",
  description: "Sign up to volunteer for Torah reading, hospitality, mashgichim, and other community needs.",
};

export const dynamic = "force-dynamic";

export default async function Team4Page() {
  return (
    <main className="volunteer-page" data-native-nav="true">
      <SiteNavigation currentPath="/team-4" />
      <section className="volunteer-page__content">
        <header className="volunteer-page__header">
          <p className="volunteer-page__kicker">Community Support</p>
          <h1>Volunteer</h1>
          <p>
            Share your availability and interests. We will follow up with opportunities that match your
            preferences.
          </p>
        </header>
        <VolunteerForm />
      </section>
    </main>
  );
}
