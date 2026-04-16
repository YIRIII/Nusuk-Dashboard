# Category 1: Cumulative Performance

## Constraints checked

| ID | Constraint | Threshold | Combined actual | Headroom | Verdict |
|---|---|---|---|---|---|
| C-01 | Zero OOM on 100-URL batch incl. videos (BR-1) | No process kills | ~1.2 GB peak (Puppeteer + Node + exceljs) | **22.8 GB** on Oracle 24 GB | **PASS** |
| C-03 | 100-URL batch latency (BR-6) | <30 min | ~5–10 min blended estimate | 20–25 min | **PASS** |
| C-03b | Single capture median latency (BR-6) | <20s | ~1–3s (FxTwitter) to ~10s (Puppeteer fallback) | Pass for median; p95 close to threshold | **PASS (warning on p95)** |
| C-02 | Arabic glyph correctness (BR-2) | 100% | Cannot guarantee 100% deterministically due to Chromium bug #4996 | — | **CONDITIONAL PASS** |

## Memory footprint analysis

| Component | Typical RSS | Source |
|---|---|---|
| Node.js + Express + pino | ~80–120 MB | [Skyvern 2025](https://www.skyvern.com/blog/puppeteer-vs-playwright-complete-performance-comparison-2025/) |
| Puppeteer + Chromium (1 browser, 1 context) | ~300 MB idle, ~500 MB during navigation | Same source |
| exceljs generating 100-row workbook | ~50 MB transient | [exceljs docs](https://github.com/exceljs/exceljs) |
| Media buffers (capped at 2 MB × ≤5 concurrent) | ~10 MB | Config-enforced |
| **Combined peak on 100-URL batch** | **~900 MB – 1.2 GB** | Calculated |

**Oracle Cloud Always Free Ampere A1 Flex**: 24 GB RAM. Headroom = ~22.8 GB (96% free). **PASS with massive headroom.**

Contrast with v1 baseline (Render free 512 MB): ~800 MB estimate during batch ÷ 512 MB ceiling = OOM at ~6 tweets. This is why the tier change alone resolves BR-1.

## Latency chain analysis

Single-capture best-case (FxTwitter path):
- DNS + TLS ~100ms → FxTwitter fetch ~300ms → metadata parse ~50ms → screenshot via Puppeteer `page.pdf`-style render of embed ~800ms → Supabase upload ~200ms → **~1.5s median**

Single-capture worst-case (full fallback to Puppeteer on tweet URL):
- FxTwitter timeout (~3s) → oEmbed attempt (~2s) → Puppeteer on embed page (~5s) → **~10s p95**

100-URL batch (blended 85% FxTwitter / 15% fallback + sequential with browser recycling every 25):
- 85 × 2s + 15 × 10s + 4 × 2s browser recycles = 170s + 150s + 8s = **~5.5 min**

All comfortably within BR-6. **PASS.**

## Arabic rendering caveat (C-02)

Chromium's Arabic shaping bug ([Puppeteer #4996](https://github.com/puppeteer/puppeteer/issues/4996), open) creates an irreducible residual risk. Golden-file test suite (Supporting System #04) catches regressions; cannot eliminate Chromium-level edge cases.

**Remediation**: Adjust BR-2 target from "100%" to **"100% on golden-file suite + manual spot-check of weekly report"**. This is a threshold-relaxation remediation and should be explicitly approved as a known trade-off.

## Verdict

**PASS** for BR-1, BR-6. **CONDITIONAL PASS** for BR-2 with explicit threshold-wording adjustment.
