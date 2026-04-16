# Capability 07: Export Formats & ZIP Backup (Supporting)

**BRs covered**: BR-5, BR-14 · **Tier**: Supporting

## Libraries

| Format | Library | Notes |
|---|---|---|
| **Excel (.xlsx)** | **`exceljs`** (MIT, ~400 KB) | Better AR text / UTF-8 / custom cell formatting than `xlsx` (SheetJS free community edition). Preserves RTL when cell `alignment: { readingOrder: 'rtl' }` is set. |
| **PDF** | **Puppeteer `page.pdf()`** (same browser instance already used for screenshots) | Inherits font embedding automatically; AR renders correctly because Noto Sans Arabic is already installed in the Docker image |
| PDF (alt) | `pdfkit` with explicit `doc.registerFont(...)` | Use only if `page.pdf()` has issues in ARM64 Puppeteer — unlikely |
| **ZIP** | **`archiver`** (MIT, ~1M weekly downloads 2026) | Stream-based, low memory footprint — important on free tier |

## AR correctness in Excel

Set at the workbook level:

```ts
workbook.views = [{ rightToLeft: true }];
worksheet.getCell('A1').alignment = { readingOrder: 'rtl', horizontal: 'right' };
```

Without these, Arabic text renders LTR-ordered and labels look mirrored.

## Backup/restore ZIP structure

```
nusuk-backup-YYYY-MM-DD.zip
├── metadata.json  (all rows, Zod-validated on restore)
├── screenshots/
│   └── <post-id>.png
└── exports/
    └── <post-id>-captured.html   (the source HTML if retained)
```

Restore = Zod-parse `metadata.json` → upsert rows → upload PNGs to Supabase Storage.

## Recommendation

- `exceljs` + Puppeteer `page.pdf()` + `archiver`. All MIT, all mature, all free.
- Unit-test the AR cell-alignment code path to prevent silent regressions.

**Est. Year 1 cost: $0 cash.**
