# Business Research: Nusuk Social Tracker v2

**Idea**: `nusuk-social-tracker-v2` (IF-Y-002)
**Date**: 2026-04-15
**Status**: business-research-complete
**Scope note**: Internal-tool rebuild. "Competitive analysis" is adapted — for most features the meaningful comparison is (a) v1 in production, (b) the manual fallback workflow, (c) the narrow set of potential alternatives already surveyed in `RESEARCH.md` (Archive.today compromised, Wayback Machine not audit-grade, paid tools out of $0 budget). Feature tiers are driven by **reliability impact on the analyst's weekly report workflow**, as specified by the user.

---

## Research Progress

| # | Feature Theme | BRs Covered | File | Status | Updated |
|---|---|---|---|---|---|
| 01 | Capture reliability | BR-1, BR-6 | [01-capture-reliability.md](01-capture-reliability.md) | complete | 2026-04-15 |
| 02 | Arabic / RTL rendering | BR-2, BR-10 | [02-arabic-rendering.md](02-arabic-rendering.md) | complete | 2026-04-15 |
| 03 | Audit-grade capture | BR-3, BR-12 | [03-audit-grade-capture.md](03-audit-grade-capture.md) | complete | 2026-04-15 |
| 04 | Bilingual RTL UI | BR-4 | [04-bilingual-rtl-ui.md](04-bilingual-rtl-ui.md) | complete | 2026-04-15 |
| 05 | Export & backup | BR-5, BR-14 | [05-export-and-backup.md](05-export-and-backup.md) | complete | 2026-04-15 |
| 06 | Type safety | BR-8 | [06-type-safety.md](06-type-safety.md) | complete | 2026-04-15 |
| 07 | Observability | BR-9 | [07-observability.md](07-observability.md) | complete | 2026-04-15 |
| 08 | Data lifecycle (dedupe/soft-delete/dashboard) | BR-7, BR-11, BR-13 | [08-data-lifecycle.md](08-data-lifecycle.md) | complete | 2026-04-15 |
| 09 | Automated monitoring | BR-16 | [09-automated-monitoring.md](09-automated-monitoring.md) | complete | 2026-04-15 |

*BR-15 (`$0/month` infra) is a cross-cutting constraint, not a feature — covered in BUDGET_CONTEXT.md.*

---

## Impact Severity Matrix

| # | Feature Theme | Severity | Rationale |
|---|---|---|---|
| 01 | Capture reliability | Major inconvenience | Absence → analyst reverts to manual (~5 hr/wk during Hajz peak); entire tool value collapses |
| 02 | Arabic rendering | Major inconvenience | Absence → unreadable AR screenshots; undermines audit/compliance value in Saudi gov context |
| 03 | Audit-grade capture | Major inconvenience | Core value proposition — without fidelity, the tool is no better than a general web archive |
| 04 | Bilingual RTL UI | Major inconvenience | Non-negotiable given user profile (non-technical, AR-preferring) |
| 05 | Export & backup | Major inconvenience | Absence → analyst can't produce the weekly report from the tool |
| 06 | Type safety | Major inconvenience (indirect) | No direct user-visible effect; root-cause fix for a whole class of v1 bugs |
| 07 | Observability | Minor inconvenience (upfront), major enabler (over time) | Absence → next failure takes months to root-cause, like v1's |
| 08 | Data lifecycle | Minor inconvenience | Dedupe/soft-delete/dashboard failures are inconvenient but workaroundable |
| 09 | Automated monitoring | Minor inconvenience | Analyst does this manually today; automation is not "must" |

No life-threatening or safety-risk features — consistent with an internal archival tool.

---

## Stakeholder Criteria & Scoring Framework

**Evaluation context**: This is not a hackathon, investor pitch, or government RFP. The sole evaluator is **the analyst's workflow during Hajz peak**. Therefore the scoring framework is a **reliability-driven rubric** tuned to the user's stated priority: same tool, done right.

Factors (weights derived from the user's own framing and the BRD's success criteria):

| Factor | Weight | Why |
|---|---|---|
| **Failure-mode severity** | 30% | The entire v2 purpose is to eliminate v1's reliability failures; features directly addressing those rank highest |
| **Prerequisite for other features** | 20% | A feature that other features depend on (e.g., reliable capture is prerequisite to everything else) scores higher |
| **Proven value in v1** | 20% | Features that v1 already delivered and the analyst actively used are known-good bets |
| **$0-budget fit** | 15% | Must be implementable with free-tier infra and free/open tooling |
| **Engineering discipline multiplier** | 10% | Cross-cutting features (types, observability) that prevent future regressions amplify other features' value |
| **Diminishing returns flag** | 5% | Features whose marginal value is low get penalized |

Following `.claude/skills/options-rating-matrix/SKILL.md`: scores are 1-5 per factor with a per-cell rationale, weighted and ranked.

---

## Feature Scoring Matrix

Scores 1-5 per factor. Weighted total = Σ(score × weight) / Σ(weights) × 5 to normalize back to 1-5.

| # | Feature | Failure severity (30%) | Prerequisite (20%) | v1 proven (20%) | $0 fit (15%) | Discipline (10%) | Diminishing returns (5%) | **Weighted** | Tier |
|---|---|---|---|---|---|---|---|---|---|
| 01 | Capture reliability | 5 (root of v1 failure) | 5 (everything depends on it) | 3 (worked sometimes) | 4 (Oracle free fixes it) | 3 | 5 | **4.40** | **Hero** |
| 02 | Arabic rendering | 5 (most visible failure) | 4 (all AR captures) | 2 (intermittent in v1) | 5 (free fonts) | 3 | 5 | **4.15** | **Hero** |
| 03 | Audit-grade capture | 4 | 4 (capture output quality) | 5 (v1's strength when working) | 5 | 2 | 5 | **4.05** | **Depth** |
| 06 | Type safety | 3 (indirect — root-cause fix for a class of bugs) | 4 (enables safe refactors) | 1 (absent in v1) | 5 | 5 (cross-cutting) | 4 | **3.40** | **Depth** |
| 07 | Observability | 3 (indirect — detection, not prevention) | 3 | 1 (absent in v1) | 5 | 5 (cross-cutting) | 4 | **3.25** | **Depth** |
| 04 | Bilingual RTL UI | 3 (non-negotiable but solved) | 4 | 5 (works in v1) | 5 | 2 | 5 | **3.80** | **Depth** |
| 05 | Export & backup | 3 | 3 | 5 | 5 | 2 | 5 | **3.55** | **Supporting** |
| 08 | Data lifecycle | 2 | 2 | 5 | 5 | 2 | 5 | **2.95** | **Supporting** |
| 09 | Automated monitoring | 2 | 1 | 1 (disabled in v1) | 2 (X ToS + scraping risk) | 1 | 2 | **1.60** | **Skip** |

### Tier assignments

- **Hero (top 2)**: 01 Capture reliability, 02 Arabic rendering — the two failures that broke v1 and the two achievements that will define v2's success.
- **Depth (next 4)**: 03 Audit-grade capture, 04 Bilingual RTL UI, 06 Type safety, 07 Observability — the foundations and cross-cutting disciplines.
- **Supporting (next 2)**: 05 Export & backup, 08 Data lifecycle — working features from v1, carry forward with re-implementation hygiene.
- **Skip (1)**: 09 Automated monitoring — defer past MVP; re-evaluate only after core capture proven stable.

---

## Strategic Recommendations

### 1. Tech research focus
`/tech-research` should spend **most depth** on the Hero tier:

- **01 Capture reliability**: deep research on Oracle Cloud Always Free setup, Puppeteer + @sparticuz/chromium-min vs. Playwright in ARM/Ampere env, pooled browser manager patterns, batch-recycling thresholds.
- **02 Arabic rendering**: deep research on Docker font installation patterns for ARM architecture, `document.fonts.check` polling best practices, golden-file test tooling (Playwright test screenshots? pixel-diff libraries? jest-image-snapshot?), AR-capable PDF font embedding.

Depth tier gets thorough but not exhaustive treatment. Supporting tier gets standard treatment. Skip tier gets lightweight or no research.

### 2. v1 reuse map

| Aspect | Carry forward from v1 | Rebuild in v2 |
|---|---|---|
| Supabase schema (core shape) | ✅ | Add `media_type` discriminated union, unique index on `normalized_url` |
| Tweet fallback chain | Partial — keep FxTwitter → oEmbed → embed page | **Drop Satori fallback** (no RTL support) |
| Export formats | ✅ | Re-implement in TypeScript, embed AR fonts in PDF |
| Soft-delete UX | ✅ | Carry forward |
| Bilingual UI (AR/EN RTL) | ✅ | Re-implement with TypeScript + `next-intl` |
| Render deployment | ❌ | Replace with Oracle Cloud Always Free (fallback: Render) |
| React 19 JSX frontend | ❌ | Replace with React + TypeScript + Vite |
| Puppeteer singleton pair | ❌ | Replace with single pooled browser manager |
| No types | ❌ | Full TypeScript + Zod |
| No observability | ❌ | Pino + `/api/metrics` + 30s RSS sampling |

### 3. Scope discipline

**Reject** new feature requests during v2 rebuild unless they directly address a Hero or Depth tier reliability/fidelity gap. v2's purpose is not feature expansion — it is reliability. The only added surfaces are:

- `/api/metrics` (observability)
- Golden-file test suite (hidden — CI only)
- `media_type` column (schema addition, transparent to user)

Everything else is feature-equivalent to v1.

### 4. Business model validation

N/A — internal tool. No revenue model to validate. `/marketing-strategy` and `/pricing-strategy` can be skipped as planned.

### 5. Go-to-market

Not applicable. The user (the analyst) is already captive; rollout is a deploy + "use v2 instead of v1" communication, not a GTM motion.

### 6. Regulatory deep-dive

No new regulatory issues beyond what was captured in the BRD:
- X ToS capture-vs-scrape distinction remains the key legal posture to document.
- PDPL archival basis documentation is a one-off compliance task, not a feature.

### 7. Risk watch

- If Oracle Cloud Always Free signup is blocked, Render-free fallback + aggressive browser recycling + media caps is the Plan B. Tech research must validate Plan B independently so both deployment paths are viable.
- If golden-file tests reveal that no Puppeteer + font configuration can hit 100% AR correctness deterministically, the BR-2 target is reduced to ≥98% with manual-review fallback for the residual. This is a constraint-validation question.

---

## Summary for downstream skills

- **Hero tier drives `/tech-research`**: Capture reliability + Arabic rendering are the capabilities needing deepest vendor/technique comparison.
- **Depth tier gets thorough treatment**: TS/Zod tooling choices, observability stack (pino + optional free-tier collector), PDF/Excel library comparison for AR support.
- **Supporting tier is carry-forward**: Confirm v1's library choices still make sense in a TypeScript context; lightweight research.
- **Skip BR-16** until post-MVP.
- **$0/mo is a hard constraint** — any option that doesn't respect BR-15 is disqualified.
