# Capability 04: Bilingual AR/EN UI with RTL (Depth)

**BRs covered**: BR-4 · **Tier**: Depth

## KPIs

1. RTL layout correctness (High, 30%)
2. Translation ergonomics (High, 20%)
3. Bundle size (Medium, 15%)
4. TypeScript support (Medium, 15%)
5. Integration with chosen framework (High, 15%)
6. Cash cost (Low, 5%) — all $0

## Options

| # | Stack | RTL | i18n lib | TS | Bundle | Notes |
|---|---|---|---|---|---|---|
| A ⭐ | **React 18 + Vite + TypeScript + `react-i18next` + TailwindCSS with `rtl:` variants** | 5 | 5 | 5 | ~90 KB gz | Industry standard; Tailwind `rtl:` variants ship in v3.3+ |
| B | React 18 + Next.js + `next-intl` + Tailwind | 5 | 5 | 5 | ~120 KB gz | Great DX; unnecessary for a SPA-style internal dashboard |
| C | SvelteKit + `svelte-i18n` + Tailwind | 4 | 4 | 4 | ~40 KB gz | Smaller bundle but v1 was React — re-platforming is migration cost not justified here |
| D | Keep v1's React 19 JSX | 5 | existing | 1 (no TS) | — | **Rejected** — BR-8 requires TypeScript |

## Recommendation

**Option A — React 18 + Vite + TypeScript + `react-i18next` + Tailwind RTL variants.**

- Vite dev server is fast; production bundle is small; ARM64-friendly.
- `react-i18next` has mature TypeScript support, namespace splitting for AR/EN, ICU MessageFormat for pluralization.
- Tailwind's `rtl:` variant lets you write `class="text-left rtl:text-right"` — no separate stylesheet branches.
- `dir="rtl"` on `<html>` toggled at app root based on user preference (localStorage-persisted).

## Dates, numbers, formatting

- `Intl.DateTimeFormat('ar-SA-u-nu-latn')` for Gregorian dates with Latin digits; `ar-SA` for Hijri where appropriate.
- `Intl.NumberFormat` for counts on the dashboard.

## Notes

- Do NOT use React 19 features not yet stable for internal production (e.g., compiler is still maturing in 2026). React 18 is the conservative call; upgrade path exists later.

**Est. Year 1 cost: $0 cash** · all libraries MIT.
