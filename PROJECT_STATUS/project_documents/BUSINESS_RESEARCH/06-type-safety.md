# Feature: TypeScript + Zod Boundary Validation (BR-8)

**BRs covered**: BR-8 (TS end-to-end + Zod at network boundaries)
**Category**: Engineering discipline
**Tier**: **Depth**

## What it does

Every function, component, API route, database row, and external API response has a compile-checked TypeScript type. Every network boundary (request body, external API response, Supabase row read/write) is validated at runtime with Zod before the data enters typed code.

## Competitive analysis

Not a product-facing feature — a root-cause fix for the class of v1 bugs where untyped JSX + untyped Express meant media-type values could be anything, and schema drift went unnoticed until screenshots broke in production.

## Impact severity: **Major inconvenience (indirect)**

No direct user-visible effect, but the absence of type safety is what caused v1's video-as-image bug and several prop-rename regressions. Fixes one root cause that drives multiple reliability symptoms.

## Novelty rating: **Saturated**

Industry standard in 2026. The novelty here is doing it *this time* instead of skipping it like v1.

## Rebuild-specific notes

- `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`.
- Zod schemas colocated with route handlers; parse request bodies on entry; parse external-API responses on read.
- Supabase types auto-generated via `supabase gen types typescript`.
- Shared types package between client and server (monorepo or shared `types/` folder).
- No `any`. `unknown` only at boundaries before Zod parse.
