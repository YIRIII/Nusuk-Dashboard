# Feature: Automated Keyword/Timeline Monitoring (BR-16)

**BRs covered**: BR-16 (automated Twitter keyword scanning — nice-to-have)
**Category**: Proactive capture
**Tier**: **Skip**

## What it does

Periodically scan Twitter/X for new mentions of specific keywords ("Nusuk", "نسك", "بطاقة نسك") and auto-capture matches, so the analyst doesn't have to manually search.

## Competitive analysis

This would replicate what social-listening platforms (Meltwater, Brand24, Mention) do — and those tools are paid, so a free-tier clone has real value on paper. BUT:

- **X API access** — the free tier has write-only access; read access is paid ($100+/mo). Workaround is Puppeteer scraping of search pages, which (a) triggers the same OOM-risk profile that broke v1, (b) is explicitly prohibited by X ToS post-Sept 2023, and (c) is vulnerable to breakage when X changes its HTML.
- **Cron on $0 infra**: doable via GitHub Actions or Supabase scheduled functions, but adds complexity and a new background-failure mode.

## Impact severity: **Minor inconvenience**

The analyst already does manual search today; automation is a "nice" — not a "must." Given how the $0 budget + ToS + scraping-reliability risks stack, the cost of building this exceeds the value of saving ~15 min/week of manual searching.

## Novelty rating: **Incremental** — but deprioritized

## Rebuild-specific notes

- **Defer past MVP.** Re-evaluate only after the core capture pipeline is proven stable for a full Hajz season.
- If revisited, prefer webhook-style triggers (e.g., an RSS feed for Nusuk mentions if one exists, or news aggregator APIs) over Puppeteer-based timeline scraping.
- Not eligible for Hero/Depth/Supporting — **explicitly Skip in v2 MVP.**
