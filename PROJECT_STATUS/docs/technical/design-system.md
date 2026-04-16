# Design System — Nusuk Social Tracker v2

**Created:** 2026-04-15 | **Last Updated:** 2026-04-15

## Theme
- **Mode:** Both (light + dark are equally supported; toggled via `.dark` class on `<html>`)
- **Brand colors:** Neutral defaults for now (blue-forward `slate` base). Swap to Nusuk brand palette when provided.
- **Fonts:**
  - AR (RTL): `Cairo`, fallback `Noto Sans Arabic`
  - EN (LTR): `Inter`, fallback system UI

## Color Tokens
Tokens are defined as HSL CSS variables in `web/src/index.css` and consumed via Tailwind utilities (e.g., `bg-background`, `text-foreground`).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `hsl(0 0% 100%)` | `hsl(222 47% 11%)` | App surface |
| `--foreground` | `hsl(222 47% 11%)` | `hsl(0 0% 100%)` | Body text |
| `--muted-foreground` | `hsl(215 16% 47%)` | `hsl(215 20% 65%)` | Secondary text, placeholders |
| `--primary` | `hsl(221 83% 53%)` | `hsl(217 91% 60%)` | CTAs, active state |
| `--primary-foreground` | `hsl(0 0% 100%)` | `hsl(222 47% 11%)` | Text on primary |
| `--accent` | `hsl(210 40% 96%)` | `hsl(217 33% 17%)` | Hover/subtle backgrounds |
| `--accent-foreground` | `hsl(222 47% 11%)` | `hsl(210 40% 98%)` | Text on accent |
| `--border` | `hsl(214 32% 91%)` | `hsl(217 33% 17%)` | Dividers, input borders |
| `--input` | `hsl(214 32% 91%)` | `hsl(217 33% 17%)` | Form control borders |
| `--ring` | `hsl(221 83% 53%)` | `hsl(217 91% 60%)` | Focus rings |

**Rule:** never hardcode hex/RGB in components. Always use a semantic token (`bg-background`, `text-muted-foreground`, etc.).

## Typography
- Base size: 16px / 1rem
- Headings: Tailwind defaults (`text-2xl`, `text-3xl`, `font-bold`)
- Arabic body text uses `Cairo` (variable weight 400–700)
- Latin body text uses `Inter`
- Mixed-content blocks: rely on the Cairo Arabic glyph range covering Latin fallback acceptably; for heavy bilingual UI, set lang attribute per span.

## Spacing
Tailwind defaults (4px base scale: `p-1` = 4px, `p-2` = 8px, ...). Use `gap-*` for flex/grid over ad-hoc margins.

## Components
Located in `web/src/components/ui/`. Built via shadcn/ui patterns on top of Tailwind tokens.

| Component | Status | Notes |
|-----------|--------|-------|
| `Button` | ✅ Phase 0 | `default` / `outline` / `ghost` × `sm` / `default` / `lg` |
| `Input` | ⏳ Phase 3 | Needed for URL paste screen |
| `Textarea` | ⏳ Phase 3 | Multi-URL paste |
| `Table` | ⏳ Phase 3 | Results listing |
| `Dialog` | ⏳ Phase 3 | Capture detail drawer |
| `Toast` | ⏳ Phase 3 | Feedback on capture start/complete |
| `Card` | ⏳ Phase 4 | Export summary |

## Responsive Breakpoints
Desktop-first. Tailwind defaults apply (`sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px). Primary target is desktop browsers (analyst workstation); all screens must remain usable at `md:` and above. Mobile (<640px) is not a target — layout may collapse acceptably but is not explicitly designed.

## RTL Rules
- Default `<html dir="rtl" lang="ar">`. `src/i18n/index.ts#setLocale` swaps `dir` and `lang` atomically.
- Prefer **logical properties** (`ms-*`, `me-*`, `ps-*`, `pe-*`) over directional (`ml-*`, `pr-*`) for elements whose orientation should mirror.
- Use Tailwind `rtl:` and `ltr:` variants only when behavior must diverge (e.g., arrow icons that flip).
- Text alignment: `text-start` / `text-end` (logical) instead of `text-left` / `text-right`.
- **Test every component in both directions** — Playwright golden-file baselines capture both in later phases.

## Rules (read before creating or modifying UI)
1. Use semantic color tokens, not hardcoded colors.
2. Import shared components from `@/components/ui/` before creating new ones.
3. Support both light and dark themes — always verify both when adding a component.
4. Support both RTL (AR) and LTR (EN) — use logical properties; test with the locale toggle.
5. No inline styles for anything a token can express.
6. All user-visible strings live in `src/i18n/{ar,en}.json`. Never hardcode strings in components.
