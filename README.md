# Wynntils Functions

Live site: <https://wynntils-functions.ryanzhou.dev/>

Documentation + IDE for Wynntils/Artemis info-box functions.

## App overview

This project now runs as a **full-stack Next.js app** (App Router):

- `GET /api/functions` serves function metadata from Postgres via Prisma.
- Frontend fetches JSON and caches it in localStorage for fast repeat loads.
- Redesigned docs UI lives at `/`.
- Classic UI is preserved at `/old`.
- New Monaco-based IDE lives at `/ide`.

## IDE (route: `/ide`)

Current IDE features:

- Monaco editor with Wynntils language tokenization
- Browser-side LSP worker for completions, hover, and diagnostics
- Superset compile action (`let` + `@{var}` support)
- Local file workspace in localStorage:
    - create, rename, duplicate, delete
    - import/export individual files

Language tooling in `lib/ide/lsp-core/*` is adapted from:
<https://github.com/DevChromium/wynntils-functions-tools> (MIT).

## Tech stack

- Next.js 16 (App Router)
- React 19
- Prisma 7 + PostgreSQL
- Tailwind 4
- Monaco Editor
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
pnpm typecheck
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
- Runtime Prisma client prefers `DATABASE_URL`, then falls back to `DIRECT_URL`.
- Runtime Prisma client auto-adds `sslmode=require` if missing.

## Data update flow (from Artemis)

Function/argument data is exported from Artemis to CSV and imported manually into Postgres.

1. Run `/execute FunctionDump dumpFunctions` in game.
2. Use the generated SQL in pgAdmin (psql tool) to reset/prepare tables.
3. Import CSV into `functions`, then `arguments`.
4. Refresh the website (or redeploy on Vercel if needed).

Reference feature in Artemis: <https://github.com/Wynntils/Artemis/pull/1887>

## Project structure

- `app/api/functions/route.ts` – API endpoint for catalog JSON
- `app/ide/page.tsx` – IDE page
- `components/function-catalog.tsx` – redesigned docs UI (`/`)
- `components/legacy/docs.tsx` – classic UI (`/old`)
- `components/ide/wynntils-ide.tsx` – IDE UI shell
- `lib/use-function-catalog.ts` – frontend fetch + cache logic
- `lib/prisma.ts` – Prisma client setup (Prisma 7 adapter)
- `lib/ide/*` – IDE workspace, Monaco wiring, and browser LSP worker
