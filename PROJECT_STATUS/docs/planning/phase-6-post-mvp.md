# Phase 6: Post-MVP Polish

**Generated:** 2026-04-15 | **Source:** idea-forge/nusuk-social-tracker-v2 | **Tier:** A
**Status:** planned (deferred from MVP per C-10 timeline WARNING)

## Research Links
- **Business Research:** BR-7 (Observability — full), BR-8 (Data lifecycle stats), BR-5 (Backup automation) → [07-observability.md](../../project_documents/BUSINESS_RESEARCH/07-observability.md), [08-data-lifecycle.md](../../project_documents/BUSINESS_RESEARCH/08-data-lifecycle.md), [05-export-and-backup.md](../../project_documents/BUSINESS_RESEARCH/05-export-and-backup.md)
- **Technical Options:** TC-6 (Observability full), TC-7 (Backup automation), TC-8 (Data lifecycle stats)
- **Supporting Systems:** SS-01 (Error monitoring — Sentry/Axiom integration)
- **PRD Section:** F-11 (Dashboard stats), F-12 (Backup/restore), F-13 (Error tracking)

## Recommended Tech Stack
- Sentry free tier (5k errors/month) — backend + frontend SDKs
- Axiom free tier (0.5 GB/month log ingestion) — pino transport
- Postgres views + SWR cache for dashboard stats
- GitHub Actions scheduled workflow for weekly backup → GH Release asset

## Estimated Cost
$0 recurring (all free tiers). Upgrade cliff: Sentry at 5k errors/month, Axiom at 0.5 GB. Both well above expected volume (~200–300 captures/year).

## Budget Context
- **Phase cost vs. budget:** 0%. PASS. Seasonal volume fits well within overage cliffs.

## Prerequisites
- Phase 5 launched and stable for ≥2 weeks.

## Regulatory Deadlines
None.

## Implementation Steps
- [ ] **6.1:** `dashboard_stats` Postgres view aggregating: captures/day for last 90d, stage success rate, average p95 latency (joined with metrics table if persisted). SWR cache on frontend with 5min stale-while-revalidate.
- [ ] **6.2:** `src/backup/weekly-zip.ts` — exports full Supabase data + Storage blobs to a signed ZIP. GitHub Actions workflow runs weekly; uploads ZIP as an asset on a dated GitHub Release. User-triggered button in UI for on-demand.
- [ ] **6.3:** Sentry SDK integration — `Sentry.init()` in backend + frontend. Source maps uploaded in CI. PII scrubbing enabled (URLs treated as non-PII for this use case, but analyst names scrubbed).
- [ ] **6.4:** Axiom pino transport — stream structured logs from Oracle VM. Create dashboard for capture-stage breakdown. Retention 30 days (free-tier default).

## Key Decisions (from research)
- Deferred intentionally from MVP to respect C-10 timeline headroom. Adding these after launch is low-risk; adding them pre-launch would have jeopardized the Hajz deadline.
- Sentry + Axiom chosen over self-hosted (Grafana, OpenObserve) because $0 cash constraint favors managed free tiers; self-hosting burns VM resources and founder time.
- Weekly backup to GH Release (not S3 or Supabase native): $0, version-controlled, trivially restorable, no vendor lock-in.

## Acceptance Criteria
- Dashboard renders with <500ms first-paint (SWR cache).
- Weekly backup ZIP successfully restores to a clean Supabase instance in a DR drill.
- Sentry captures a test error with stack trace + source maps.
- Axiom shows ≥7 days of pino-sourced logs with searchable structured fields.

## Competitive Context
Observability at $0 for an internal tool with 200–300 captures/year is trivially solvable with free tiers — the differentiator was fitting this into the 10-month MVP budget, which the sequencing decision answers (defer, don't drop).

## Research Gaps
None.
