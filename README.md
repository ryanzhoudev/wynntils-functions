# [Wynntils Functions](https://wynntils-functions.ryanzhou.dev/)

This is a small, automatically generated documentation + IDE site for [Wynntils](https://github.com/Wynntils/Wynntils) info-box functions.
Function and argument descriptions are pulled from the same data the mod exports (including text sourced from its translation data).
There is search/filtering on the docs page, plus a browser IDE with Monaco + LSP support.

## How it works

The site pulls from a Postgres database generated from the [Wynntils](https://github.com/Wynntils/Wynntils) mod.
Right now this database is hosted on [neon.tech](https://neon.tech), and is manually refreshed when functions are added or changed in the mod.
Data generation time and version are shown on the site.

This is done by the dump feature added in [Wynntils/Wynntils#1887](https://github.com/Wynntils/Wynntils/pull/1887).
That feature exports function data to CSV and also generates an SQL command that wipes/rebuilds the schema before import.

### Manual update flow

First, run `/execute FunctionDump dumpFunctions` in-game.
If all goes well, chat should confirm that **three** CSV files were generated:

- `wynntilsFunction.csv`
- `wynntilsArgument.csv`
- `wynntilsDataVersion.csv`

It will also tell you the DB prep SQL was copied to your clipboard.

Next, in [pgAdmin 4](https://www.pgadmin.org/download/), run that SQL in psql.
Then refresh the `public` schema and import the CSVs in this order:

1. `wynntilsFunction`
2. `wynntilsArgument`
3. `wynntilsDataVersion`

For each import, use:

- Header: checked
- Encoding: `UTF8`
- Format: `csv`

Once import is done, verify the site shows the updated functions.
A full site redeploy is not required (the app reads dynamically from the DB).

---

## Technical details

### Routes

- `/` – redesigned docs UI
- `/old` – classic docs UI
- `/ide` – Monaco IDE (connected to upstream-style LSP over WebSocket)
- `/api/functions` – dynamic function catalog API from Postgres/Prisma

### IDE/LSP architecture

Goal: behavior parity with the extension-side language tooling flow.

How it works:

- Upstream tooling is vendored in `vendor/wynntils-functions-tools`.
- Upstream LSP server (`vendor/.../server/src`) is compiled to `.generated/upstream-lsp`.
- A WebSocket bridge forwards Monaco JSON-RPC requests to the upstream Node LSP process.
- IDE compile command uses logic adapted from upstream compile implementation.

Upstream reference:
<https://github.com/DevChromium/wynntils-functions-tools>

### Local development

#### Install

```bash
pnpm install
```

#### Docs/web app only

```bash
pnpm dev
```

#### IDE + upstream LSP bridge

```bash
pnpm dev:ide-upstream
```

This starts:

- Next app (default port 3000)
- LSP bridge at `ws://127.0.0.1:3001/wynntils`

#### Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

### Hosting notes

This setup needs a long-running WebSocket + child-process bridge, so it is not a pure Vercel-serverless fit by itself.

Typical setup:

1. Host Next app on Vercel
2. Host LSP bridge on a small VPS/container
3. Set `NEXT_PUBLIC_WYNNTILS_LSP_WS_URL` to that bridge endpoint

### Database/env

Required env:

```bash
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
```

Prisma runtime prefers `DATABASE_URL`, then `DIRECT_URL`, and auto-adds `sslmode=require` when needed.

LSP bridge/frontend env (optional overrides):

```bash
WYNNTILS_LSP_HOST=127.0.0.1
WYNNTILS_LSP_PORT=3001
WYNNTILS_LSP_PATH=/wynntils
NEXT_PUBLIC_WYNNTILS_LSP_WS_URL=ws://127.0.0.1:3001/wynntils
```

### Data model notes

The app reads table names matching the mod dump naming:

- `wynntilsFunction`
- `wynntilsArgument`
- `wynntilsDataVersion`

`wynntilsDataVersion` is used by the docs UI to show:

- source mod version
- harvested timestamp (rendered in local time)
