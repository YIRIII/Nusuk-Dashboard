# Hadaq Tracker — Features & Todo Checklist

> Last updated: 2026-04-12

> See also: [BRD](./BRD.md) · [PRD](./PRD.md) · [CHALLENGES](./CHALLENGES.md) — read these before starting a v2 rebuild.

---

## Capture & Import

- [x] Single URL capture (tweet, Instagram, article)
- [x] Batch URL capture (up to 100 URLs)
- [x] Excel/ZIP import
- [x] Auto-detect source type (tweet/instagram/article)
- [x] Screenshot capture via Puppeteer
- [x] Fast HTTP metadata extraction (fallback)
- [x] Linked article auto-capture
- [x] Duplicate URL detection
- [x] Similar content detection

## Dashboard & Posts

- [x] Dashboard with stats overview
- [x] Posts list with filtering
- [x] Post detail view
- [x] Category management (person/company)
- [x] Auto-categorization suggestions
- [x] Bilingual UI (EN/AR) with RTL support
- [x] Storage usage tracking

## Export & Backup

- [x] PDF export with analytics
- [x] Backup to ZIP
- [x] Excel/ZIP restore

## Monitor (Twitter/Instagram)

- [x] Twitter keyword search scan
- [x] Twitter feed extraction
- [x] Instagram capture with cookies
- [ ] Monitor feature (disabled — memory constraints on Render free tier 512MB)

## Performance & Production

- [x] Memory-optimized Chrome (single instance, memory-saving flags)
- [x] Sequential/concurrent batch processing
- [x] Metadata-only fallback when screenshot fails
- [x] Browser cleanup after batch operations
- [x] Dockerfile with minimal font packages

---

## Future Ideas / Backlog

- [ ] Upgrade Render plan for monitor feature support
- [ ] Telegram/webhook notifications for new posts
