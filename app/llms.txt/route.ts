import { NextResponse } from "next/server";

export const dynamic = "force-static";

const llmsText = `# Mekor Habracha / Center City Synagogue

> Official website for Mekor Habracha, a welcoming Modern Orthodox synagogue and Jewish community in Center City, Philadelphia.

## Core information

- [About Mekor](https://www.mekorhabracha.org/about-us): Community identity, history, and values.
- [Visit Us](https://www.mekorhabracha.org/visit-us): Address, contact information, parking, and visitor guidance.
- [Davening](https://www.mekorhabracha.org/davening): Shabbat and weekday service information.
- [Events](https://www.mekorhabracha.org/events): Current synagogue events and schedules.
- [Our Rabbis](https://www.mekorhabracha.org/our-rabbis): Rabbinic leadership and public resources.
- [Membership](https://www.mekorhabracha.org/membership): Membership options and application information.
- [Philadelphia Kosher Guide](https://www.mekorhabracha.org/center-city): Searchable kosher establishments across the Philadelphia area.
- [Bulletin Board](https://www.mekorhabracha.org/mekor-bulletin-board): Current community notices, programs, and resources.
- [Past Newsletters](https://www.mekorhabracha.org/newsletters): Full public archive of weekly community newsletters.
- [Ask Mekor](https://www.mekorhabracha.org/ask-mekor): Public community questions and answers.

## Contact

- Address: 1500 Walnut St, Suite 206, Philadelphia, PA 19102
- Phone: +1 215-525-4246
- Email: admin@mekorhabracha.org

Public pages are available for search, citation, and responsible AI use. Private account, member-directory, admin, and API routes are not public content.
`;

export async function GET() {
  return new NextResponse(llmsText, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
