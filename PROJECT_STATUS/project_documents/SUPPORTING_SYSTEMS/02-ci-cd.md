# System: CI/CD Pipeline

**Priority**: Essential
**Recommendation**: GitHub Actions (free tier for public repo; 2000 min/mo for private)
**Est. Year 1 cost**: $0
**Detection signals**: BR-8 (TypeScript compile checks), BR-10 (golden-file tests must gate deploys), BR-9 (deployment automation)

## Why it's needed

v2's reliability depends on catching regressions before they reach production. Specifically: TypeScript compile errors, Zod schema drift, and Arabic-rendering regressions from the golden-file test suite (the central mechanism protecting BR-2).

## Build vs Buy matrix

| Option | Free tier | Fit | Cash | Founder time | Fully-loaded Year 1 |
|---|---|---|---|---|---|
| **GitHub Actions** (public repo) | Unlimited minutes | Perfect | $0 | 6h setup, 1h/mo | $280 |
| **GitHub Actions** (private repo) | 2000 min/mo | Comfortable for this scale | $0 | 6h setup, 1h/mo | $280 |
| GitLab CI free | 400 min/mo | Tight but usable | $0 | 8h | $320 |
| CircleCI free | 6000 build min/mo (Linux medium) | Overkill | $0 | 10h | $400 |
| Self-hosted runner on Oracle Cloud VM | Unlimited | Steals RAM from capture process during builds | $0 | 20h | $800 |

Sources:
- GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage (accessed 2026-04-15)
- GitLab CI minutes: https://about.gitlab.com/pricing/ (accessed 2026-04-15)

## Options Rating Matrix

KPIs: integration with GitHub (High 25%), free-tier minutes adequate (High 25%), support for Docker builds + Puppeteer (High 20%), Arabic-font golden-file test feasibility (Medium 15%), setup time (Medium 10%), lock-in (Low 5%).

| Option | GH integ. | Minutes | Docker+Puppeteer | Golden-file tests | Setup | Lock-in | Weighted |
|---|---|---|---|---|---|---|---|
| **GitHub Actions** ⭐ | 5 | 5 | 5 | 5 | 5 | 3 | **4.80** |
| GitLab CI | 3 | 3 (400 min tight) | 5 | 5 | 4 | 3 | 3.90 |
| CircleCI | 4 | 5 | 5 | 5 | 3 | 3 | 4.30 |
| Self-hosted | 4 | 5 | 3 (resource contention) | 5 | 1 | 5 | 3.60 |

**Winner**: GitHub Actions.

## Recommendation

- **Workflow**: PR → lint (ESLint, Prettier) → TypeScript build → Zod-schema drift check → unit tests (Vitest) → golden-file screenshot tests → Docker build → (on merge to `main`) deploy to Oracle Cloud.
- **Runner**: `ubuntu-latest` GitHub-hosted; Puppeteer + @sparticuz/chromium-min fit easily in 7 GB action runner.
- **Deploy step**: SSH to Oracle Cloud VM, `docker pull` + `docker compose up -d`, or use a tiny `ansible` playbook.
- **Arabic golden-file tests**: run inside the same Docker image used in production (fonts installed), ensuring the CI environment matches runtime. Use `jest-image-snapshot` for pixel diff.

## Impact if absent

Manual deploys + manual regression testing = the v1 pattern that let the Arabic-rendering bug reach production undetected. CI gating the Arabic golden-file tests is the concrete mechanism backing BR-2.
