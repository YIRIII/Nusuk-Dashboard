# Feature: Arabic / RTL Rendering Correctness (BR-2, BR-10)

**BRs covered**: BR-2 (100% AR glyph correctness), BR-10 (golden-file tests)
**Category**: Core capture output quality
**Tier**: **Hero**

## What it does

Every screenshot containing Arabic text must render with correct glyphs, proper shaping, and correct weights — and regressions must be caught by CI golden-file tests before deploy.

## Competitive analysis

| Alternative | Arabic correctness | Why it fails |
|---|---|---|
| **v1 (current)** | Intermittent — tofu squares, missing bold | Late CSS font injection, partial weight registration in Satori fallback |
| Satori (Vercel) | **Not supported** | Confirmed: doesn't support RTL ([github.com/vercel/satori](https://github.com/vercel/satori)) |
| Puppeteer default | Partial | Chromium bug #4996 (2020, unfixed) |
| Hosted screenshot APIs | **Unverified** | None of Browserless / Urlbox / ScreenshotOne / ApiFlash / SnapRender publicly document Arabic font support |
| Playwright | Same as Puppeteer | Same Chromium rendering engine |

**Gap**: No off-the-shelf solution guarantees Arabic correctness. The fix is infrastructure, not a tool: pre-install OS fonts in the Docker image, inject via `evaluateOnNewDocument` before navigation, wait on `document.fonts.ready`, register all weights, and gate deploys on golden-file tests.

## Impact severity: **Major inconvenience**

Absence = the weekly report contains screenshots that are unreadable or look unprofessional in Arabic. For a Saudi government program context, this undermines the tool's compliance/audit value entirely.

## Novelty rating: **Incremental**

Known-good techniques exist in the Puppeteer community; the novelty is applying them *together* systematically with test coverage (which v1 didn't have).

## Rebuild-specific notes

- Docker image includes `fonts-kacst` and `fonts-noto-sans-arabic` pre-installed at `/usr/share/fonts/TTF`.
- `--font-render-hinting=none` flag for consistent kerning.
- Golden-file tests store reference PNGs for 5-10 representative AR-language tweets and diff against them on every deploy.
- Drop Satori entirely — removing a silent-bug source.
