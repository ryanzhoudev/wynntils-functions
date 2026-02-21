# Wynntils Functions

Live site: <https://wynntils-functions.ryanzhou.dev/>

Documentation site for Wynntils/Artemis info-box functions.

## What changed

This project now runs as a **full-stack Next.js app** (App Router):

- `GET /api/functions` serves the function catalog from Postgres via Prisma.
- Frontend fetches that JSON and caches it locally (`localStorage`) for fast repeat loads.
- New redesigned UI uses shadcn-style components.
- Legacy UI is preserved at `/old`.

## Tech stack

- Next.js 16 (App Router)
- React 19
- Prisma 7 + PostgreSQL
- Tailwind 4
- shadcn-style UI component setup (`components/ui/*`)

## Development

### Install

```bash
pnpm install
```

### Run dev server

```bash
pnpm dev
```

### Quality checks

```bash
pnpm lint
pnpm exec tsc --noEmit
```

### Production build

```bash
pnpm build
```

## Environment variables

Create `.env` with at least:

```bash
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
```

Notes:

- Prisma CLI uses `DATABASE_URL` via `prisma.config.ts`.
- Runtime Prisma client prefers `DIRECT_URL`, then falls back to `DATABASE_URL`.

## Data update flow (from Artemis)

Function/argument data is exported from Artemis to CSV and imported manually into Postgres.

1. Run `/execute FunctionDump dumpFunctions` in game.
2. Use the generated SQL in pgAdmin (psql tool) to reset/prepare tables.
3. Import CSV into `functions`, then `arguments`.
4. Refresh the website (or redeploy on Vercel if needed).

Reference feature in Artemis: <https://github.com/Wynntils/Artemis/pull/1887>

## Project structure

- `app/api/functions/route.ts` – API endpoint for catalog JSON
- `components/function-catalog.tsx` – redesigned main UI (`/`)
- `components/legacy/docs.tsx` – preserved classic UI (`/old`)
- `lib/use-function-catalog.ts` – frontend fetch + cache logic
- `lib/prisma.ts` – Prisma client setup (Prisma 7 adapter)
