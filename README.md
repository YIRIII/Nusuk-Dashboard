# Hadaq Tracker v2

Internal tool to capture and archive Nusuk Card public mentions (Twitter/X + news articles) with Arabic rendering fidelity and audit-grade screenshots.

## Quick Start

```bash
nvm use                 # Node 20
npm install
npm run dev:api         # http://localhost:3001
npm run dev:web         # http://localhost:5173 (proxies /api to :3001)
```

## Verification

```bash
npm run typecheck
npm run lint
```

## Layout

- `schemas/` — shared Zod schemas (`@hadaq/schemas`)
- `src/` — Express + pino backend (`@hadaq/api`)
- `web/` — React + Vite + Tailwind + shadcn/ui (`@hadaq/web`)
- `PROJECT_STATUS/` — pipeline config, roadmap, planning docs, research snapshot
- `docs/` — legacy design notes (pre-idea-forge)

## Docs

See `PROJECT_STATUS/index.md` for the roadmap, known issues, and phase plans.
