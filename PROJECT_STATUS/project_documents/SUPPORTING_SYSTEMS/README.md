# Supporting Systems: Nusuk Social Tracker v2

**Idea**: `nusuk-social-tracker-v2` (IF-Y-002)
**Date**: 2026-04-15
**Status**: supporting-systems-complete
**Funding stage**: Bootstrapped / internal tool (no revenue)
**Budget envelope**: $0/month recurring (hard constraint from BUDGET_CONTEXT.md)

## Scope note

Many standard supporting systems are **not applicable** to this internal-tool rebuild. To be honest about scope rather than fabricate research, the N/A systems are listed explicitly below with the reason. Only the 5 genuinely applicable systems got full analysis.

---

## Research Progress

| # | System | Priority | File | Status | Updated |
|---|---|---|---|---|---|
| 01 | Error Monitoring & Log Aggregation | Essential | [01-error-monitoring.md](01-error-monitoring.md) | complete | 2026-04-15 |
| 02 | CI/CD Pipeline | Essential | [02-ci-cd.md](02-ci-cd.md) | complete | 2026-04-15 |
| 03 | Scheduled Jobs (Purge, Backup, Health) | Essential | [03-scheduled-jobs.md](03-scheduled-jobs.md) | complete | 2026-04-15 |
| 04 | Golden-File Screenshot Tests | Essential | [04-golden-file-testing.md](04-golden-file-testing.md) | complete | 2026-04-15 |
| 05 | Deployment Automation | Growth | [05-deployment-automation.md](05-deployment-automation.md) | complete | 2026-04-15 |

## N/A Systems (explicitly marked — not researched)

| System | Why it's N/A |
|---|---|
| User Management & RBAC | Single non-technical analyst; no other users. No login needed in v2 if the tool is accessed via VPN / IP allowlist to the Oracle VM. Re-evaluate only if scope changes (not planned). |
| Admin Dashboard | The app IS the admin dashboard. There is no separate back-office. |
| Billing Administration | No revenue model. No payments. |
| Multi-Tenancy / Organizations | Scope locked to internal-only in follow-up-1. |
| Customer Feedback & Support | Single user who owns the tool. Feedback channel = direct conversation with the developer. |
| Notification Management | v2 has no outbound notifications (no email, SMS, push). The only "alerts" are the observability error signals (covered in system #01). |
| API Management | No public API. No third-party consumers. |
| Content Moderation | No user-generated content beyond the captured public posts (which are archived, not moderated). |
| Order Management | Not an e-commerce tool. |
| Analytics Dashboard | Usage analytics are covered by the `/api/metrics` endpoint (BR-9), not a separate analytics system. Dashboard stats for captures are a product feature (BR-13), not a supporting system. |
| Onboarding System | Single user who already knows v1. A README file suffices. |
| Settings & Configuration | One-time env-var configuration in `.env`. No user-facing settings surface. |
| Audit Logging (compliance-specific) | Subsumed by the general error-monitoring / log aggregation system (#01); PDPL requires documented processing records, not a separate audit-log subsystem for this scale. |

---

## Priority Classification

### Essential

| # | System | Recommendation | Year 1 Cash | Year 1 Fully-Loaded |
|---|---|---|---|---|
| 01 | Error Monitoring | Pino → stdout for MVP; Axiom free + Sentry free for Phase 2 | $0 | $160–480 (founder time) |
| 02 | CI/CD | GitHub Actions | $0 | $280 |
| 03 | Scheduled Jobs | Supabase `pg_cron` + GitHub Actions cron (hybrid) | $0 | $120–240 |
| 04 | Golden-File Tests | Playwright `toHaveScreenshot` (or `jest-image-snapshot`) | $0 | $560 |

### Growth

| # | System | Recommendation | Year 1 Cash | Year 1 Fully-Loaded |
|---|---|---|---|---|
| 05 | Deployment Automation | Docker Compose + GitHub Actions SSH; Render `render.yaml` fallback | $0 | $400 |

### Enterprise

_None applicable._

---

## Cost Impact Summary

**Recurring cash cost: $0/month — all systems use free tiers.** This satisfies BR-15.

| Category | Monthly | Annual |
|---|---|---|
| Cash (SaaS subscriptions) | **$0** | **$0** |
| Founder time (setup + upkeep, imputed @ $40/hr) | ~$130/mo amortized | ~$1,520–2,000 |
| One-off legal review (BRD Section 13, optional) | — | $0–500 |

**Cost sanity check**: Revenue = $0 (internal tool), so the "% of revenue" thresholds from `budget-assessment/SKILL.md` don't apply. Instead: cash cost MUST = $0 per BR-15. **All recommendations satisfy this.** Founder-time cost is the real TCO and is acceptable for a one-time rebuild.

**Scaling projection**: Capture volume is bounded by the analyst's workflow (~200/season). None of the free tiers come close to usage limits at this scale. No scaling cost pressure expected.

---

## Build vs Buy Recommendations

| # | System | Decision | Vendor / Tool |
|---|---|---|---|
| 01 | Error Monitoring | Buy free tier | Axiom (logs) + Sentry (errors); MVP uses Pino → stdout only |
| 02 | CI/CD | Buy free tier | GitHub Actions |
| 03 | Scheduled Jobs | Buy free tier + configure | Supabase `pg_cron` + GitHub Actions |
| 04 | Golden-File Tests | Open-source library | Playwright `toHaveScreenshot` |
| 05 | Deployment | Open-source tooling | Docker Compose + GitHub Actions (+ Render blueprint fallback) |

**Summary**: 100% free tiers + open source. Zero cash spend. Zero vendor lock-in beyond GitHub (which is acceptable — and portable if needed).

---

## Impact on Downstream Skills

### For `/tech-research`
- CI environment must run the **same Docker image** as production so Arabic-font testing has parity. Factor this into capability research for the capture engine — the engine choice must be containerizable.
- The **Oracle Cloud VM (ARM Ampere A1 Flex)** is a constraint on Puppeteer / @sparticuz/chromium-min — verify these support arm64. If not, fall back to x86 AMD free tier instance.
- Supabase `pg_cron` as purge mechanism is a design input for the data model (`deleted_at` column).

### For `/marketing-strategy` and `/pricing-strategy`
- **Skip both** — no GTM, no revenue. Confirmed in BRD Section 6.2 and BUDGET_CONTEXT.md.

### For `/constraint-validation`
- Core constraint to verify: all supporting systems stay at $0 cash simultaneously with the tech stack choices from `/tech-research`. No aggregation surprises.

---

## Open Questions & Next Steps

- **Confirm Oracle Cloud ARM64 compatibility** for Puppeteer + @sparticuz/chromium-min. `/tech-research` must validate this. If broken, switch to Oracle's x86 AMD free tier (2× 1-OCPU instances).
- **Network access** to the Oracle VM — public URL via Oracle's free load balancer, or VPN-gated? For a single analyst in a known location, a Cloudflare Tunnel (free) or a static IP allowlist may be preferable to a public URL for PDPL posture.
- **Backup destination** for the weekly GitHub Release backup — decide: same GitHub repo (public release, risk of accidental exposure) vs. private release (free, safer). Recommend private.
