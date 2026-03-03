import { permanentRedirect } from "next/navigation";

type LegacyKosherPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildRedirectUrl(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  params.set("neighborhood", "cherry-hill");

  for (const [key, value] of Object.entries(searchParams)) {
    if (!value || key === "neighborhood") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          params.append(key, item);
        }
      }
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `/center-city?${query}#kosher-directory` : "/center-city#kosher-directory";
}

export default async function CherryHillKosherPage({ searchParams }: LegacyKosherPageProps) {
  permanentRedirect(buildRedirectUrl(await searchParams));
}
