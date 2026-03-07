"use client";

import { useEffect, useState } from "react";

export type PublicProfilePrefill = {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
};

type ProfileResponse = {
  profile: PublicProfilePrefill;
};

export function usePublicProfilePrefill() {
  const [profile, setProfile] = useState<PublicProfilePrefill | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const response = await fetch("/api/account/profile", { cache: "no-store" }).catch(() => null);
      if (!active || !response || !response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as ProfileResponse | null;
      if (!active || !payload?.profile) {
        return;
      }

      setProfile(payload.profile);
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  return profile;
}
