# Saved components

A shelf for fully built sections that were pulled off a live page but worth keeping
around to reuse later. Each one is **self-contained** — it ships its own markup,
data, and styles (a co-located `*.module.css`), so you can drop it into any page
without wiring up extra constants or CSS.

To reuse one, import it and render it where you want it:

```tsx
import { PesachBooksSection } from "@/components/saved/pesach-books-section";

<PesachBooksSection />
```

## Contents

- **`pesach-books-section.tsx`** — "Rabbi Eliezer Hirsch — Pesach books" promo
  (two book cards on a slate background). Seasonal; was on the homepage and
  removed after Pesach.
