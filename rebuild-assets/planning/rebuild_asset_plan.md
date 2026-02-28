# Site Rebuild Asset Plan

## What This Covers
- Full extracted asset inventory from the provided ZIP and nested ZIPs.
- Primary page assignment per asset for rebuild execution.
- Certificate-to-post matching for Kosher pages/posts.
- Ordered implementation plan for rebuilding the site.

## Inventory Snapshot
- Total assets (non-zip): **230**
- Unique files by hash: **227**
- Duplicate groups: **3**
- `blog_image`: 82
- `ikc_certificate`: 58
- `website_image`: 49
- `stock_image`: 17
- `leadership_image`: 11
- `event_or_community_image`: 10
- `form_export_csv`: 2
- `events_export_csv`: 1

## Primary Mapping Confidence
- `high`: 135
- `medium`: 74
- `low`: 21

## Highest-Volume Target Pages
- https://www.mekorhabracha.org/: 57 primary assets
- https://www.mekorhabracha.org/kosher-posts/categories/center-city: 42 primary assets
- https://www.mekorhabracha.org/kosher-map: 22 primary assets
- https://www.mekorhabracha.org/kosher-posts/categories/main-line-manyunk: 14 primary assets
- https://www.mekorhabracha.org/kosher-posts/categories/old-york-road-northeast: 12 primary assets
- https://www.mekorhabracha.org/events: 11 primary assets
- https://www.mekorhabracha.org/kosher-posts/categories/cherry-hill: 11 primary assets
- https://www.mekorhabracha.org/our-leadership: 11 primary assets
- https://www.mekorhabracha.org/post/luhv-factory-vegan-bistro: 5 primary assets
- https://www.mekorhabracha.org/donations: 5 primary assets
- https://www.mekorhabracha.org/about-us: 4 primary assets
- https://www.mekorhabracha.org/post/bar-bombon: 3 primary assets
- https://www.mekorhabracha.org/post/charlie-was-a-sinner: 3 primary assets
- https://www.mekorhabracha.org/post/fitz-on-4th: 3 primary assets
- https://www.mekorhabracha.org/post/goldie: 3 primary assets

## Rebuild Sequence
1. Data hygiene and privacy gate
2. Core shell pages
3. Leadership and trust pages
4. Events and contact flows
5. Kosher map + restaurant collection
6. News and long-tail content migration
7. QA, redirects, and launch

## Phase Details

### 1) Data Hygiene and Privacy Gate
- Keep `Forms Inquiries csv/*.csv` private; do not put in public frontend repos.
- Review and remove spam submissions before CRM import.
- Keep `Events/events.csv` as migration input for events CMS model.

### 2) Core Shell Pages
- `/`: 57 assigned assets.
- `/about-us`: 4 assigned assets.
- Use assets from `/rebuild-assets/organized-by-page/home` and `/rebuild-assets/organized-by-page/about-us`.

### 3) Leadership and Trust Pages
- `/our-leadership`: 11 assigned assets.
- Use `/rebuild-assets/organized-by-page/our-leadership` + role folder `leadership_image`.

### 4) Events and Contact Flows
- `/events`: 11 assigned assets.
- `/donations`: 5 assigned assets.
- Migrate event records from `Events/events.csv` into the new events data model.
- Rebuild forms with new endpoints; import old records as history only.

### 5) Kosher Map + Restaurant Collection
- `/kosher-map`: 22 assigned assets.
- `/kosher-posts/categories/center-city`: 42 assigned assets.
- `/kosher-posts/categories/cherry-hill`: 11 assigned assets.
- `/kosher-posts/categories/main-line-manyunk`: 14 assigned assets.
- `/kosher-posts/categories/old-york-road-northeast`: 12 assigned assets.
- Attach IKC certificates to corresponding `post/*` entries using high-confidence match list.
- Certificates without confident match stay in `kosher-posts` backlog for manual assignment.

### 6) News and Long-tail Content
- Import `news/*`, `events-1/*`, and remaining `post/*` URLs from sitemap.
- Resolve duplicate/legacy pages (`copy-of-*`, `*-old`) with canonical redirects.

### 7) QA and Launch
- Validate every mapped asset resolves on its page.
- Run broken-link and missing-image checks.
- Verify certificate recency and event status fields before go-live.

## High-Confidence IKC->Post Matches (Sample)
- `IKC Certificates/IKC Certificates_unzipped/Magical Sweet Shop.pdf` -> https://www.mekorhabracha.org/post/magical-sweet-shop (score 1.00, high)
- `IKC Certificates/IKC Certificates_unzipped/PLNT Burger .pdf` -> https://www.mekorhabracha.org/post/plnt-burger (score 1.00, high)
- `IKC Certificates/IKC Certificates_unzipped/Unit Su Vege​.pdf` -> https://www.mekorhabracha.org/post/unit-su-vege (score 1.00, high)
- `IKC Certificates/IKC Certificates_unzipped/LUHV Factory & Vegan.pdf` -> https://www.mekorhabracha.org/post/luhv-factory-vegan-bistro (score 0.75, high)
- `IKC Certificates/IKC Certificates_unzipped/LUHV's VEGAN BISTRO-S. Philly.pdf` -> https://www.mekorhabracha.org/post/luhv-factory-vegan-bistro (score 0.75, high)
- `IKC Certificates/IKC Certificates_unzipped/Luhv Vegan Bistro.pdf` -> https://www.mekorhabracha.org/post/luhv-factory-vegan-bistro (score 0.75, high)
- `IKC Certificates/IKC Certificates_unzipped/She say Ate Cafe.pdf` -> https://www.mekorhabracha.org/post/say-she-ate-café (score 0.75, high)
- `IKC Certificates/IKC Certificates_unzipped/unit_su_vege__certificate2024 (1).pdf` -> https://www.mekorhabracha.org/post/unit-su-vege (score 0.75, high)
- `IKC Certificates/IKC Certificates_unzipped/Bar Bombon 2025 updated.pdf` -> https://www.mekorhabracha.org/post/bar-bombon (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/Fitz on 4th 2025, updated.pdf` -> https://www.mekorhabracha.org/post/fitz-on-4th (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/Sweet Box.pdf` -> https://www.mekorhabracha.org/post/sweet-box-bakery (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/bar_bombon_2024 (1) (1) (1).pdf` -> https://www.mekorhabracha.org/post/bar-bombon (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/bar_bombon_2024 (1).pdf` -> https://www.mekorhabracha.org/post/bar-bombon (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/fitz_on_4th_2024 (1) (1) (1).pdf` -> https://www.mekorhabracha.org/post/fitz-on-4th (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/fitz_on_4th_2024 (1).pdf` -> https://www.mekorhabracha.org/post/fitz-on-4th (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/joy_cafe_certificate_2024revd (1) (1) (1).pdf` -> https://www.mekorhabracha.org/post/joy-cafe (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/joy_cafe_certificate_2024revd (1).pdf` -> https://www.mekorhabracha.org/post/joy-cafe (score 0.67, high)
- `IKC Certificates/IKC Certificates_unzipped/Luhv - N York.pdf` -> https://www.mekorhabracha.org/post/_luhv (score 0.50, high)
- `IKC Certificates/IKC Certificates_unzipped/Zevi's Bakery IKC certificate 2026.pdf` -> https://www.mekorhabracha.org/post/zevi-s-bakery (score 0.50, high)
- `IKC Certificates/IKC Certificates_unzipped/goldie 5 locations.pdf` -> https://www.mekorhabracha.org/post/goldie (score 0.50, high)

## Generated Files
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/assets_inventory.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/assets_duplicate_groups.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/asset_page_mapping.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/asset_primary_page_assignment.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/page_asset_counts.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/role_asset_counts.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/page_role_matrix.csv`
- `/Users/meshulumort/Documents/mekor/rebuild-assets/planning/ikc_post_matches_high_confidence.csv`

## Working Folders
- Page-organized symlinks: `/Users/meshulumort/Documents/mekor/rebuild-assets/organized-by-page`
- Role-organized symlinks: `/Users/meshulumort/Documents/mekor/rebuild-assets/organized-by-role`