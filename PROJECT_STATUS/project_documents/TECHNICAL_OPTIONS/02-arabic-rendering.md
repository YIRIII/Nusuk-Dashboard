# Capability 02: Arabic / RTL Rendering in Screenshots (Hero)

**BRs covered**: BR-2, BR-10 · **Tier**: Hero

## Problem

Chromium's Arabic shaping has documented issues (Puppeteer issue [#4996](https://github.com/puppeteer/puppeteer/issues/4996), open since 2020, accessed 2026-04-15). Runtime CSS font injection is unreliable. v1's Satori fallback silently produced broken Arabic because [Satori doesn't support RTL](https://github.com/vercel/satori) (confirmed on repo README).

## KPIs (weights)

1. Arabic glyph correctness (Very High, 30%) — BR-2
2. Reliability of font loading (High, 25%) — no intermittent failures
3. Integration with Puppeteer on ARM64 Docker (High, 15%)
4. Cash cost (High, 10%) — must be $0
5. Bold/italic/weight coverage (Medium, 10%)
6. Regression-test friendliness (Medium, 10%) — supports BR-10 golden-file workflow

## Font-loading options

| # | Approach | AR correctness | Reliability | Notes |
|---|---|---|---|---|
| A ⭐ | **Docker image pre-installs `fonts-noto-sans-arabic` + `fonts-kacst` at `/usr/share/fonts/TTF`** + `fc-cache -f` in Dockerfile; no in-page font CSS needed | 5 | 5 | OS-level — Chromium picks it up deterministically. [Browserless blog 2025](https://www.browserless.io/blog/puppeteer-print) describes exact pattern. |
| B | Ship `.ttf` files as Docker layer + inject via `evaluateOnNewDocument('document.fonts.add(new FontFace(...))')` before `page.goto` + `await page.evaluate(() => document.fonts.ready)` | 4 | 4 | Works, but one more moving part than A |
| C | CSS `@font-face` in served HTML + `page.addStyleTag` | 3 | 2 (v1's approach — intermittent) | Regressed in v1 |
| D | Satori (server-side React → PNG) | 0 | — | **Excluded — no RTL support** |

## Chromium flags / fine-tuning

- `--font-render-hinting=none` — consistent kerning on small text ([Latenode 2025](https://community.latenode.com/t/how-can-i-integrate-custom-fonts-in-handlebars-templates-when-using-puppeteer/2924))
- `--lang=ar-SA` — locale hint to shaping engine
- `await page.waitForFunction(() => document.fonts.check('1em "Noto Sans Arabic"'))` after navigation, with 3-second timeout

## Font choice

- **Noto Sans Arabic** (SIL OFL 1.1, free) — primary body font; Google-maintained, excellent Unicode coverage
- **Cairo** (SIL OFL 1.1, free) — fallback/heading; already used in v1 follow-up form

## PDF export AR font embedding

PDF exports must embed the AR font or Acrobat renders tofu. Options:

- If PDF is produced by Puppeteer `page.pdf()` → the browser embeds fonts automatically ✅ (preferred for parity with screenshots)
- If PDF is produced server-side with `pdfkit` → explicitly register the `.ttf` via `doc.registerFont('Noto Sans Arabic', '/path/to/NotoSansArabic-Regular.ttf')`

## Recommendation

**Option A** — Install Arabic fonts in the Docker image at OS level. No in-page font CSS. For safety, also implement **B** as a belt-and-suspenders layer (costs nothing, guards against future regressions).

Use **Puppeteer `page.pdf()`** for PDF export to inherit the browser's font embedding automatically.

Establish golden-file test suite (Capability handled by Supporting System #04) with ≥8 AR reference cases gated in CI.

## Key risk

Chromium's Arabic shaping bug surface (#4996) could cause subtle glyph issues that golden-file tests should catch but can't fix. Mitigation: if a specific ligature fails, pin Chromium version and document the workaround; real-world impact at ~200 captures/season is low.

**Est. Year 1 cost: $0 cash** · fonts are SIL OFL (free).
