# McCarr Development Note

No mirror-based page rendering is allowed in this project.

Build and ship pages as native React/T3 components:
- Use the shared layout, spacing, typography, and interaction patterns.
- Avoid adding new `mirror-*` render paths (`DocumentView`, `mirror routes`, mirrored data fallbacks) to product pages.
- If a page is currently mirrored, prioritize full native migration before release.
