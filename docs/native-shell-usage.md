# Native Shell Usage

`NativeShell` is the shared layout wrapper for all native routes. It provides:

- the shared site navigation (`SiteNavigation`)
- shared spacing/typography/color tokens from `app/globals.css`
- consistent page framing across desktop and mobile

## Drop-In Pattern

```tsx
import { NativeShell } from "@/components/navigation/native-shell";

export default function TeamPage() {
  return (
    <NativeShell currentPath="/team-4" className="team-page" contentClassName="team-page__content">
      <header>
        <h1>Volunteer</h1>
        <p>Help support Mekor programs.</p>
      </header>
      {/* page content */}
    </NativeShell>
  );
}
```

## Teams 2/3/4/5 Examples

- Team 2 route:
  - `currentPath="/team-2"`
  - optional `contentClassName="team-2-page"`
- Team 3 route:
  - `currentPath="/team-3"`
  - optional `contentClassName="team-3-page"`
- Team 4 route:
  - `currentPath="/team-4"`
  - optional `contentClassName="team-4-page"`
- Team 5 route:
  - `currentPath="/team-5"`
  - optional `contentClassName="team-5-page"`

If a team route should highlight a specific nav item, pass that route path as `currentPath`.

## Shared Tokens

Shared tokens live in `:root` inside `app/globals.css`:

- `--native-page-max`
- `--native-page-pad-inline`
- `--native-page-pad-block`
- `--native-nav-text`
- `--native-page-copy`
- `--native-nav-accent`
- `--native-nav-border`
- `--native-focus-ring`

Use these tokens for any team-specific styling to keep pages aligned with the shared shell.
