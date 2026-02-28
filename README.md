# Mekor Mirror

Deterministic Next.js rebuild of [mekorhabracha.org](https://www.mekorhabracha.org) with route/status parity, extracted content manifests, and Blob-backed public assets.

## Stack

- Next.js 16 App Router + TypeScript
- Mirror data pipeline with Playwright + tsx scripts
- Vercel Blob for public asset storage
- MySQL + Drizzle for form submissions
- Resend for form notification emails

## Local Setup

1. Copy environment values:

```bash
cp .env.example .env.local
```

2. Fill required values in `.env.local`:

- `BLOB_READ_WRITE_TOKEN`
- `DATABASE_URL`
- `RESEND_API_KEY`
- `FORM_NOTIFY_EMAIL_FROM`
- `FORM_NOTIFY_EMAIL_TO`

3. Generate/apply DB schema:

```bash
npm run db:generate
npm run db:push
```

4. Run the app:

```bash
npm run dev
```

## Mirror Data Pipeline

Run the full extraction/validation pipeline:

```bash
npm run mirror:all
```

Individual steps are available via:

- `npm run mirror:discover`
- `npm run mirror:snapshot`
- `npm run mirror:extract-assets`
- `npm run mirror:build-content`
- `npm run mirror:build-search`
- `npm run mirror:verify`
- `npm run mirror:blob-sync`

Generated structured outputs live under `mirror-data/` (`mirror-data/raw/` stays ignored).
