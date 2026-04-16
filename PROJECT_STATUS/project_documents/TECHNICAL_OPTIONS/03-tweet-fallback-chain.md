# Capability 03: Tweet Fallback Chain & Media-Type Handling (Depth)

**BRs covered**: BR-3, BR-12 · **Tier**: Depth

## Approach

The v1 chain — **FxTwitter → Twitter oEmbed → Puppeteer embed page → Satori** — is mostly sound. v2 changes: **drop Satori** (no RTL), add explicit `media_type` discriminated union, fix video-as-image bug.

## Fallback chain in v2

| Rank | Path | Input | Output | Cost | Failure mode |
|---|---|---|---|---|---|
| 1 | **FxTwitter** (`fxtwitter.com/<user>/status/<id>` → OEmbed/HTML) | Tweet URL | Rendered card + metadata | $0 | Service outage; maintained open-source alternative |
| 2 | **Twitter oEmbed API** (`publish.twitter.com/oembed`) | Tweet URL | HTML embed snippet | $0 (public endpoint, rate-limited) | 404 on deleted/private; enforcement changes |
| 3 | **Puppeteer on embed page** (`platform.twitter.com/embed/Tweet.html?id=...`) | Tweet ID | Screenshot of embed iframe | $0 (self-hosted) | HTML structure changes break selectors |
| 4 | **Puppeteer on tweet URL direct** | Tweet URL | Full-page screenshot | $0 | Slowest; highest failure surface; X login walls |

## Media-type discriminated union (TypeScript + Zod)

```ts
const MediaSchema = z.discriminatedUnion('media_type', [
  z.object({ media_type: z.literal('text_only') }),
  z.object({ media_type: z.literal('image'), urls: z.array(z.string().url()), max_bytes: z.number() }),
  z.object({ media_type: z.literal('video'), poster_url: z.string().url(), duration_sec: z.number().optional() }),
  z.object({ media_type: z.literal('gif'), url: z.string().url() }),
  z.object({ media_type: z.literal('link_card'), url: z.string().url(), og_title: z.string().optional() }),
]);
```

This prevents v1's bug where `.mp4` URLs got handed to the image-fetching code path and blew up memory.

## Auto-capture of linked articles (BR-12)

Preserve v1 mechanic: if tweet contains external URL → parse OG meta tags (`og:title`, `og:description`, `og:image`) on the target page → create a linked `article` row with the same capture screenshot process.

Library: `open-graph-scraper` (npm, actively maintained 2026, MIT license).

## Options scoring

| Factor | FxTwitter-first chain | oEmbed-first chain | Puppeteer-only |
|---|---|---|---|
| Cost | $0 | $0 | $0 |
| Avg success rate (estimate from v1 logs) | ~95% | ~80% | ~70% |
| Latency | <1s median | ~1s | 5–10s |
| Resource footprint | Minimal | Minimal | Heavy |

**Recommendation**: Keep v1's chain order with Satori removed. Add media-type discrimination before any fetch/render step.

## Key risks

- FxTwitter is community-maintained — monitor its status and add a second similar service (e.g., `vxtwitter`) as an alternate first-rank path if FxTwitter outages recur.
- Twitter oEmbed API deprecations have been threatened; track [developer.twitter.com](https://developer.twitter.com/) announcements.

**Est. Year 1 cost: $0 cash** · all paths free.
