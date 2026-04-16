# Capability 01: Capture Engine + Hosting Tier (Hero)

**BRs covered**: BR-1, BR-6, BR-15 · **Tier**: Hero

## Approach Challenge — summary of finding

The v1 stack (Puppeteer + Render free 512 MB) was the **root cause** of the OOM failures driving this rebuild. Staying on Render free with mitigations is possible but fragile. **The real fix is a bigger free tier, not more code.** Research confirmed Oracle Cloud Always Free (4 OCPU + 24 GB RAM Ampere A1 Flex VM) is the best free-tier match — 48× v1's RAM. The main risk was ARM64 compatibility, now **resolved**: `@sparticuz/chromium-min` v135+ ships arm64 binaries, and system Chromium via `apt install chromium` works on aarch64 Debian/Ubuntu with `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` ([Sparticuz releases](https://github.com/Sparticuz/chromium/releases); Puppeteer issue [#7740](https://github.com/puppeteer/puppeteer/issues/7740); accessed 2026-04-15).

## KPIs (weights)

1. Reliability at 100-URL batch (High, 25%) — BR-1
2. Cash cost (High, 25%) — BR-15 ($0 hard)
3. Available RAM headroom (High, 20%)
4. Arabic/RTL font support (High, 15%) — must integrate with Capability 02
5. Setup/maintenance complexity (Medium, 10%)
6. Vendor lock-in (Low, 5%)

## Options

| # | Engine | Host | RAM | Cash | Fully-loaded Y1 (setup 20h + 2h/mo @ $40/hr) | Notes |
|---|---|---|---|---|---|---|
| A ⭐ | **Puppeteer + system Chromium (apt)** | **Oracle Cloud Always Free Ampere A1 Flex ARM64** | 24 GB | $0 | $1,760 | `apt install chromium` on Ubuntu 22.04 aarch64; `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`; no OOM headroom concern |
| B | **Puppeteer + @sparticuz/chromium-min v135+** | Oracle Cloud Always Free ARM64 | 24 GB | $0 | $1,760 | Slim bundle (~50 MB), serverless-optimized; also works on aarch64 per v135 release notes |
| C | Puppeteer + bundled Chromium | Oracle Cloud Always Free **x86 AMD** (1/8 OCPU, 1 GB ×2) | 1 GB/instance | $0 | $1,760 | Bundled Chromium is x64 only (no arm64); use AMD free tier if Ampere blocked ([Puppeteer docs](https://pptr.dev/guides/system-requirements)) |
| D | Playwright Chromium | Oracle Cloud Always Free ARM64 | 24 GB | $0 | $1,920 | Docs claim aarch64 support but [issue #1515](https://github.com/microsoft/playwright-mcp/issues/1515) flags availability problems April 2026; more polish needed |
| E | Puppeteer + system Chromium | **Render free** (fallback) | 512 MB | $0 | $1,440 | v1 baseline; OOM root cause if mitigations fail |
| F | Browserless.io hosted | — | — | Free tier ambiguous → likely $0–50/mo | $1,600 + risk | External vendor; unclear free limits; Arabic font support unverified |
| G | Urlbox / ScreenshotOne / ApiFlash | — | — | $19+/mo minimum | $1,400+ cash | **Disqualified** by BR-15 ($0) |

## Scoring

| Option | Reliability | Cash | RAM | AR fonts | Complexity | Lock-in | Weighted |
|---|---|---|---|---|---|---|---|
| A ⭐ | 5 | 5 | 5 | 5 (OS fonts) | 4 | 5 | **4.80** |
| B | 5 | 5 | 5 | 5 | 3 (bundle mgmt) | 5 | 4.65 |
| C | 4 (1 GB is tight) | 5 | 2 | 5 | 3 | 5 | 4.00 |
| D | 3 (aarch64 issues) | 5 | 5 | 5 | 3 | 4 | 4.10 |
| E | 2 | 5 | 1 | 5 | 5 | 5 | 3.55 |
| F | 4 | 2 (overage risk) | — | 2 (unverified) | 4 | 2 | 2.95 |
| G | 5 | 1 | — | 3 | 5 | 2 | 3.10 |

## Recommendation

**Option A — Puppeteer + system Chromium on Oracle Cloud Always Free Ampere A1 Flex ARM64 (24 GB RAM).**

- Install: `sudo apt install -y chromium` → set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` in Docker env.
- Single pooled browser manager, context recycling every 25 captures.
- Block network resource types (`image` MIME filtered by size, `media` never fetched — only thumbnails).
- Hard cap image fetches at 2 MB; videos capture poster frame only.
- Keep Option E (Render free) as **documented fallback** — one env-var and redeploy switches targets; acceptable for emergency recovery, not primary.

## Key risks

- **Oracle signup/region availability** (BRD R-1). Fallback: Option C (Oracle x86 AMD free) or E (Render). Document both.
- **Q2 2026**: Google ships native Chrome for ARM64 Linux ([Chromium blog, March 2026](https://blog.chromium.org/2026/03/bringing-chrome-to-arm64-linux-devices.html)) — will simplify further.

**Est. Year 1 cost: $0 cash** · Founder time ~$1,760.
