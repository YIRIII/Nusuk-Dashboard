# System: Error Monitoring & Log Aggregation

**Priority**: Essential
**Recommendation**: Pino → stdout for MVP; optionally pipe to BetterStack free tier if pattern analysis needed
**Est. Year 1 cost**: $0
**Detection signals**: BR-9 (structured logs), BR-1 (no silent OOM re-runs), lessons learned from v1's zero-observability failures

## Why it's needed

v1's only failure signal was a Render OOM email. This delayed root-cause analysis of the batch-capture crash by months. v2's Hero tier goals (reliability, Arabic correctness) require real-time signals when a capture fails or memory spikes, not post-mortem guesswork.

## Build vs Buy matrix (all free-tier options)

| Option | Free tier limit | Retention | Fit | Cash | Founder time (20h setup + 2h/mo) | Fully-loaded Year 1 (@ $40/hr KSA mid-tier dev rate) |
|---|---|---|---|---|---|---|
| **Pino → stdout only** (MVP baseline) | Unlimited | Only what host keeps | Low friction, no external deps | $0/mo | 4h setup | $160 |
| **BetterStack (Logtail)** free | 1 GB/mo, 3-day retention | 3 days | Good for near-real-time; short retention forces you to respond fast (a feature, not a bug, at this scale) | $0/mo | 6h | $240 |
| **Axiom** free | 500 GB/mo ingest, 30-day retention | 30 days | Far more generous; 30-day retention lets you look back a full month | $0/mo | 8h | $320 |
| **Sentry** free | 5K errors/mo, 1 user | 30 days (errors) | Error-focused, not log-volume; great for uncaught exceptions | $0/mo | 4h | $160 |
| **Self-hosted Grafana Loki** | Unlimited (uses your VM) | Your disk | Overkill for single-user tool; eats Oracle Cloud resources needed for capture | $0/mo | 30h+ | $1,200+ |

Sources:
- BetterStack free plan: https://betterstack.com/logs/pricing (accessed 2026-04-15)
- Axiom free plan: https://axiom.co/pricing (accessed 2026-04-15)
- Sentry free plan: https://sentry.io/pricing/ (accessed 2026-04-15)
- KSA mid-tier developer rate ~$40/hr derived from regional salary surveys ($60–100K/yr full-time ≈ $30–50/hr); treat as estimate.

## Options Rating Matrix

KPIs (weights in parens): reliability signal quality (High, 30%), cash cost (High, 25%), setup time (Medium, 15%), retention adequate for Hajz post-season review (Medium, 15%), lock-in risk (Low, 10%), privacy/PDPL fit (Medium — Saudi data, 5%).

| Option | Signal quality | Cash | Setup | Retention | Lock-in | Privacy | Weighted (1-5) |
|---|---|---|---|---|---|---|---|
| Pino → stdout | 2 (logs vanish on restart) | 5 | 5 | 1 | 5 | 5 | 3.25 |
| BetterStack free | 4 | 5 | 4 | 2 | 3 | 3 (US-hosted) | 3.75 |
| **Axiom free** ⭐ | 4 | 5 | 4 | 4 | 3 | 3 (US-hosted) | **4.05** |
| Sentry free | 4 (errors only, not captures) | 5 | 5 | 4 | 4 | 3 | 4.00 |
| Self-hosted Loki | 5 | 5 | 1 (30h setup) | 5 | 5 | 5 | 3.75 |

**Winner**: **Axiom free tier** as primary log sink; **Sentry free** as parallel error-only stream (complementary, not redundant). Both free.

## Recommendation

- **MVP (Phase 1)**: Pino → stdout on Oracle Cloud VM + `journalctl` for ~7 days of logs. Defer external log sinks until the first real usage exposes a need.
- **Phase 2 (before Hajz peak)**: Add Axiom free tier via `pino-axiom` transport for 30-day retention and query UI. Add Sentry SDK for uncaught exception tracking.
- **Never**: Pay for any of these until the tool demonstrably outgrows free tier (unlikely at ~200 captures/season).

## Impact if absent

Without structured error monitoring, the next Hajz-peak failure becomes another months-long root-cause hunt — exactly the pattern that drove the rebuild. This is what BR-9 exists to prevent.
