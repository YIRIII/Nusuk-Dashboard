# Known Issues
**Last Updated:** 2026-04-15

Initialized from CONSTRAINT_VALIDATION README (CONDITIONAL PASS — 5 conditions must be satisfied to lift conditional status).

| ID | Issue | Severity | Found | Related |
|----|-------|----------|-------|---------|
| KI-001 | BR-2 Arabic correctness threshold must be reworded to "100% on golden-file suite + manual weekly spot-check" due to Chromium #4996 residual. Update BRD/PRD wording. | Medium | 2026-04-15 | Phase 0 / C-02 |
| KI-002 | CI (x64) ↔ Prod (ARM64) parity for golden-file tests — must configure `docker buildx --platform linux/arm64` under QEMU in GitHub Actions. | High | 2026-04-15 | Step 0.8 / CV-03 |
| KI-003 | PDPL archival-basis processing record — written at `docs/compliance/pdpl-processing-record.md`. Region chosen: `ap-northeast-1` (Tokyo). **Follow-up:** evaluate whether PDPL guidance will require KSA/EU residency; if yes, migrate to `eu-central-1` (Frankfurt). | Medium | 2026-04-15 | Step 0.9 / C-09 |
| KI-004 | X ToS capture-vs-scrape posture doc pending; optional legal review ($0–500). | Medium | 2026-04-15 | Step 0.9 / C-08 |
| KI-005 | Hajz target-date confirmation pending — drives Phase 5 launch deadline (nominally ~10 months / ~430h). | High | 2026-04-15 | Phase 5 |
| KI-006 | Oracle Cloud Always Free ARM64 region availability not yet verified; fallback path is Oracle x86 AMD or Render free tier. | Medium | 2026-04-15 | Step 0.10 / TC-1 |
| KI-007 | Timeline headroom tight: 600h available / 520h required (15% margin, C-10 WARNING). Phase 6 items (Sentry/Axiom/backup/stats) deferred from MVP. | Low | 2026-04-15 | Phase 5 → 6 |
