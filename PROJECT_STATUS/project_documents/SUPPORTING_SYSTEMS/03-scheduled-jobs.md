# System: Scheduled Jobs (Purge, Backup, Health Checks)

**Priority**: Essential
**Recommendation**: Supabase `pg_cron` (already available) for DB-side jobs + GitHub Actions scheduled workflows for app-side jobs
**Est. Year 1 cost**: $0
**Detection signals**: BR-7 (30-day soft-delete auto-purge), BR-14 (periodic ZIP backup could be scheduled), operational needs (health checks, stale-capture cleanup)

## Why it's needed

Three recurring jobs:
1. **Soft-delete purge**: rows with `deleted_at < NOW() - 30 days` must be hard-deleted + associated Supabase Storage objects removed.
2. **Scheduled full-backup** (nightly or weekly): export ZIP of all posts + storage to an external location (e.g., a second Supabase project or GitHub Release asset) for disaster recovery.
3. **Health check**: daily ping of the Oracle Cloud VM — if unresponsive, alert via email/Discord webhook.

## Build vs Buy matrix

| Option | Fit | Cash | Founder time | Fully-loaded Year 1 |
|---|---|---|---|---|
| **Supabase `pg_cron`** (free tier, built-in) | Perfect for SQL-side jobs (purge) | $0 | 3h | $120 |
| **Supabase Edge Functions + cron** | Free tier: 500K function invocations/mo — plenty | $0 | 6h | $240 |
| **GitHub Actions scheduled workflows** | Perfect for app-side jobs (backup dump, health check) | $0 | 4h | $160 |
| Oracle Cloud VM cron | Works, but tied to VM uptime | $0 | 2h | $80 |
| External services (Cronhooks, EasyCron) | Unnecessary external dep | $0–10/mo | 2h | $80 + up to $120 cash |

Sources:
- Supabase `pg_cron`: https://supabase.com/docs/guides/database/extensions/pg_cron (accessed 2026-04-15)
- Supabase Edge Functions pricing: https://supabase.com/pricing (accessed 2026-04-15)
- GitHub Actions scheduled workflows: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule

## Options Rating Matrix

KPIs: reliability (High 30%), $0 fit (High 25%), locality to data (Medium 15% — purge should run near the data), ease of observability (Medium 15%), setup time (Medium 10%), lock-in (Low 5%).

| Option | Reliability | $0 | Locality | Observability | Setup | Lock-in | Weighted |
|---|---|---|---|---|---|---|---|
| **Supabase pg_cron + GH Actions (hybrid)** ⭐ | 5 | 5 | 5 (DB-side) + 3 (app-side) | 4 | 4 | 3 | **4.50** |
| Supabase Edge Functions + cron | 4 | 5 | 4 | 4 | 4 | 2 | 3.95 |
| Oracle VM cron | 3 (tied to VM uptime) | 5 | 4 | 2 (silent failures) | 5 | 5 | 3.65 |
| External (Cronhooks) | 4 | 3 (may cost) | 3 | 4 | 5 | 2 | 3.45 |

**Winner**: **Hybrid** — `pg_cron` for DB-side purge (runs in Supabase, close to data), GitHub Actions scheduled workflow for app-side backup dumps and health checks.

## Recommendation

- **Purge job** (nightly): `SELECT cron.schedule('soft-delete-purge', '0 3 * * *', $$DELETE FROM posts WHERE deleted_at < NOW() - INTERVAL '30 days'$$);` + parallel deletion of linked Supabase Storage objects via a trigger or Edge Function.
- **Backup job** (weekly Sunday 02:00 UTC): GitHub Actions `schedule: cron: '0 2 * * 0'` → `pg_dump` + `rclone` copy of Storage bucket → upload as GitHub Release asset on a dedicated `backups` release (private repo).
- **Health check** (daily): GitHub Actions `curl` the `/api/health` endpoint; if non-200, post to a Discord webhook (free).

## Impact if absent

- Missing purge: DB grows unbounded; Supabase free tier 500 MB ceiling hits in 1–2 seasons.
- Missing backup: disaster recovery relies solely on Supabase's own replication — acceptable risk for an internal tool, but GitHub Release backup is near-free insurance.
- Missing health check: VM becomes unreachable silently; analyst discovers the problem next time they try to use the tool.
