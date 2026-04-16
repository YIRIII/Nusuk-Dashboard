# Category 2: Cost Feasibility

## Constraint

| ID | Constraint | Threshold | Combined actual | Verdict |
|---|---|---|---|---|
| C-04 | Total recurring cash cost (BR-15) | **$0/month** | **$0/month** | **PASS** |

## Aggregate cost table

| Domain | Item | Monthly | Year 1 cash | Source |
|---|---|---|---|---|
| **Tech: Hosting** | Oracle Cloud Always Free Ampere A1 Flex | $0 | $0 | TECHNICAL_OPTIONS/01 |
| Tech: Capture engine | Puppeteer + system Chromium | $0 | $0 | TECHNICAL_OPTIONS/01 |
| Tech: Arabic fonts | Noto Sans Arabic + Cairo (SIL OFL) | $0 | $0 | TECHNICAL_OPTIONS/02 |
| Tech: Fallback services | FxTwitter, Twitter oEmbed (public) | $0 | $0 | TECHNICAL_OPTIONS/03 |
| Tech: Frontend stack | React 18 + Vite + TS + Tailwind + react-i18next | $0 | $0 | TECHNICAL_OPTIONS/04 |
| Tech: Type safety | TypeScript + Zod + ESLint + Prettier | $0 | $0 | TECHNICAL_OPTIONS/05 |
| Tech: Observability | pino (MVP); Sentry free + Axiom free (Phase 2) | $0 | $0 | TECHNICAL_OPTIONS/06 |
| Tech: Export libraries | exceljs + archiver | $0 | $0 | TECHNICAL_OPTIONS/07 |
| Tech: Data store | Supabase free tier (DB + Storage + pg_cron) | $0 | $0 | TECHNICAL_OPTIONS/08 |
| **Supporting: Log aggregation** | Axiom free (500 GB/mo, 30d retention) | $0 | $0 | SUPPORTING_SYSTEMS/01 |
| Supporting: Error tracking | Sentry free (5K errors/mo) | $0 | $0 | SUPPORTING_SYSTEMS/01 |
| Supporting: CI/CD | GitHub Actions (public repo unlimited; private 2000 min/mo) | $0 | $0 | SUPPORTING_SYSTEMS/02 |
| Supporting: Scheduled jobs | Supabase pg_cron + GitHub Actions cron | $0 | $0 | SUPPORTING_SYSTEMS/03 |
| Supporting: Golden-file tests | Playwright `toHaveScreenshot` (runs in CI) | $0 | $0 | SUPPORTING_SYSTEMS/04 |
| Supporting: Deployment | Docker Compose + GitHub Actions SSH + ghcr.io | $0 | $0 | SUPPORTING_SYSTEMS/05 |
| **Marketing / Pricing** | Skipped — internal tool | $0 | $0 | BRD §6.2 |
| **TOTAL cash** | | **$0** | **$0** | |
| Founder time (one-time + upkeep) | Imputed @ $40/hr | ~$130/mo amortized | ~$2,500–3,500 | BUDGET_CONTEXT.md |
| Optional legal review | One-off (non-recurring) | — | $0–500 | BRD §13 |

## Budget envelope check

From `BUDGET_CONTEXT.md`: single tier, **$0/month recurring cash, hard constraint**. Total = $0. **PASS.**

## Overage risk check

Each free tier vs. expected usage:

| Service | Free limit | Expected usage | Headroom |
|---|---|---|---|
| Oracle Cloud Always Free | 24 GB RAM, 200 GB storage, unlimited compute | ~1.2 GB RAM peak, a few GB storage | >95% |
| Supabase free | 500 MB DB, 1 GB Storage, pg_cron | ~60 MB/season × multi-year | ~12% of DB ceiling per year |
| GitHub Actions (private) | 2000 min/mo | ~60 min/mo (deploys + tests) | ~97% |
| Sentry free | 5K errors/mo | <100/mo expected | >98% |
| Axiom free | 500 GB ingest/mo | <1 GB/mo expected | ~99.8% |
| Supabase Edge Functions | 500K invocations/mo | <1K/mo | >99% |

No overage cliffs within realistic usage. **PASS.**

## Revenue-ratio check

Revenue = $0 (internal tool). Cost-to-revenue ratio is undefined; substituted by absolute cash = $0 requirement. Satisfied.

## Verdict

**PASS** — combined cost is exactly $0/month recurring cash across all selected options. No hidden costs detected. Cost sanity check satisfied via the absolute-zero threshold substitution for the revenue-ratio check.
