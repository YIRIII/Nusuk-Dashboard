# Feature: Capture Reliability (BR-1, BR-6)

**BRs covered**: BR-1 (zero OOM on 100-URL batch), BR-6 (<20s single, <30min/100 batch)
**Category**: Core capture path
**Tier**: **Hero**

## What it does

Every paste-URL action must complete reliably without OOM-kills, produce a faithful screenshot, and return within performance bounds. This is the product's reason to exist for the analyst.

## Competitive analysis

| Alternative | Reliability on 100-URL batch | Arabic-aware | Audit-grade | $0 |
|---|---|---|---|---|
| **v1 (current)** | ❌ OOM at ≥6 video tweets on Render 512MB | Partial | Yes | Yes |
| Manual fallback | ✅ (human does it) | Yes | Manual, error-prone | Yes |
| Archive.today | ⚠️ Compromised 2026 | Yes | Untrustworthy | Yes |
| Hosted APIs (Browserless/Urlbox) | ✅ but paid | Unverified | Yes | ❌ |
| Hunchly/PageVault | ✅ | Likely | Yes | ❌ $100+/mo |

**Gap**: No free, trustworthy, bilingual, batch-capable tool exists. v1 fills the gap except for reliability — which is exactly what v2 fixes.

## Impact severity: **Major inconvenience**

Absence = analyst reverts to manual workflow (~3 min/post × 100 posts = 5 hours/week during Hajz peak). Not safety-critical, but the entire product value depends on this.

## Novelty rating: **Incremental**

The feature (automated URL-to-screenshot batch capture) is not novel. The achievement is doing it reliably on $0 infra with Arabic support — that's the incremental edge over both v1 and alternatives.

## Rebuild-specific notes

- Oracle Cloud Always Free (24 GB RAM) eliminates the root-cause tier constraint.
- Single pooled browser manager + context recycling every N captures prevents leak accumulation.
- Media-type discriminated union prevents video-as-image fetches that spiked v1's memory.
- `@sparticuz/chromium-min` gives ~50 MB slim Chromium baseline.
