# Feature: Observability (BR-9)

**BRs covered**: BR-9 (pino structured logs + `/api/metrics` + 30s RSS sampling)
**Category**: Engineering discipline
**Tier**: **Depth**

## What it does

- Every request produces a structured JSON log line (trace ID, capture duration, memory at start/end, fallback path used, outcome).
- `/api/metrics` endpoint exposes aggregate counters (captures by outcome, fallback-path distribution, p50/p95 latency, memory timeline).
- Node.js `process.memoryUsage()` sampled every 30 seconds and logged; spike detection flags anomalies.

## Competitive analysis

Not a product feature — the diagnostic infrastructure that was entirely absent in v1. v1's only failure signal was a Render OOM email, which arrived after the damage was done. Root-cause fixes were educated guesses.

## Impact severity: **Minor inconvenience (upfront), major enabler (over time)**

Absence doesn't break any single capture. But the absence of observability is why v1's OOM and Arabic-font bugs took months to root-cause. For a $0-infra tool where the next Hajz season is the real test, observability is the difference between "we'll see what breaks" and "we know what's happening and why."

## Novelty rating: **Saturated**

- `pino` for structured JSON logs
- `pino-pretty` for dev
- Free log collectors: BetterStack / Axiom / Logtail free tiers (optional)
- Custom `/api/metrics` endpoint is a tiny handler

## Rebuild-specific notes

- Trace ID (ULID) per capture request, propagated through logs.
- Log every fallback path entry/exit (FxTwitter attempted → failed → oEmbed attempted → succeeded).
- Memory readings tagged to capture IDs to correlate memory spikes with specific URLs.
- `/api/metrics` returns JSON (not Prometheus format — overkill for this scale), lightweight.
