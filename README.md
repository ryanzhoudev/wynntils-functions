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
- `/ide` – Monaco IDE with a browser-local LSP worker
- `/api/functions` – dynamic function catalog API from Postgres/Prisma

### IDE/LSP architecture

Goal: behavior parity with the extension-side language tooling flow.

How it works:

- The IDE behavior is based on `wynntils-functions-tools`.
- Browser-safe LSP logic lives in `lib/ide/browser-lsp`.
- The IDE starts a Web Worker in the user's browser for completions, hovers, and diagnostics.
- The worker catalog is built from `/api/functions`, so IDE metadata comes from the same database-backed function data as the docs.
- IDE compile command uses logic adapted from the same reference implementation.

Reference:
<https://github.com/DevChromium/wynntils-functions-tools>

### Local development

#### Install

```bash
pnpm install
```

#### Run locally

```bash
pnpm dev
```

#### Tests and quality checks

The test suite checks this repository's declared language behavior; full parity with the Wynntils runtime is not assumed. It has three layers:

- deterministic Vitest coverage for parsing, language features, semantic validators, catalog utilities, storage, and compilation
- a live contract check that detects production catalog drift affecting semantic overrides
- Playwright coverage through the production build, real browser Worker, Monaco editor, and both documentation UIs

Run the same deterministic checks and production build used by CI:

```bash
pnpm check
```

Validate the current production catalog (network/database availability is required):

```bash
pnpm test:catalog
```

Run the fast local browser suite, which fetches one catalog snapshot before starting:

```bash
pnpm test:e2e:chromium
```

Other useful commands:

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:e2e
```

Coverage produces text, HTML, LCOV, and JSON reports without percentage gates. Playwright keeps screenshots, video, traces, and its HTML report when a test fails.

### Continuous integration

`.github/workflows/ci.yml` runs for pull requests, pushes to `main`, and manual dispatch. It pins pnpm 10.30.1, caches pnpm dependencies, builds once, fetches the live catalog once, and reuses those exact artifacts for parallel Chromium, Firefox, and WebKit jobs. The final `CI` job is the single aggregate status intended for branch protection; configure GitHub to require `CI` before merging.

### Hosting notes

The IDE LSP runs in the user's browser, so the app does not need a separate long-running LSP bridge service.

### Database/env

Required env:

```bash
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
```

Prisma runtime prefers `DATABASE_URL`, then `DIRECT_URL`, and auto-adds `sslmode=require` when needed.

### Data model notes

The app reads table names matching the mod dump naming:

- `wynntilsFunction`
- `wynntilsArgument`
- `wynntilsDataVersion`

`wynntilsDataVersion` is used by the docs UI to show:

- source mod version
- harvested timestamp (rendered in local time)
