# Category 4: Capacity & Timeline

## Team capacity

From IDEA.md: single developer (the user, Yousef) + the analyst as stakeholder/UAT. No stated hard deadline, but natural target is **before next Hajj peak** (roughly 10–12 months out from 2026-04-15 depending on Islamic-calendar year).

Available person-hours assuming **part-time rebuild** (15 hrs/week on this project): 15 × 40 weeks buffer before Hajj = **600 hours** (~15 person-weeks @ 40 hr/wk).

## Effort estimates (rough)

| Domain | Item | Effort (hours) | Notes |
|---|---|---|---|
| Infra setup | Oracle Cloud VM provisioning + Docker + domain + Cloudflare Tunnel | 16 | one-time |
| Backend scaffolding | Node + TS + Express + Zod + pino + Supabase client | 24 | one-time |
| Capture pipeline | Puppeteer + pooled browser manager + media_type discrim + fallback chain (re-implement v1 logic in TS) | 80 | largest chunk |
| Arabic font infrastructure | Docker font install + `evaluateOnNewDocument` + `document.fonts.ready` + golden-file baseline | 30 | |
| Frontend rebuild | React 18 + Vite + TS + Tailwind RTL + react-i18next + port v1 UI screens | 80 | |
| Export & backup | exceljs (RTL-aware) + PDF via `page.pdf()` + archiver backup/restore | 40 | |
| Data lifecycle | Schema migration + URL normalization + `pg_cron` purge + dashboard queries | 20 | |
| Observability | pino structured logs + `/api/metrics` + Sentry + Axiom wiring | 16 | |
| CI/CD | GitHub Actions workflow + Docker build + ARM64 QEMU emulation + SSH deploy | 16 | CV-03 remediation |
| Golden-file test suite | Curate 8-12 AR reference cases + Playwright config + CI gate | 20 | |
| Documentation | README (AR + EN), ToS/PDPL compliance note, runbook | 16 | |
| **Subtotal** | | **358** | |
| Integration overhead (25%) | Making everything work together | **90** | industry norm |
| Buffer for discovered issues (20%) | Unknowns | **72** | |
| **TOTAL estimated effort** | | **~520 hours** | ~13 person-weeks |

## Capacity ratio

Required: **~520 hours** · Available (10-month part-time): **~600 hours**

**Capacity ratio: 600 / 520 = 1.15**

Just above 1.0 → **Tight PASS**. Less than 20% headroom → **WARNING**.

## Critical path

Sequential chain (cannot be parallelized with one developer):
1. Infra + backend scaffolding (40h)
2. Capture pipeline + media_type + fallback (80h) ← enables everything downstream
3. Arabic fonts + golden-file baseline (50h) ← enables CI gate
4. Frontend + export flow (120h) ← the analyst-facing work
5. Observability + CI/CD + deployment (32h)
6. Buffer + integration + docs (178h)

No shortening the critical path with more people (solo developer); faster completion needs more weekly hours, not more people.

## Skill gap check

Developer's known skills (v1 baseline): React, Express, Puppeteer, Supabase, Docker, basic DevOps. **All required skills present.**
New-to-developer-possibly: Playwright `toHaveScreenshot`, ARM64 QEMU in CI, Oracle Cloud console, Axiom configuration. Learning curve estimated ~15h, absorbed in the 20% buffer.

## Maintenance burden (post-launch)

From SUPPORTING_SYSTEMS/README: ~2h/mo ongoing. Not a capacity concern at current scale.

## Verdict

**CONDITIONAL PASS** — capacity ratio 1.15 (just above 1.0) flags as WARNING per skill methodology (< 20% headroom). Remediations:

1. **Expand weekly commitment** from 15 → 18 hrs/week → capacity rises to 720h → ratio 1.38 (comfortable PASS).
2. **Phase the delivery**: ship Phase 1 MVP (no Axiom/Sentry/automated monitoring) first at ~430h; add Phase 2 polish after Hajj season concludes.
3. **Trim optional scope**: defer ZIP backup/restore (BR-14) and dashboard stats (BR-13) to Phase 2 — saves ~50h, pushes ratio to 1.28.

**Recommended**: Option 2 (phased delivery) + Option 3 (trim optional scope) combined → Phase 1 fits comfortably in 10 months at 15 hrs/week with headroom.

**Timeline risk**: if the next Hajj season is <8 months out, capacity becomes tight even with phasing. Verify Hajz timing before locking the PRD.
