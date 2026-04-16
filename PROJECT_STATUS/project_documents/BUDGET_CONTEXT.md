# Budget Context: Nusuk Social Tracker v2

**Version**: preliminary (from BRD)
**Date**: 2026-04-15
**Idea**: `nusuk-social-tracker-v2`

## Funding Stage

**Bootstrapped — internal tool, no funding, no revenue.**

This is an internal-use rebuild of a production tool. There is no funding round, no revenue line, and no cost-of-capital analysis to perform. All downstream skills should treat this as a **hard zero-dollar recurring budget** with a small optional one-off allocation for a legal review.

## Budget Envelope (hard constraint from user)

**$0 / month recurring.** Non-negotiable — user explicitly chose this in follow-up-1.

There are no Bootstrap / Growth / Scale tiers here because there is no revenue to scale against. The tiers collapse to a single tier:

| Tier | Monthly Recurring | Notes |
|------|-------------------|-------|
| **The Only Tier** | $0 | Hosting: Oracle Cloud Always Free (or Render free fallback). Database + storage: Supabase free tier. Error monitoring: pino-to-stdout or a free-tier log collector. Fonts: SIL OFL 1.1 (Noto Sans Arabic, Cairo). |

**One-off optional spend**: up to $500 for a legal review of the X ToS capture-vs-scrape posture and PDPL archival-basis documentation (see BRD Section 13). Not required for MVP.

## Cost Sanity Thresholds (for downstream skills)

When `/supporting-systems`, `/tech-research`, or `/constraint-validation` evaluate build-vs-buy options, apply these rules:

- **Any option with ongoing paid cost** (even $1/mo): flag as a **hard violation** of BR-15. Justify why free alternatives can't hit the requirement, or exclude the option.
- **Free tiers with overage risk** (e.g., "free until 500 captures/mo, then $X"): acceptable only if the rate limit comfortably exceeds worst-case seasonal volume (~200 captures/Hajj, ~300/year). Document the overage cliff.
- **Free tiers that require credit-card verification** (Oracle Cloud Always Free): acceptable, but document as a dependency risk (see BRD R-1).
- **Hosted APIs that paginate to paid plans** (Browserless, Urlbox, ScreenshotOne): exclude unless their free tier + zero-cost usage pattern demonstrably covers the seasonal volume.

## Key Revenue Input (for reference)

**N/A — no revenue.** Downstream skills that normally compute "% of revenue" cost ratios should skip those calculations for this idea and evaluate cost absolutely (must be $0).

## Notes for Downstream Skills

- `/supporting-systems`: most systems (admin, RBAC, billing) are **not applicable** — scope is single-user internal. Focus on error monitoring, backup/restore, and deployment automation.
- `/marketing-strategy`: **skip** — no GTM.
- `/pricing-strategy`: **skip** — no revenue model.
- `/tech-research`: central to this idea. Every capability must respect the $0/month envelope. Compare self-hosted (Oracle Cloud Always Free) vs. free-tier hosted APIs vs. Render free fallback.
- `/constraint-validation`: BR-15 ($0/mo) is a hard constraint. Any combination of tech choices whose aggregate cost is >$0/mo must be rejected or remediated before PRD.
