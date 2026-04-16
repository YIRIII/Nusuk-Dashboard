# Pipeline Config — Nusuk Social Tracker v2

**Project Root:** /Users/yiri/Desktop/Projects/Nusuk-Dashboard
**Instruction File:** CLAUDE.md (to be created in Phase 0)
**Created:** 2026-04-15
**Source Research:** /Users/yiri/Desktop/Projects/Idea-Forge/ideas/nusuk-social-tracker-v2 (Tier A — Full)

## Key Paths
- **Source code:** `src/` (backend) + `web/` (frontend) — created in Phase 0
- **Tests:** `tests/` (unit + golden-file visual tests)
- **Docker:** `docker/` (Dockerfile with Arabic fonts pre-installed)
- **Documentation:** `PROJECT_STATUS/`
- **Planning docs:** `PROJECT_STATUS/docs/planning/`
- **Technical docs:** `PROJECT_STATUS/docs/technical/` (design-system.md, architecture.md)
- **Phase records:** `PROJECT_STATUS/phases/`
- **Research snapshot:** `PROJECT_STATUS/project_documents/` (read-only)

## Project Conventions
- **Language:** TypeScript (strict, zero `any`)
- **Backend:** Node 20 LTS + Express + Zod + pino
- **Frontend:** React 18 + Vite + Tailwind CSS + react-i18next (AR default, RTL-first)
- **Component library:** shadcn/ui
- **Theme:** Light + Dark, both first-class
- **Responsive:** Desktop-first responsive
- **Brand colors:** Neutral defaults placeholder (swap to Nusuk brand palette later)
- **Capture:** Puppeteer + system Chromium on Oracle Cloud Always Free ARM64 (24 GB)
- **DB/Storage:** Supabase (Postgres + Storage + pg_cron)
- **Validation:** Zod at every boundary (HTTP, DB, external APIs)
- **Logging:** pino structured JSON → stdout
- **CI/CD:** GitHub Actions with `docker buildx --platform linux/arm64` under QEMU
- **Budget:** $0/month hard recurring cost (internal tool, bootstrapped)

## Verification Command
```bash
npx tsc --noEmit && npm test && npm run test:golden
```

## Extra Project Files
- `docker/Dockerfile` — multi-arch image with `fonts-noto-sans-arabic` + `fonts-kacst` pre-installed
- `tests/golden/` — Playwright `toHaveScreenshot` baselines for Arabic rendering
- `docs/compliance/` — PDPL archival-basis record + X ToS capture-vs-scrape memo (from constraint remediation)
