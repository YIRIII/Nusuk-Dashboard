# System: Golden-File Screenshot Test Infrastructure

**Priority**: Essential
**Recommendation**: `jest-image-snapshot` (or Playwright's built-in `toHaveScreenshot`) running in the production Docker image
**Est. Year 1 cost**: $0
**Detection signals**: BR-10 (golden-file tests for Arabic rendering regression detection) — the concrete mechanism backing BR-2 (Hero tier)

## Why it's needed

The single biggest v1 pain point that's invisible without this: Arabic font rendering changed intermittently with no signal. Golden-file tests render a fixed set of AR-language reference cases through the actual production capture pipeline and pixel-diff against committed baselines. Any regression fails CI.

## Build vs Buy matrix

| Option | Fit | Cash | Founder time | Fully-loaded Year 1 |
|---|---|---|---|---|
| **`jest-image-snapshot`** (open source, Vitest-compatible fork exists) | Mature, zero-config pixel diff, threshold configurable | $0 | 10h setup (including baseline curation) + 2h/mo upkeep | $560 |
| **Playwright `toHaveScreenshot`** | First-party, excellent diff output, richer config | $0 | 10h setup + 2h/mo upkeep | $560 |
| **Percy / Chromatic** hosted visual regression | $0 free tier (Percy: 5K screenshots/mo); cloud diff UI | $0 (free tier) | 6h setup | $240 |
| **Applitools Eyes** | AI-powered diff, enterprise pricing beyond free | $0 free tier (up to 100 screenshots/mo) | 8h | $320 |
| **Build from scratch** (pngdiff on CI) | Full control | $0 | 30h | $1,200 |

Sources:
- `jest-image-snapshot`: https://github.com/americanexpress/jest-image-snapshot (accessed 2026-04-15)
- Playwright screenshots: https://playwright.dev/docs/test-snapshots
- Percy free tier: https://percy.io/pricing (accessed 2026-04-15)
- Applitools pricing: https://applitools.com/pricing/ (accessed 2026-04-15)

## Options Rating Matrix

KPIs: AR-language coverage reliability (High 30%), runs inside same Docker image as prod (High 25% — font environment parity), $0 (Medium 15%), setup/upkeep friction (Medium 15%), diff UX for debugging (Medium 10%), lock-in (Low 5%).

| Option | AR reliability | Docker parity | $0 | Setup | Diff UX | Lock-in | Weighted |
|---|---|---|---|---|---|---|---|
| **Playwright toHaveScreenshot** ⭐ | 5 | 5 | 5 | 4 | 5 | 5 | **4.80** |
| jest-image-snapshot | 5 | 5 | 5 | 4 | 3 | 5 | 4.50 |
| Percy free | 4 (threshold tuning needed for AR) | 2 (renders in Percy's env, not yours) | 5 | 5 | 5 | 2 | 3.90 |
| Applitools free | 4 | 2 | 4 (100/mo tight) | 4 | 5 | 2 | 3.60 |
| Build from scratch | 5 | 5 | 5 | 1 | 2 | 5 | 3.55 |

**Winner**: **Playwright `toHaveScreenshot`** — if Playwright is already chosen for any browser-automation in the app, the library is free. Otherwise `jest-image-snapshot` with Vitest is nearly equivalent.

## Recommendation

- **Baseline set**: 8–12 representative AR-language tweets covering: short AR text, long RTL paragraphs, AR + emoji, AR + English mixed, AR with Twitter username prefix, news article snippet, video tweet with AR caption.
- **Run location**: inside the production Docker image (same base image, same fonts, same Chromium) so the CI environment matches runtime — this is non-negotiable for font-rendering reliability.
- **Threshold**: tight (e.g., 0.1% pixel difference) to catch anti-aliasing shifts, but allow a manual "update baseline" action for intentional design changes.
- **Gate**: CI fails if any reference fails → deploy blocked. Analyst-facing workflow: if a legitimate change breaks the baseline, re-run CI with `UPDATE_SNAPSHOTS=true` after manual review.

## Impact if absent

Direct impact on BR-2. Without golden-file tests, Arabic rendering regressions only surface when the analyst spots them in a report — which is exactly how v1's silent Arabic bug persisted.
