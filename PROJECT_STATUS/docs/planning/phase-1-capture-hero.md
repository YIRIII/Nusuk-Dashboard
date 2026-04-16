# Phase 1: Capture Engine + Arabic Rendering (HERO pair)

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned

## Research Links
- **Business Research:** BR-1 (Capture reliability, score 4.40 HERO), BR-2 (Arabic rendering correctness, score 4.15 HERO) → [project_documents/BUSINESS_RESEARCH/01-capture-reliability.md](../../project_documents/BUSINESS_RESEARCH/01-capture-reliability.md), [02-arabic-rendering.md](../../project_documents/BUSINESS_RESEARCH/02-arabic-rendering.md)
- **Technical Options:** TC-1 (Capture Engine + Hosting), TC-2 (Arabic/RTL Rendering) → [project_documents/TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md](../../project_documents/TECHNICAL_OPTIONS/01-capture-engine-and-hosting.md), [02-arabic-rendering.md](../../project_documents/TECHNICAL_OPTIONS/02-arabic-rendering.md)
- **Supporting Systems:** SS-04 (Golden-file testing with Playwright)
- **BRD Section:** NFR-1 (Reliability: 0 process-kill on 100-URL batch), NFR-3 (Correctness)
- **PRD Section:** F-2 (Tweet capture core), F-4 (Arabic/RTL rendering)

## Recommended Tech Stack
- Puppeteer + system Chromium (ARM64 native, NOT puppeteer-bundled)
- Launch flags: `--font-render-hinting=none`, `--disable-dev-shm-usage`, `--no-sandbox`
- Browser pool: 2–4 concurrent instances with restart-on-error
- Playwright for visual regression (`toHaveScreenshot` with threshold)

## Estimated Cost
$0 recurring. Counts against Oracle free VM resources only.

## Budget Context
- **Phase cost vs. budget:** 0% ongoing. PASS.

## Prerequisites
- Phase 0 complete (Docker image with Arabic fonts, Oracle VM, CI with ARM64 parity).

## Regulatory Deadlines
None direct — implicitly feeds the Hajz launch target (Phase 5).

## Constraint Validation
- **Affected constraints:** C-02 (Arabic correctness — 100% on golden-file suite), CV-03 (HIGH — CI/Prod ARM64 parity).
- **Remediation steps included:** 1.4 (golden-file harness with ARM64 CI parity confirmation).
- **Warnings:** Chromium bug #4996 — residual Arabic shaping edge cases accepted via manual weekly spot-check.

## Implementation Steps
- [ ] **1.1:** `src/capture/puppeteer-service.ts` — spawns system Chromium via `puppeteer.launch({ executablePath: '/usr/bin/chromium' })`. Single `capturePage(url, options)` function returning `{ screenshot: Buffer, html: string, performance: { ttfb, duration } }`.
- [ ] **1.2:** Browser pool (`generic-pool` or hand-rolled) sized to 2 on ARM64 VM. On crash → discard instance, spawn replacement. Memory ceiling 4 GB per instance; abort on RSS threshold.
- [ ] **1.3:** Launch arg audit: `--font-render-hinting=none`, `--disable-dev-shm-usage`, `--no-sandbox`, `--disable-gpu` (headless), `--lang=ar`. Set viewport 1280×2000. Document each flag rationale in code comment.
- [ ] **1.4:** Playwright test harness at `tests/golden/` with `toHaveScreenshot()` assertions. CI job runs under `linux/arm64` QEMU to match prod exactly (resolves CV-03).
- [ ] **1.5:** Generate baseline goldens from 10+ curated Arabic snippets: plain text, diacritics (تَشْكِيل), Hindi-Arabic numerals, mixed AR/EN, punctuation, RTL/LTR bidi edges. Commit PNGs to `tests/golden/baselines/`.
- [ ] **1.6:** `POST /capture { url }` endpoint: Zod-validate input, call capture service, upload screenshot to Supabase Storage, insert row into `captures`, return `{ id, screenshot_url, metadata }`.

## Key Decisions (from research)
- System Chromium over puppeteer-bundled: bundled Chromium doesn't ship ARM64 build; system package resolves reliably via apt.
- Pool size 2 (not more): Oracle Ampere A1 has 24 GB but shared with Node + Supabase client + Express; 2 Chromium instances fits comfortably and crashes-don't-cascade.
- Golden-file suite as the Arabic "correctness oracle" — full pixel match impossible across Chromium versions, so pin via `@playwright/test` version lock + baseline refresh cadence.
- Manual weekly spot-check accepted as residual coverage for Chromium #4996 (C-02 reworded threshold).

## Acceptance Criteria
- Single capture completes in <20s median (NFR-2).
- 0 process kills over 10× consecutive runs (internal pre-batch test).
- Golden-file test suite passes with 0 failures on CI (ARM64) and prod.
- Arabic text in screenshots shows correct ligatures (اللغة العربية renders connected, not as 7 separated glyphs).

## Competitive Context
No competitor ships this at $0. SaaS alternatives (Meltwater, Urlbox, ScreenshotOne) start at $50–500/month and still fail Arabic-ligature correctness without custom fonts. This phase is the core differentiator.

## Research Gaps
None.
