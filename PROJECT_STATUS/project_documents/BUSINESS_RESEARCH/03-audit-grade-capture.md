# Feature: Audit-Grade Capture (BR-3, BR-12)

**BRs covered**: BR-3 (preserve original layout/fonts/media), BR-12 (auto-capture linked articles from tweets)
**Category**: Output fidelity
**Tier**: **Depth**

## What it does

Screenshots must faithfully represent the original post's visual state — not a cropped preview, not a summary. When a tweet links to a news article, the tool auto-captures the article too (both rows end up in the dataset linked).

## Competitive analysis

| Alternative | Layout fidelity | Media capture | Linked-article capture |
|---|---|---|---|
| **v1** | ✅ Good when it works | ✅ (except video-as-image bug) | ✅ Yes |
| Manual screenshots | ✅ Perfect | Manual | Manual |
| Archive.today | ✅ Good (when trustworthy) | ✅ | ❌ Manual |
| Wayback Machine | ✅ Good | ✅ | ❌ No auto-link-following |
| Social listening tools (Meltwater etc.) | ❌ Summaries, not faithful screenshots | ❌ | Varies |

**Gap**: Auto-capturing tweet→linked-article chain is v1's genuine differentiator vs. manual or general-purpose tools. Worth preserving.

## Impact severity: **Major inconvenience**

Audit-grade fidelity is the core value proposition. Without it, the analyst might as well use a general web archive. Linked-article capture saves significant manual time per report.

## Novelty rating: **Incremental**

Link-following for archival is common (e.g., crawlers); the novelty is doing it at the single-URL level as a UX affordance.

## Rebuild-specific notes

- Explicit `media_type` discriminated union in schema (`tweet`, `article`, `instagram_[dropped]`, `video_tweet`, `image_tweet`) — prevents v1's video-as-image bug.
- For video tweets: capture poster frame / thumbnail, never the `.mp4` itself (memory blowup vector).
- Linked-article capture continues using OG meta-tag extraction (proven in v1).
