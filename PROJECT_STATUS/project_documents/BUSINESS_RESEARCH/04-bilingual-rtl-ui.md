# Feature: Bilingual AR/EN UI with RTL (BR-4)

**BRs covered**: BR-4 (full RTL AR UI with EN toggle)
**Category**: User interface
**Tier**: **Depth**

## What it does

The analyst interacts with the dashboard in Arabic by default; labels, directions, date formats, and layout switch to RTL. EN toggle available for secondary users.

## Competitive analysis

Not meaningful — bilingual web UI is standard practice. v1 already does this correctly (the RTL UI wasn't a failure point; the screenshot *content* rendering was). Modern frameworks (React + `dir="rtl"` + Tailwind RTL utilities) make this straightforward.

## Impact severity: **Major inconvenience**

Absence = analyst can't efficiently use the tool. Non-negotiable given the user profile.

## Novelty rating: **Saturated**

Every modern i18n framework supports this. Nothing distinctive.

## Rebuild-specific notes

- React + TypeScript + `next-intl` or `react-i18next` + Tailwind `rtl:` variants.
- Mirror approach proven in v1 — carry forward, re-implement in TypeScript.
- Language toggle persists to localStorage.
- Date/number formatting via `Intl.DateTimeFormat` with `ar-SA` locale.
