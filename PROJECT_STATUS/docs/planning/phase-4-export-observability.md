# Phase 4: Export + Observability MVP

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned

## Research Links
- **Business Research:** BR-5 (Export & backup, 3.55 SUPPORTING), BR-7 (Observability, 3.25 DEPTH) → [05-export-and-backup.md](../../project_documents/BUSINESS_RESEARCH/05-export-and-backup.md), [07-observability.md](../../project_documents/BUSINESS_RESEARCH/07-observability.md)
- **Technical Options:** TC-7 (Export & Backup), TC-6 (Observability) → [TECHNICAL_OPTIONS/07-export-and-backup.md](../../project_documents/TECHNICAL_OPTIONS/07-export-and-backup.md), [06-observability.md](../../project_documents/TECHNICAL_OPTIONS/06-observability.md)
- **Supporting Systems:** SS-01 (Error monitoring — pino stage only in MVP)
- **PRD Section:** F-9 (Export), F-10 (Observability /api/metrics)

## Recommended Tech Stack
- `exceljs` for xlsx (RTL-aware column ordering, Arabic header row)
- Puppeteer `page.pdf()` reusing the capture pool for PDF export (AR fonts already in container)
- `archiver` for ZIP streaming
- `pino` (already from Phase 0) + in-memory 24h ring buffer for `/api/metrics`

## Estimated Cost
$0.

## Budget Context
- **Phase cost vs. budget:** 0%. PASS.

## Prerequisites
- Phase 3 complete (UI + data model).
- Phase 1 capture pool reused for PDF generation.

## Regulatory Deadlines
None.

## Constraint Validation
None new. Reuses Phase 0 pino + constraint-validated Arabic font setup for export rendering.

## Implementation Steps
- [ ] **4.1:** `src/export/excel.ts` — build workbook with Arabic header row, column order right-to-left, date columns formatted in Arabic locale. Endpoint `GET /export/xlsx?ids=...`.
- [ ] **4.2:** `src/export/pdf.ts` — render a Handlebars/JSX template of capture results to HTML, `page.pdf({ format: 'A4', printBackground: true })`. Ensure `@font-face` not needed (OS font in container). Endpoint `GET /export/pdf?ids=...`.
- [ ] **4.3:** `src/export/zip.ts` — stream ZIP containing `screenshots/*.png`, `metadata.json` (array of post+capture rows), `manifest.txt` (date, count, schema version). Endpoint `GET /export/zip?ids=...`.
- [ ] **4.4:** `/api/metrics` endpoint returning JSON: `{ window: "24h", counts: { total, per_stage: { fxtwitter, oembed, puppeteer_embed, puppeteer_direct } }, latency: { p50, p95, max }, errors: [...] }`. Backed by a ring buffer in memory (reset on process restart — acceptable for MVP).
- [ ] **4.5:** RSS sampler: every 30s call `process.memoryUsage()`, log to pino if RSS > threshold, push to metrics ring buffer. Catches memory regressions early without Sentry dependency.

## Key Decisions (from research)
- Deferred Sentry/Axiom integration to Phase 6: pino + `/api/metrics` is sufficient for MVP correctness, saves 30h against C-10 timeline WARNING.
- PDF via Puppeteer (not wkhtmltopdf or Chromium-less libs) because the capture image fonts are already in the Chromium container — reuses infrastructure, guarantees Arabic fidelity.
- Ring buffer over DB-persisted metrics: in-memory is simpler, loses data only on restart (acceptable for an internal tool checked via the UI).

## Acceptance Criteria
- Excel export opens correctly in Microsoft Excel with Arabic headers right-aligned and RTL column reading order.
- PDF export of 10 captures renders all Arabic text with correct ligatures (visual diff against golden PDF).
- ZIP export extracts cleanly; `metadata.json` validates against Zod schema.
- `/api/metrics` returns non-empty data after at least one capture in the last 24h.
- RSS sampler catches a simulated memory-leak test (inject a retained buffer growing every 30s, verify log entries).

## Competitive Context
V1 had exports but no observability — taking weeks to root-cause OOM. `/api/metrics` is v2's insurance against repeating that.

## Research Gaps
None.
