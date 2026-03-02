# McCarr Development Note

No mirror-based page rendering is allowed in this project.

Build and ship pages as native React/T3 components with strict visual parity goals:
- Match layout, spacing, typography, and interactions as closely as possible.
- Avoid adding new `mirror-*` render paths (`DocumentView`, `mirror routes`, mirrored data fallbacks) to product pages.
- If a page is currently mirrored, prioritize full native migration before release.

