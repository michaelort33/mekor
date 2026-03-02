# Native Data Contract Matrix

This matrix is the deployment contract for native-enabled routes during mirror migration.

## Route Contracts

| Route | Template Type | View Model | Data Source | Required Fields | Optional Fields | Mirror 200 Required |
| --- | --- | --- | --- | --- | --- | --- |
| `/events` | `events-hub` | `ManagedEvent` | `lib/events/store#getManagedEvents` | `slug`, `path`, `title`, `shortDate`, `isClosed` | `location`, `timeLabel`, `startAt`, `endAt` | Yes |
| `/in-the-news` | `in-the-news-directory` | `ManagedInTheNewsArticle` | `lib/in-the-news/store#getManagedInTheNews` | `slug`, `path`, `title`, `excerpt`, `bodyText` | `publishedLabel`, `publishedAt`, `year`, `author`, `publication`, `sourceUrl`, `sourceCapturedAt` | Yes |
| `/center-city` | `kosher-directory` | `ManagedKosherPlace` | `lib/kosher/store#getManagedKosherPlaces` | `slug`, `path`, `title`, `neighborhood`, `neighborhoodLabel`, `tags`, `categoryPaths`, `tagPaths` | `address`, `phone`, `website`, `supervision`, `summary`, `locationHref`, `sourceCapturedAt` | Yes |
| `/cherry-hill` | `kosher-directory` | `ManagedKosherPlace` | `lib/kosher/store#getManagedKosherPlaces` | `slug`, `path`, `title`, `neighborhood`, `neighborhoodLabel`, `tags`, `categoryPaths`, `tagPaths` | `address`, `phone`, `website`, `supervision`, `summary`, `locationHref`, `sourceCapturedAt` | Yes |
| `/main-line-manyunk` | `kosher-directory` | `ManagedKosherPlace` | `lib/kosher/store#getManagedKosherPlaces` | `slug`, `path`, `title`, `neighborhood`, `neighborhoodLabel`, `tags`, `categoryPaths`, `tagPaths` | `address`, `phone`, `website`, `supervision`, `summary`, `locationHref`, `sourceCapturedAt` | Yes |
| `/old-yorkroad-northeast` | `kosher-directory` | `ManagedKosherPlace` | `lib/kosher/store#getManagedKosherPlaces` | `slug`, `path`, `title`, `neighborhood`, `neighborhoodLabel`, `tags`, `categoryPaths`, `tagPaths` | `address`, `phone`, `website`, `supervision`, `summary`, `locationHref`, `sourceCapturedAt` | Yes |
| `/search` | `search-page` | `SearchIndexRecord` | `lib/mirror/loaders#loadSearchIndex` | `path`, `type`, `title`, `excerpt`, `terms` | `description` | No |

## Mirror-Only Field Lifecycle

| Dataset | Field | Current Owner | Consumers | Phase | Removal Trigger |
| --- | --- | --- | --- | --- | --- |
| `events` | `capturedAt` | `lib/events/extract#ExtractedEvent` | `db.events.sourceCapturedAt` | `deprecating` | Events ingestion no longer reads mirrored timestamps |
| `events` | `sourceJson` | `lib/events/extract#ExtractedEvent` | `db.events.sourceJson` | `deprecating` | Events route and audits stop relying on mirror audit payloads |
| `events` | `sourceCapturedAt` | `lib/events/store#ManagedEvent` | Database sync path | `remove-after-route-migration` | Event consumers use native ingestion timestamps |
| `in-the-news` | `capturedAt` | `lib/in-the-news/extract#ExtractedInTheNewsArticle` | `db.in_the_news.sourceCapturedAt` | `deprecating` | News ingestion no longer uses mirror capture timestamps |
| `in-the-news` | `sourceJson` | `lib/in-the-news/extract#ExtractedInTheNewsArticle` | `db.in_the_news.sourceJson` | `deprecating` | News ingestion/audits no longer require mirrored source payload |
| `in-the-news` | `sourceCapturedAt` | `lib/in-the-news/store#ManagedInTheNewsArticle` | Database sync path | `remove-after-route-migration` | Article consumers use native ingestion timestamps |
| `kosher` | `capturedAt` | `lib/kosher/extract#ExtractedKosherPlace` | `db.kosher_places.sourceCapturedAt`, freshness fallback | `deprecating` | Freshness comes from native ingestion metadata |
| `kosher` | `sourceJson` | `lib/kosher/extract#ExtractedKosherPlace` | `db.kosher_places.sourceJson` | `deprecating` | Kosher ingestion/audits stop requiring mirror snapshots |
| `kosher` | `sourceCapturedAt` | `lib/kosher/store#ManagedKosherPlace` | Database sync path | `remove-after-route-migration` | Place consumers use native ingestion timestamps |

## Enforcement

- Runtime validation: `lib/native/contracts.ts` validators run inside native stores/pages.
- CI contract gate: `npm run native:verify` (`scripts/mirror/08_verify_native_contracts.ts`).
- Drift tests: `tests/native-contracts.test.ts`.
