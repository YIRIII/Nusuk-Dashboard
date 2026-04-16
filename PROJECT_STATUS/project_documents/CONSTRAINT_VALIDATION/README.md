# Constraint Validation — Nusuk Social Tracker v2

**Idea**: `nusuk-social-tracker-v2`
**Date**: 2026-04-15
**Status**: Complete
**Verdict**: **CONDITIONAL PASS**

---

## Extracted Constraints

| ID | Source | Description | Threshold | Type | Scope |
|---|---|---|---|---|---|
| C-01 | BR-1 | Zero OOM crashes during batch capture including video tweets | No process kills on 100-URL batch | Performance | Cross-capability |
| C-02 | BR-2 | Arabic/RTL glyph rendering correctness | 100% of AR captures render correctly | Performance | Cross-capability |
| C-03 | BR-6 | Capture latency | Single <20s median, p95 <40s; 100-URL batch <30min | Performance | Cross-capability |
| C-04 | BR-15 | Total recurring infrastructure cash cost | $0/month | Cost | System-wide |
| C-05 | BR-3 | Screenshot preserves original post layout/fonts/media | Audit-grade fidelity | Performance | Single-capability |
| C-06 | BR-4 | Bilingual AR/EN UI with full RTL | Non-negotiable | Performance | Single-capability |
| C-07 | BR-10 | Golden-file tests gate deploys | 100% CI coverage on AR reference set | Quality | Cross-capability |
| C-08 | BRD §12 | X (Twitter) ToS posture | Capture ≠ scrape; low volume | Compliance | System-wide |
| C-09 | BRD §12 | Saudi PDPL archival basis documented | Processing-activity record + region selection | Compliance | System-wide |
| C-10 | IDEA.md | Timeline to next Hajj season | ~10 months, solo developer part-time | Timeline | System-wide |

## Assessment Scope

| Document | Available | Key Input |
|---|---|---|
| Technical Options | ✅ | 8 capability recommendations |
| Supporting Systems | ✅ | 5 system recommendations (13 N/A) |
| Pricing Strategy | ❌ | Skipped — internal tool, no revenue |
| Marketing Strategy | ❌ | Skipped — no GTM |
| Budget Context | ✅ | $0/mo hard constraint |
| Risk Assessment | ❌ | Optional, not yet run |
| Business Research | ✅ | 9 themes, 2 Hero, 4 Depth, 2 Supporting, 1 Skip |

## Validation Progress

| # | Category | File | Constraints Checked | Violations | Status | Updated |
|---|---|---|---|---|---|---|
| 1 | Cumulative Performance | [01-cumulative-performance.md](01-cumulative-performance.md) | 4 | 1 conditional | complete | 2026-04-15 |
| 2 | Cost Feasibility | [02-cost-feasibility.md](02-cost-feasibility.md) | 1 | 0 | complete | 2026-04-15 |
| 3 | Technical Compatibility | [03-technical-compatibility.md](03-technical-compatibility.md) | 12 (+3 issues) | 0 FAIL, 1 HIGH, 2 MEDIUM | complete | 2026-04-15 |
| 4 | Capacity & Timeline | [04-capacity-timeline.md](04-capacity-timeline.md) | 1 | 1 warning | complete | 2026-04-15 |

---

## Constraint Register

| ID | Constraint | Threshold | Combined Actual | Headroom | Verdict |
|---|---|---|---|---|---|
| C-01 | Zero OOM on 100-URL batch | No kills | ~1.2 GB peak on 24 GB host | ~22.8 GB | **PASS** |
| C-02 | 100% Arabic correctness | 100% | Cannot deterministically guarantee (Chromium #4996) | — | **CONDITIONAL** — reword to "100% on golden-file suite + manual spot-check" |
| C-03 | 100-URL batch <30min | 30 min | ~5–10 min blended | 20–25 min | **PASS** |
| C-03b | Single capture <20s median, p95 <40s | Median 20s, p95 40s | ~1–3s median, ~10s p95 | Large median; tight p95 | **PASS** |
| C-04 | $0/mo cash recurring | $0 | $0 | 0 (equality) | **PASS** |
| C-05 | Audit-grade fidelity | Preserve layout/fonts/media | Preserved via Puppeteer + bundled fonts | — | **PASS** |
| C-06 | Bilingual AR/EN RTL | Non-negotiable | React 18 + Tailwind RTL + react-i18next | — | **PASS** |
| C-07 | Golden-file tests gate deploys | 100% coverage on AR set | Planned via Playwright `toHaveScreenshot` in CI | — | **PASS** (pending CV-03 ARM64 CI parity remediation) |
| C-08 | X ToS posture | Capture-not-scrape documented | Documentation task | — | **CONDITIONAL** — documentation pending |
| C-09 | PDPL archival basis | Processing record + region choice | Documentation + config task | — | **CONDITIONAL** — documentation pending |
| C-10 | 10-month solo part-time timeline | 600h avail / 520h required | Ratio 1.15 | 15% | **WARNING** |

## Compatibility Issues Register

| ID | Issue | Options involved | Severity | Resolution | Effort |
|---|---|---|---|---|---|
| CV-01 | X (Twitter) ToS prohibits scraping | Puppeteer fallback on tweet URL | MEDIUM | Document capture-vs-scrape position; optional legal review | 2h + optional |
| CV-02 | PDPL archival-basis documentation | Supabase region + processing record | MEDIUM | Region selection + 1-page processing record | 3h |
| **CV-03** | **CI (x64) ↔ Prod (ARM64) parity risk for golden-file tests** | Playwright tests in GitHub Actions vs. Puppeteer+system-Chromium on Oracle ARM64 | **HIGH** | Build with `docker buildx --platform linux/arm64` under QEMU in CI (slower) OR use GitHub Actions ARM64 runners (faster, may be limited) | +4h |

No CRITICAL issues. No runtime, DB, auth, or protocol conflicts.

## Feasibility Matrix

| Constraint | Hosting (01) | Capture (01) | Arabic (02) | Fallback (03) | UI (04) | TypeSafe (05) | Obs (06) | Export (07) | Data (08) | Combined |
|---|---|---|---|---|---|---|---|---|---|---|
| C-01 OOM | ✅ (24 GB) | ✅ (pooled mgr) | — | ✅ (media caps) | — | — | — | ✅ (streaming) | — | ✅ PASS |
| C-02 AR rendering | — | — | ⚠️ (Chromium #4996) | — | — | — | — | — | — | ⚠️ COND. |
| C-03 latency | ✅ | ✅ (1–3s fast path) | — | ✅ | — | — | — | — | ✅ | ✅ PASS |
| C-04 $0/mo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| C-05 fidelity | — | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ PASS |
| C-06 AR/EN RTL | — | — | ✅ | — | ✅ | — | — | ✅ | — | ✅ PASS |
| C-07 CI gating | — | — | — | — | — | ✅ | — | — | — | ⚠️ COND. (CV-03) |
| C-10 timeline | — | — | — | — | — | — | — | — | — | ⚠️ WARN (1.15 ratio) |

## Remediation Roadmap

### C-02 — Arabic correctness threshold wording

**Action**: Reword BR-2 in the Final BRD from "100% of AR captures render correct glyphs" to **"100% on golden-file reference suite + manual spot-check of weekly report"**. This explicitly acknowledges the irreducible Chromium shaping residual and defines a verifiable CI criterion + human-in-the-loop safeguard.
**Owner**: PRD author (captured here for incorporation in `/prd-generator`).
**Effort**: wording change.

### CV-03 — CI/prod ARM64 parity

**Action**: In GitHub Actions workflow, configure `docker buildx` with `linux/arm64` platform under QEMU user-mode emulation for golden-file tests. Document the CI config in a runbook.
**Alternative**: GitHub Actions ARM64 runners when available on the repo plan.
**Effort**: ~4h one-time.

### CV-01 — X ToS documentation

**Action**: Add a 1-page "Capture vs. Scrape" note to the repo's `docs/compliance/`. Note internal use, low volume, screenshot-only (no data extraction or redistribution). Optional external legal review ($0–500).
**Effort**: 2h (self-written); optional + external review.

### CV-02 — PDPL archival basis

**Action**: Select Supabase region (EU-central recommended if KSA unavailable), write a 1-page processing-activity record citing the archival public-interest basis, store in repo `docs/compliance/`.
**Effort**: 3h.

### C-10 — Capacity headroom (15% is tight)

**Action (recommended combined approach)**:
1. **Phase the delivery**: Phase 1 MVP excludes Axiom/Sentry integration and backup automation (deploy them post-launch in Phase 2).
2. **Trim optional scope**: defer BR-13 (dashboard stats) and BR-14 (ZIP backup/restore) to Phase 2.
3. **Monitor weekly-hour commitment**: if real commitment drops below 15 hrs/week, re-evaluate and consider deferring more.

With phasing, Phase 1 effort drops to ~430h, ratio rises to 1.40 (comfortable).
**Effort**: scope decision, no incremental cost.

## Verdict: **CONDITIONAL PASS**

**Rationale**: No hard FAILs. The only HIGH-severity technical issue (CV-03) has a documented low-effort remediation. C-02 requires a threshold wording adjustment that formalizes a known trade-off. C-10 capacity is tight but resolvable via phasing. Cost constraint satisfied with massive headroom on every free tier.

### Conditions

| # | Condition | Constraint | Required Action | Affects |
|---|---|---|---|---|
| 1 | Reword BR-2 to "100% on golden-file suite + manual spot-check" | C-02 | Adjust wording in Final BRD | PRD, Final BRD |
| 2 | Configure ARM64 QEMU in GitHub Actions for golden-file tests | C-07 / CV-03 | +4h CI setup during infra phase | PRD (architecture section) |
| 3 | Document X ToS capture-vs-scrape posture | C-08 / CV-01 | Add `docs/compliance/x-tos.md` | PRD (compliance section) |
| 4 | Document PDPL archival basis + select Supabase region | C-09 / CV-02 | Add `docs/compliance/pdpl-record.md` | PRD (compliance + infra) |
| 5 | Phase delivery — defer BR-13, BR-14, and Axiom/Sentry to Phase 2 | C-10 | Update PRD to reflect 2-phase plan | PRD (roadmap) |
| 6 | Verify actual Hajz timing matches 10-month assumption | C-10 | Confirm target date | PRD scheduling |

## Impact on Pipeline Documents

| Document | Adjustment Needed | Details |
|---|---|---|
| Tech Options | No | All recommendations remain valid |
| Supporting Systems | No | All recommendations remain valid |
| Pricing Strategy | No | Skipped — still skipped |
| Marketing Strategy | No | Skipped — still skipped |
| PRD (to be generated) | **Yes** | Must incorporate: phased roadmap (Phase 1 MVP / Phase 2 polish); reworded BR-2 threshold; CV-03 CI remediation; CV-01/CV-02 compliance documentation tasks |
| BRD (Final) | **Yes** | Reword BR-2; confirm phased delivery scope split; note conditional-pass status and mitigations |
