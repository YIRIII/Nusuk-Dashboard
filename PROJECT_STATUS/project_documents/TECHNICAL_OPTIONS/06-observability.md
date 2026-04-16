# Capability 06: Observability (Depth)

**BRs covered**: BR-9 · **Tier**: Depth

## Stack

| Layer | Chosen tool | Alt | Why |
|---|---|---|---|
| **Structured logger** | **pino** | winston, bunyan | Fastest Node logger; JSON output; mature |
| **Error tracker** | **Sentry free tier** (5K errors/mo) | Bugsnag | First-class Node SDK; source-mapped stack traces |
| **Log aggregation** (optional, Phase 2) | **Axiom free tier** (500 GB ingest/mo, 30-day retention) | BetterStack free (1 GB/mo, 3-day) | Most generous free tier; has `pino-axiom` transport |
| **Metrics endpoint** | Custom `/api/metrics` returning JSON | Prometheus | Overkill to run Prometheus for single-user tool |
| **RSS memory sampling** | `setInterval(() => logger.info({ rss: process.memoryUsage().rss }), 30_000)` | — | 1-line addition |

Sources (accessed 2026-04-15):
- [pino on GitHub](https://github.com/pinojs/pino) — active, 14K+ stars
- [Sentry Node SDK pricing](https://sentry.io/pricing/)
- [Axiom free plan](https://axiom.co/pricing)

## What to log (per capture)

```
{
  ts, trace_id, capture_url, source_type, media_type,
  fallback_path: ['fx_twitter', 'oembed', 'embed_page'],
  fallback_path_used: 'fx_twitter',
  duration_ms, screenshot_bytes,
  rss_before, rss_after, rss_delta,
  outcome: 'success' | 'failure',
  error?: { name, message }
}
```

## `/api/metrics` shape

Return JSON over the last 24h:

```
{
  captures_total, captures_success, captures_failure,
  p50_duration_ms, p95_duration_ms,
  fallback_path_distribution: { fx_twitter: 0.72, oembed: 0.18, embed_page: 0.10 },
  memory: { rss_max, rss_avg, rss_now },
  uptime_sec
}
```

Authenticate via a shared token (env var) since the tool is internal but exposed on the public internet.

## Recommendation

Phase 1 MVP: pino → stdout + Sentry free tier.
Phase 2 (before Hajz peak): add Axiom via `pino-axiom` transport for queryable 30-day retention.

**Est. Year 1 cost: $0 cash** (all free tiers).
