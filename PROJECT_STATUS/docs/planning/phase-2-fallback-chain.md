# Phase 2: Fallback Chain + Audit-Grade Capture

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned

## Research Links
- **Business Research:** BR-3 (Audit-grade capture, score 4.05 DEPTH) → [project_documents/BUSINESS_RESEARCH/03-audit-grade-capture.md](../../project_documents/BUSINESS_RESEARCH/03-audit-grade-capture.md)
- **Technical Options:** TC-3 (Tweet Fallback Chain) → [project_documents/TECHNICAL_OPTIONS/03-tweet-fallback-chain.md](../../project_documents/TECHNICAL_OPTIONS/03-tweet-fallback-chain.md)
- **BRD Section:** NFR-3 (Correctness — media_type discriminated union)
- **PRD Section:** F-2 (fallback chain), F-3 (news article capture)

## Recommended Tech Stack
- `undici` (Node 20 built-in fetch) for FxTwitter + oEmbed calls
- Reuse Phase 1 Puppeteer pool for embed-page and direct-page fallbacks
- `open-graph-scraper` or hand-rolled OG/twitter: meta extractor
- `zod` discriminated unions for `media_type: "image" | "video" | "gif" | "none"`

## Estimated Cost
$0 — FxTwitter and Twitter oEmbed are free public endpoints.

## Budget Context
- **Phase cost vs. budget:** 0%. PASS.

## Prerequisites
- Phase 1 complete (capture service + pool running).

## Regulatory Deadlines
None. X ToS posture doc (Phase 0.9) already covers the legal basis.

## Constraint Validation
- **Affected constraints:** C-08 (X ToS — capture, not scrape). All 4 fallback stages are "capture" (render + screenshot public content), not "scrape" (bulk data extraction).

## Implementation Steps
- [ ] **2.1:** `src/capture/fallbacks/fxtwitter.ts` — `fetch('https://api.fxtwitter.com/.../status/{id}')`, parse JSON, extract text + media URLs + author. Success criteria: HTTP 200 + non-empty text. Timeout 3s.
- [ ] **2.2:** `src/capture/fallbacks/oembed.ts` — `fetch('https://publish.twitter.com/oembed?url={url}')`, parse returned HTML snippet, render in a small Puppeteer page → screenshot. Timeout 6s.
- [ ] **2.3:** `src/capture/fallbacks/puppeteer-embed.ts` — navigate to `https://platform.twitter.com/embed/Tweet.html?id={id}`, wait for `.tweet` selector, screenshot. Timeout 15s.
- [ ] **2.4:** `schemas/capture.ts` — Zod discriminated union: `MediaTypeSchema = z.discriminatedUnion('media_type', [imageSchema, videoSchema, gifSchema, noneSchema])`. Every capture result must match. This is the v1 video-as-image bug root cause.
- [ ] **2.5:** `src/capture/article.ts` — for non-Twitter URLs: navigate in Puppeteer, wait for `load`, extract OG meta + `<title>` + first-paragraph, screenshot viewport + full page. `media_type: "image"` always.
- [ ] **2.6:** `src/capture/linked-article.ts` — when a tweet contains a URL card, auto-queue the linked URL as a second article capture. Link parent→child via `captures.parent_id` FK.
- [ ] **2.7:** `POST /capture/batch { urls: string[] }` — accept 1–100 URLs, enqueue, return 202 with job id. In-process BullMQ-like queue (simple Promise-based, no Redis — still $0) with concurrency 2 (matches pool size).

## Key Decisions (from research)
- Fallback order FxTwitter → oEmbed → Puppeteer-embed → Puppeteer-direct based on measured success rates (95% / 80% / 70% / baseline) and latency (<1s / ~1s / ~3s / 5–10s).
- Dropped Satori from the chain: v1 tried it; Arabic ligatures unreliable because Satori rasterizes fonts differently than Chromium.
- Discriminated union enforces at type-system level that `video.media_type === "video"`; downstream renderers can't confuse a video thumbnail with a still image.
- No Redis/BullMQ — keeps $0 budget. In-memory queue acceptable because batch is interactive (analyst triggers it, waits for it).

## Acceptance Criteria
- FxTwitter hit rate ≥90% on a sample of 100 real tweet URLs from v1's archive.
- Zero captures where `media_type` mismatches actual media (golden-file includes one video tweet to prove this).
- Batch of 100 URLs completes in <30 minutes (NFR-2).
- Linked-article captures are discoverable via `captures.parent_id` and export correctly.

## Competitive Context
FxTwitter-first is a known-good pattern in the Discord/Telegram preview-bot ecosystem. Applying it to audit capture is novel — competitors don't chain fallbacks this way (they pick one method and accept higher failure rates).

## Research Gaps
None.
