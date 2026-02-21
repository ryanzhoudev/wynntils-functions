# Wynntils Functions

Live site: <https://wynntils-functions.ryanzhou.dev/>

Docs + IDE for Wynntils/Artemis info-box functions.

## Routes

- `/` – redesigned docs UI
- `/old` – classic docs UI
- `/ide` – Monaco IDE (this branch uses **upstream LSP server over WebSocket**)
- `/api/functions` – dynamic function catalog API from Postgres/Prisma

## This branch: upstream LSP bridge experiment

Branch: `feat/ide-upstream-lsp-bridge`

Goal: test behavior parity with the real Wynntils extension server flow.

How it works:

- Upstream repo is vendored in `vendor/wynntils-functions-tools`.
- Upstream LSP server (`vendor/.../server/src`) is compiled to `.generated/upstream-lsp`.
- A WebSocket bridge forwards Monaco JSON-RPC requests to the upstream Node LSP process.
- IDE compile command uses logic adapted from upstream compile implementation.

Upstream reference:
<https://github.com/DevChromium/wynntils-functions-tools>

## Local development

### Install

```bash
pnpm install
```

### Docs/web app only

```bash
pnpm dev
```

### IDE + upstream LSP bridge (recommended on this branch)

```bash
pnpm dev:ide-upstream
```

This starts:

- Next app (default port 3000)
- LSP bridge at `ws://127.0.0.1:3001/wynntils`

You can override bridge settings with env vars:

- `WYNNTILS_LSP_HOST`
- `WYNNTILS_LSP_PORT`
- `WYNNTILS_LSP_PATH`

And point the frontend to a custom bridge URL via:

- `NEXT_PUBLIC_WYNNTILS_LSP_WS_URL`

### Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Hosting notes for upstream-LSP mode

Because this mode needs a long-running WebSocket + child-process bridge, it is **not a pure Vercel-serverless fit**.

Recommended deploy patterns:

1. Keep Next app on Vercel, host LSP bridge on a small VPS/container, set `NEXT_PUBLIC_WYNNTILS_LSP_WS_URL`.
2. Host both web app + bridge together on a Node-friendly platform (Railway/Fly/Render/VPS).

## Database/env

Required env:

```bash
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
```

Prisma runtime currently prefers `DATABASE_URL`, then `DIRECT_URL`, and auto-adds `sslmode=require` when needed.
