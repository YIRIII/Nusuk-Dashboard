# Phase 0: Project Foundation

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned

## Research Links
- **Business Research:** BR-6 (Type safety), BR-7 (Observability), BR-4 (Bilingual RTL UI — scaffolding only) → [project_documents/BUSINESS_RESEARCH](../../project_documents/BUSINESS_RESEARCH/)
- **Technical Options:** TC-5 (Type Safety), TC-6 (Observability), TC-4 (Bilingual UI scaffold), TC-1 (Hosting) → [project_documents/TECHNICAL_OPTIONS](../../project_documents/TECHNICAL_OPTIONS/)
- **Supporting Systems:** SS-02 (CI/CD), SS-03 (Scheduled Jobs), SS-05 (Deployment) → [project_documents/SUPPORTING_SYSTEMS](../../project_documents/SUPPORTING_SYSTEMS/)
- **BRD Section:** NFR-5 (Cost), NFR-6 (Compliance), NFR-8 (Type Safety)
- **PRD Section:** M1 (Infrastructure milestone)

## Recommended Tech Stack
- **Runtime:** Node 20 LTS + TypeScript strict + Zod
- **Backend:** Express
- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui + react-i18next
- **DB:** Supabase (Postgres free tier) + `pg_cron` + generated types
- **Logging:** pino → stdout
- **Container:** Docker (multi-arch: arm64 primary, amd64 for CI)
- **Host:** Oracle Cloud Always Free Ampere A1 Flex (24 GB ARM64); fallback Oracle x86 AMD or Render free
- **CI:** GitHub Actions with `docker buildx` QEMU ARM64
- **Network:** Cloudflare Tunnel (origin hiding, free tier)

## Estimated Cost
$0 recurring. One-time: optional X ToS legal review up to $500.

## Budget Context
- **Active tier:** Bootstrap — $0/month hard cap
- **Phase cost vs. budget:** 0% ongoing; within envelope
- **Sanity check:** PASS — no ongoing paid services introduced

## Prerequisites
- Oracle Cloud Always Free signup verified (else switch to x86 AMD or Render — see KI-006).
- Supabase project created; region chosen with PDPL considerations (KI-003).
- GitHub repo + Actions enabled.

## Regulatory Deadlines
- **PDPL (Saudi Personal Data Protection Law):** processing-activity record required (effective Sept 2024).
- **X Developer ToS (Sept 2023):** capture-vs-scrape posture documented.

## Constraint Validation
- **Affected constraints:** C-02 (Arabic threshold wording), C-08 (X ToS), C-09 (PDPL), C-10 (timeline WARNING), CV-03 (CI/Prod ARM64 parity HIGH).
- **Remediation steps included:** 0.8 (ARM64 buildx), 0.9 (PDPL + X ToS docs), 0.11 (CLAUDE.md reword Arabic threshold).
- **Warnings:** C-10 — 15% timeline headroom; defer Phase 6 items from MVP.

## Implementation Steps
- [ ] **0.1:** Initialize monorepo (`src/` Express backend, `web/` Vite+React frontend, shared `schemas/` for Zod). TS strict, zero `any`. Add ESLint + Prettier.
- [ ] **0.2:** `docker/Dockerfile` (ARM64 base) with `apt install fonts-noto-sans-arabic fonts-kacst chromium`. Multi-stage build. Verify fonts with `fc-list | grep -i arabic` in CI.
- [ ] **0.3:** Supabase project + SQL migration: `posts` table (id, url, normalized_url UNIQUE, kind, metadata jsonb, captured_at, deleted_at nullable), `captures` table (id, post_id FK, media_type enum, storage_path, created_at). Enable `pg_cron`.
- [ ] **0.4:** pino logger module with trace-id middleware; `GET /health` + stubbed `GET /api/metrics` returning empty 24h window.
- [ ] **0.5:** Zod schemas at every boundary (HTTP request/response, Supabase query results, external API responses). Generate Supabase types via CLI.
- [ ] **0.6:** Tailwind + shadcn/ui init; configure `dir="rtl"` default, AR locale via react-i18next; light+dark theme token palette using shadcn CSS variables.
- [ ] **0.7:** Create `PROJECT_STATUS/docs/technical/design-system.md` documenting color tokens (light+dark), typography (Cairo for AR, Inter for EN), spacing scale, shadcn component list, RTL rules.
- [ ] **0.8:** GitHub Actions workflow: lint, typecheck, unit tests, `docker buildx build --platform linux/arm64,linux/amd64` under QEMU. Cache Docker layers.
- [ ] **0.9:** Write `docs/compliance/pdpl-processing-record.md` (archival basis, data categories, retention 30d, region) and `docs/compliance/x-tos-posture.md` (capture-not-scrape rationale, FxTwitter/oEmbed public-data basis).
- [ ] **0.10:** Provision Oracle Always Free ARM64 VM (or fallback). Install Docker + Cloudflare Tunnel daemon. Configure SSH deploy key for GitHub Actions.
- [ ] **0.11:** Create `CLAUDE.md` referencing design-system.md, pipeline-config.md, and current Arabic-threshold wording ("100% on golden-file suite + manual weekly spot-check").

## Key Decisions (from research)
- TypeScript strict + Zod is foundational — every other capability depends on it (TC-5 is the "Depth foundation").
- Oracle ARM64 (24 GB) chosen over all alternatives because v1 died from OOM on 512 MB; this is 48× headroom.
- Docker-installed OS fonts (not CSS `@font-face`) chosen because v1's CSS injection failed non-deterministically on Arabic shaping.
- Phase 6 items (Sentry, Axiom, stats, backup) deferred from MVP to respect C-10 timeline WARNING.

## Acceptance Criteria
- `npx tsc --noEmit` passes with zero errors.
- Docker image builds successfully on both `arm64` and `amd64` in CI.
- `fc-list | grep -i arabic` returns both Noto Sans Arabic and KACST in the container.
- `GET /health` returns 200 from the Oracle VM through Cloudflare Tunnel.
- Supabase schema migration applied; `pg_cron` extension enabled.
- Compliance docs exist and are linked from CLAUDE.md.
- design-system.md exists with color/typography/component tokens documented.

## Competitive Context
Competitors (Meltwater, Brand24) don't face this problem set because they're SaaS with budget; v2's differentiator is $0 cost + Arabic correctness + audit-grade capture, which this foundation enables.

## Research Gaps
None for this phase (Tier A).
