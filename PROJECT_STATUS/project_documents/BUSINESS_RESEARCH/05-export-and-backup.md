# Feature: Export Formats & ZIP Backup/Restore (BR-5, BR-14)

**BRs covered**: BR-5 (Excel/PDF/ZIP export), BR-14 (ZIP backup/restore)
**Category**: Report production + disaster recovery
**Tier**: **Supporting**

## What it does

- Export archived captures to Excel (.xlsx), PDF, or bundled ZIP (screenshots + metadata CSV/JSON).
- Full-dataset backup (all posts + media + metadata) as a single ZIP, and restore from same.

## Competitive analysis

Export formats are standard. Nothing distinctive. Key is that the Excel/PDF export produces the exact format the analyst submits to leadership — v1 already does this correctly.

## Impact severity: **Major inconvenience**

Absence = analyst has to manually assemble reports from individual screenshots. Defeats the tool's purpose.

## Novelty rating: **Saturated**

- Excel: `exceljs` or `xlsx` library
- PDF: `pdfkit`, `puppeteer-pdf`, or client-side `jspdf`
- ZIP: `archiver` or `jszip`

All mature, free, Node-native.

## Rebuild-specific notes

- Re-use v1's report format (proven by usage).
- PDF generation should use the same Puppeteer context (not a separate headless instance — avoid duplicate-singleton regression).
- Backup/restore path must be tested end-to-end as part of MVP — it's the only disaster-recovery story on the free tier.
- Ensure Arabic text in Excel exports uses correct encoding (UTF-8 BOM) and Arabic-capable PDF fonts embedded in PDF output.
