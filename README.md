# Mekor Habracha

The native Next.js website for [Mekor Habracha / Center City Synagogue](https://www.mekorhabracha.org).

## Stack

- Next.js 16 App Router and TypeScript
- Postgres with Drizzle
- Vercel Blob
- SendGrid
- Stripe

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in the values required for the feature you are working on:

```bash
cp .env.example .env.local
```

3. Start the site:

```bash
npm run dev
```

## Commands

```bash
npm run dev
npm run build
npm run start
npm run db:generate
npm run db:push
npm run db:studio
```

Operational data imports, backfills, and maintenance commands remain available in `package.json`.

## Development policy

Changes reach `main` through pull requests. Direct pushes, force-pushes, and branch deletion are blocked by GitHub branch protection.
