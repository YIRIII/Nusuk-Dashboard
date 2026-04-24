# CLAUDE.md — Hadaq Tracker v2

Project instructions for Claude Code sessions working in this repo.

## What this project is
Internal tool that archives public mentions of the **Nusuk Card** (Saudi Hajj digital pilgrim ID) from Twitter/X and news articles. Converts pasted URLs → audit-grade screenshots + metadata for weekly PR reports. Bilingual AR/EN with RTL-first layout. Single internal analyst user.

## Pipeline state
- **Tracker:** `PROJECT_STATUS/roadmap.md` (lean checklist, links to per-phase plans)
- **Config:** `PROJECT_STATUS/pipeline-config.md`
- **Known issues / blockers:** `PROJECT_STATUS/known-issues.md`
- **Per-phase detail:** `PROJECT_STATUS/docs/planning/phase-N-name.md`
- **Research snapshot (read-only):** `PROJECT_STATUS/project_documents/`

When starting work, read the roadmap, pick the next unchecked step under the current phase, open its linked plan, implement it, then update the checkbox + `Next:` pointer.

## UI & Design System
When creating or modifying any UI component, ALWAYS read the design system first:
- **Design system:** `PROJECT_STATUS/docs/technical/design-system.md`
- **Shared components:** `web/src/components/ui/`

Key rules:
- Use semantic color tokens (`bg-background`, `text-foreground`, etc.); never hardcode hex/RGB.
- Import shared components from `@/components/ui/` before creating new ones.
- Support both light and dark themes.
- Support both RTL (AR) and LTR (EN); prefer logical properties (`ms-*`, `me-*`, `text-start`) over directional.
- All user-visible strings live in `web/src/i18n/{ar,en}.json` — never hardcode UI strings.

## Tech stack
- Node 20 LTS, TypeScript strict, ESM modules, Zod at every boundary
- Backend: Express + pino (structured JSON logs) + trace-id middleware
- Frontend: React 18 + Vite + Tailwind + shadcn/ui + react-i18next
- DB: Supabase (Postgres + Storage + `pg_cron`)
- Capture (Phase 1+): Puppeteer + system Chromium on Oracle Cloud Ampere A1 ARM64 (24 GB)
- Fonts: OS-installed `fonts-noto-sans-arabic` + `fonts-kacst` (Docker image, not CSS)
- CI: GitHub Actions with `docker buildx --platform linux/arm64,linux/amd64` under QEMU

## Code conventions
- TypeScript strict — zero `any`, zero unused. ESLint enforces.
- Zod schemas are the single source of truth for request/response shapes (in `schemas/src/`, package `@hadaq/schemas`).
- Backend handlers use `validateBody(schema)` / `validateQuery(schema)` middleware; never parse `req.body` directly.
- Logger: `import { logger } from './logger.js'`. Always use it; never `console.log`.
- Every request has a trace ID (`x-trace-id` header); include it in log contexts.

## Arabic correctness threshold
Per KI-001 / constraint C-02: the tool must pass **100% on the golden-file suite + manual weekly spot-check**. Pixel-perfect cross-version rendering is impossible due to Chromium bug #4996; residual variance is accepted and covered by manual spot-check.

## Data retention
Soft-delete: `deleted_at` column on `posts`. Hard purge: `pg_cron` job `purge_expired_posts` runs daily at 03:00 UTC, deletes rows whose `deleted_at` is older than 30 days (PDPL requirement — see `docs/compliance/pdpl-processing-record.md`).

## Compliance
- PDPL processing record: `docs/compliance/pdpl-processing-record.md`
- X ToS posture (capture, not scrape): `docs/compliance/x-tos-posture.md`

## Commands
```bash
npm run typecheck     # tsc -b across all workspaces
npm run lint          # ESLint
npm run dev:api       # Express on :3001
npm run dev:web       # Vite on :5173 (proxies /api to :3001)
npm run build         # schemas → api → web
```

## What to avoid
- Introducing paid services. Budget is **$0/month** recurring (NFR-5).
- Hardcoding colors, spacing, or UI strings.
- Using `puppeteer` with its bundled Chromium. Always use system Chromium via `executablePath`.
- CSS `@font-face` for Arabic. Fonts are installed at the OS level in the Docker image.
- Silencing Zod errors. If a boundary fails validation, log it and return 400.
- Starting on a phase whose Prerequisites aren't checked off.
