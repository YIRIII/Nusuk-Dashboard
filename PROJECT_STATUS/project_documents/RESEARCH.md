# Research Notes: Nusuk Social Tracker v2

**Date**: 2026-04-15
**Slug**: `nusuk-social-tracker-v2`
**Scope note**: This is an internal-tool rebuild. Market-size / TAM research is deprioritized. Focus is Approach Validation (screenshot engine, free-tier hosting, Arabic rendering) and Regulatory posture.

## Market Size & Trends

Not applicable — internal single-analyst tool, no revenue. Research skipped by design.

## Competitor Analysis

No viable free or low-cost alternative exists that delivers audit-grade per-URL screenshots with metadata extraction and bilingual AR/EN export.

- **Archive.today**: Free on-demand snapshots. **Compromised as of Jan–Mar 2026** (CAPTCHA-based DDOS relay attack, content tampering by attacker, blocked by Russian authorities). Not trustworthy for audit archival. *Sources*: [ArchiveTeam Wiki 2026](https://wiki.archiveteam.org/index.php/Archive.today); [Wikipedia: Archive.today](https://en.wikipedia.org/wiki/Archive.today).
- **Wayback Machine**: Historical crawl, no on-demand per-URL audit workflow. *Source*: archive.org/web/.
- **Hunchly / PageVault**: Legal-evidence capture SaaS, paid-only ($100+/mo). Out of $0 budget.
- **Social listening platforms** (Meltwater, Brand24, Mention, Talkwalker): Enterprise $500+/mo; don't produce audit-grade screenshots preserving original layout/fonts.

**Verdict**: Building is justified — no free/cheap alternative fits the audit-grade + bilingual + $0-budget constraint.

## Target Audience Validation

Validated from v1 production usage. The user (PR/comms analyst) used v1 for actual Hajj-season reporting, demonstrating real demand. v1's failure modes (OOM, broken Arabic rendering) caused fallback to manual workflow during peak — strong validation that (a) the tool is needed, and (b) reliability is the binding constraint, not features.

## Technical Feasibility / Approach Validation

This is the critical section for this BRD.

### Screenshot engine comparison

| Option | Memory | Arabic/RTL | Free tier fit | Notes |
|---|---|---|---|---|
| **Puppeteer + @sparticuz/chromium-min** | 150–300 MB/session | Chromium limitations, needs pre-installed fonts | ✅ Good | v1 baseline; compressed Chromium bundle (~50 MB) designed for slim environments |
| **Playwright** | 50–200 MB/session | Same Chromium limits | ✅ Good | Better multi-context efficiency (10 contexts ≈ 800 MB vs Puppeteer higher) |
| **Satori (Vercel)** | Very low | ❌ **Does not support RTL** | — | Disqualified for Arabic — rules out v1's Satori fallback card |
| **Browserless.io hosted** | — | Undocumented for Arabic | ⚠️ Free tier unclear; test required | Offloads OOM risk; vendor dependency |
| **ScreenshotOne / Urlbox / ApiFlash** | — | Undocumented for Arabic | ❌ All paid ($19+/mo) | No free tier sufficient for this use case |
| **SnapRender** | — | Undocumented | ✅ 500 screenshots/mo free | Best free hosted-API option; Arabic support needs verification |
| **Cloudflare Browser Rendering** | — | Chromium | ⚠️ Free: 10 min/day + 3 concurrent | Insufficient for batch season peaks (100–200 captures in short bursts) |

*Sources*: [Skyvern Puppeteer vs Playwright 2025](https://www.skyvern.com/blog/puppeteer-vs-playwright-complete-performance-comparison-2025/); [BrowserStack 2026](https://www.browserstack.com/guide/playwright-vs-puppeteer); [GitHub Sparticuz/chromium](https://github.com/Sparticuz/chromium); [DevForth Memory Workaround 2025](https://devforth.io/blog/how-to-simply-workaround-ram-leaking-libraries-like-puppeteer-universal-way-to-fix-ram-leaks-once-and-forever/); [Cloudflare Browser Rendering Pricing 2026](https://developers.cloudflare.com/browser-rendering/pricing/); [GitHub vercel/satori](https://github.com/vercel/satori) (confirms RTL unsupported); [Medium/TheTechDude screenshot API pricing 2026](https://medium.com/@TheTechDude/screenshot-api-pricing-compared-what-you-actually-pay-per-screenshot-in-2026-18f38320251f).

### Free-tier hosting comparison

| Platform | Compute | Spin-down | Verdict for this use case |
|---|---|---|---|
| **Render free** (v1 baseline) | 500 MB RAM | 15 min idle | ❌ Root cause of v1 OOM; too tight for batch Puppeteer |
| **Fly.io free** | Killed late 2024 | — | ❌ New signups get 2 VM-hours/7d trial, then ~$5/mo |
| **Cloudflare Workers Browser Rendering** | 10 min/day + 3 concurrent | Always-on | ⚠️ Insufficient for batch (100 URLs in one session = >10 min) |
| **Vercel Functions** | 2 GB, 60 s max | — | ⚠️ 60s hard limit kills long batches; bundle 50 MB limit tight |
| **Oracle Cloud Always Free** | **4 OCPU + 24 GB RAM** Ampere A1 Flex | **Always-on, lifetime** | ✅ **Clear winner** — 48× the RAM of Render free |
| **GitHub Actions** | 2 GB, 6h max | Ephemeral | ✅ Viable as batch worker (2000 min/mo free, public repo) |

*Sources*: [Render Docs Free Tier](https://render.com/docs/free); [Fly.io Community Free Plan 2025](https://community.fly.io/t/fly-io-pricing-on-free-plan/17373); [Oracle Cloud Always Free Guide Medium 2026](https://medium.com/@imvinojanv/setup-always-free-vps-with-4-ocpu-24gb-ram-and-200gb-storage-the-ultimate-oracle-cloud-guide-bed5cbf73d34); [Oracle Always Free Resources Docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm); [Vercel Docs Limits](https://vercel.com/docs/limits); [GitHub Actions Billing Docs](https://docs.github.com/en/actions/concepts/billing-and-usage).

### Arabic font rendering

- Chromium has documented Arabic rendering issues — Puppeteer Issue #4996 (2020, unfixed). *Source*: [GitHub puppeteer#4996](https://github.com/puppeteer/puppeteer/issues/4996).
- `page.addStyleTag()` font injection often fails in screenshots; in-page `@font-face` unreliable. *Source*: [Lightrun 2025](https://lightrun.com/answers/puppeteer-puppeteer-arabic-font-is-not-rendered-properly-inside-puppeteer).
- **Best-practice fix**: pre-install fonts in Docker image (`fonts-kacst`, `fonts-noto-sans-arabic` → `/usr/share/fonts/TTF`), set `--font-render-hinting=none`. *Source*: [Browserless 2025](https://www.browserless.io/blog/puppeteer-print); [Latenode 2025](https://community.latenode.com/t/how-can-i-integrate-custom-fonts-in-handlebars-templates-when-using-puppeteer/2924).
- **Satori caveat**: Vercel Satori does NOT support RTL/Arabic — v1's Satori fallback card silently broke Arabic. *Source*: [github.com/vercel/satori](https://github.com/vercel/satori).

## Regulatory Considerations

### X (Twitter) scraping — updated Sept 2023 ToS

- X explicitly prohibits crawling/scraping without written consent. Liability: $15,000 per 1M posts if >1M posts in 24h. *Sources*: [TechCrunch 2023](https://techcrunch.com/2023/x-updates-terms-to-ban-crawling-and-scraping/); [X ToS](https://twitter.com/en/tos); [OpenTweet 2026](https://opentweet.io/blog/twitter-automation-rules-2026).
- Official X API read access is write-only on free tier — no longer a free data-extraction path.
- **For this tool**: screenshot capture of user-facing public posts is arguably "user-agent emulation" rather than "scraping" (no structured data extraction). Low volume (~100–200/season) further reduces enforcement surface. **Action**: document the capture-vs-scrape distinction; consider legal review before production.

### Saudi PDPL (Personal Data Protection Law)

- Effective Sept 14, 2024; enforced by SDAIA. *Sources*: [Securiti 2025](https://securiti.ai/saudi-arabia-personal-data-protection-law/); [PwC Middle East 2025](https://www.pwc.com/m1/en/services/consulting/technology/cyber-security/navigating-data-privacy-regulations/ksa-data-protection-law.html).
- Permits processing for "archival purposes in public interest" and "scientific/historical research." Internal organizational archival plausibly qualifies if properly documented.
- **Action**: maintain processing activity record; document lawful basis ("archival in organizational interest"). Internal use only, no external sharing → low risk.

## Key Sources

1. [Skyvern — Puppeteer vs Playwright Performance 2025](https://www.skyvern.com/blog/puppeteer-vs-playwright-complete-performance-comparison-2025/)
2. [BrowserStack — Playwright vs Puppeteer Guide 2026](https://www.browserstack.com/guide/playwright-vs-puppeteer)
3. [GitHub Sparticuz/chromium — slim Chromium for serverless](https://github.com/Sparticuz/chromium)
4. [DevForth — Puppeteer RAM Leak Workarounds 2025](https://devforth.io/blog/how-to-simply-workaround-ram-leaking-libraries-like-puppeteer-universal-way-to-fix-ram-leaks-once-and-forever/)
5. [Render Docs — Free Tier Limits](https://render.com/docs/free)
6. [Fly.io Community — Free Plan 2025](https://community.fly.io/t/fly-io-pricing-on-free-plan/17373)
7. [Oracle Cloud Always Free — Official Docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
8. [Medium/Vinojan — Oracle Always Free VPS Guide 2026](https://medium.com/@imvinojanv/setup-always-free-vps-with-4-ocpu-24gb-ram-and-200gb-storage-the-ultimate-oracle-cloud-guide-bed5cbf73d34)
9. [Cloudflare Browser Rendering Pricing 2026](https://developers.cloudflare.com/browser-rendering/pricing/)
10. [Vercel Docs — Function Limits](https://vercel.com/docs/limits)
11. [GitHub Actions — Billing & Usage Docs](https://docs.github.com/en/actions/concepts/billing-and-usage)
12. [Puppeteer Issue #4996 — Arabic font rendering](https://github.com/puppeteer/puppeteer/issues/4996)
13. [github.com/vercel/satori — RTL not supported](https://github.com/vercel/satori)
14. [Browserless Blog — Puppeteer PDF/Font Install 2025](https://www.browserless.io/blog/puppeteer-print)
15. [Lightrun — Puppeteer Arabic Font Answers 2025](https://lightrun.com/answers/puppeteer-puppeteer-arabic-font-is-not-rendered-properly-inside-puppeteer)
16. [TechCrunch — X Bans Scraping 2023](https://techcrunch.com/2023/x-updates-terms-to-ban-crawling-and-scraping/)
17. [OpenTweet — Twitter Automation Rules 2026](https://opentweet.io/blog/twitter-automation-rules-2026)
18. [X Terms of Service](https://twitter.com/en/tos)
19. [Securiti — Saudi PDPL Overview 2025](https://securiti.ai/saudi-arabia-personal-data-protection-law/)
20. [PwC Middle East — Saudi PDPL Guide 2025](https://www.pwc.com/m1/en/services/consulting/technology/cyber-security/navigating-data-privacy-regulations/ksa-data-protection-law.html)
21. [ArchiveTeam Wiki — Archive.today status 2026](https://wiki.archiveteam.org/index.php/Archive.today)
22. [Medium/TheTechDude — Screenshot API Pricing 2026](https://medium.com/@TheTechDude/screenshot-api-pricing-compared-what-you-actually-pay-per-screenshot-in-2026-18f38320251f)
