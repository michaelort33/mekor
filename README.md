# Mekor Starter

Minimal Next.js starter for the Mekor website.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS (simple styling)
- MySQL + Drizzle ORM
- One API route: `/api/guest`
- One page: `/guest`
- Cookie token auth only (`guest_token`)
- zod validation for payloads

## Setup

1. Copy env values:

```bash
cp .env.example .env.local
```

2. Update `.env.local`:

- `DATABASE_URL` for your MySQL database
- `GUEST_API_TOKEN` for API access

3. Push schema to database:

```bash
npm run db:push
```

4. Run app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and go to `/guest`.

## API Contract

`/api/guest`

- `GET`: returns guest list
- `POST`: creates guest with `{ name, email }`

Both require a cookie:

- cookie name: `guest_token`
- value must equal `GUEST_API_TOKEN`

The `/guest` page includes a token input that writes this cookie in-browser.

## Notes

- This is intentionally bare-bones.
- No full auth, no third-party integrations, no extra routes.
- Build from this baseline as Mekor product requirements grow.
