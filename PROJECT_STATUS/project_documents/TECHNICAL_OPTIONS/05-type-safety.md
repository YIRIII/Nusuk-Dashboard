# Capability 05: Type Safety (Depth)

**BRs covered**: BR-8 · **Tier**: Depth

## Stack

| Concern | Chosen tool | Why |
|---|---|---|
| **Typed language** | **TypeScript** (latest stable, strict mode) | Non-negotiable — direct fix for v1's JSX-untyped class of bugs |
| **Runtime schema validation at boundaries** | **Zod** (latest stable) | First-class TS inference; actively maintained; widely adopted; small bundle |
| **Supabase type generation** | `supabase gen types typescript --project-id <id>` | Autogenerates types from schema |
| **Shared types client↔server** | Monorepo with `packages/types/` (pnpm workspace) or simple `/shared` folder | Either works for single-developer project |
| **Linting** | ESLint + `@typescript-eslint` + `eslint-plugin-import` | Standard 2026 setup |
| **Formatting** | Prettier | Standard |

## `tsconfig.json` essentials

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

## Where Zod guards apply

1. Express route handlers: `.parse(req.body)` / `.parse(req.query)` — reject invalid payloads with 400 before they enter typed code
2. External API responses: `FxTwitterResponseSchema.parse(json)` — catches FxTwitter schema drift
3. Supabase row reads: `PostSchema.parse(row)` — catches DB ↔ TS type drift
4. Environment variables at startup: `EnvSchema.parse(process.env)` — fail fast on misconfiguration
5. Media type discriminated union (Capability 03) — single source of truth for media handling

## Alternatives considered

- **Valibot** — smaller bundle, similar API — not yet as ecosystem-rich as Zod, reject for production use
- **Yup / Joi** — older, weaker TS inference, reject
- **tRPC** — overkill for a single-developer internal tool; adds abstraction without the team-coordination benefit it's designed for

## Recommendation

TypeScript + Zod + Supabase gen-types + ESLint + Prettier. Cost: $0 cash.

**Est. Year 1 cost: $0 cash.**
