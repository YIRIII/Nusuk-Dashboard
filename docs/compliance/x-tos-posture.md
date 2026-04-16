# Twitter/X Terms of Service — Capture vs. Scrape Posture

**Date:** 2026-04-15 | **Version:** 1.0
**References:** X Developer Agreement (Sept 2023), X Terms of Service (current)

## Position
The Nusuk Social Tracker captures individually supplied public URLs **one at a time, on analyst request** — the same way a human would load the page in a browser, take a screenshot, and save it for their records. This is **capture**, not **scraping**:

- No bulk extraction
- No enumeration of accounts, hashtags, or search results
- No automated discovery of URLs
- No circumvention of paywalls or authentication
- No use of private/authenticated endpoints

## Data sources (all public, in priority order)
1. **FxTwitter** (`api.fxtwitter.com`) — free public preview API; used as the primary fallback
2. **Twitter oEmbed** (`publish.twitter.com/oembed`) — official public embed endpoint
3. **Twitter embed iframe** (`platform.twitter.com/embed/Tweet.html`) — official public embed surface
4. **Direct tweet page** — only as a last resort, rendering the public page (as a browser would) and screenshotting; no extraction of data not visible to an unauthenticated visitor

All sources return content that is already publicly visible to any unauthenticated visitor. No login, cookies, or API keys are used beyond what each endpoint permits anonymously.

## Volume and frequency
- Analyst-triggered only; no background crawling
- Expected volume: ~200–300 captures/year (seasonal PR reporting)
- No rate-limit evasion; if a source throttles, the tool falls back to the next chain stage and logs the event via pino

## Audit trail
Every capture records:
- Source stage attempted (FxTwitter → oEmbed → embed → direct)
- Timestamp, latency, HTTP status
- Trace ID linking request → capture → any downstream export

Structured logs enable post-hoc review if X changes policy or a subject raises a concern.

## If policy changes
If Twitter/X tightens its public-data access terms, the fallback chain degrades gracefully:
- FxTwitter or oEmbed break → Puppeteer embed path remains
- All embed paths break → tool degrades to "direct URL screenshot" only, same posture as a human using a browser screenshot tool

If a future version of the ToS prohibits even direct public-page screenshots taken on explicit user instruction, the program will re-evaluate the tool's scope.

## Optional legal review
Per KI-004, an optional external legal review (budget cap $500) may be commissioned before broader use. Not blocking for MVP since:
- Scope is single internal user, low volume, public-only data
- Capture-not-scrape posture follows widely accepted interpretation
- Tool output is internal reporting, not a public service

## Conclusion
The tool's design and usage pattern fall within commonly accepted interpretations of X's public-data terms. This document is the program's recorded posture and is reviewed annually or on ToS change.
