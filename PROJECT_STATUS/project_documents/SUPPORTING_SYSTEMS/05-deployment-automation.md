# System: Deployment Automation

**Priority**: Growth (works without it; significantly reduces friction with it)
**Recommendation**: Docker Compose on Oracle Cloud VM + GitHub Actions SSH-deploy; keep Render fallback template ready
**Est. Year 1 cost**: $0
**Detection signals**: BR-15 ($0 budget), BR-1 (reliability depends on reproducible deploys), BRD R-1 (Oracle Cloud signup risk → Render fallback)

## Why it's needed

Two deploy targets need to stay in parity:
1. **Primary: Oracle Cloud Always Free** (ARM Ampere A1 Flex VM) — the solution for v1's OOM root cause.
2. **Fallback: Render free** — if Oracle signup is blocked or revoked.

Both must deploy the same Docker image. Manual deploy is feasible for a solo developer but error-prone (this is a reliability-first rebuild — let's not introduce deploy-drift bugs).

## Build vs Buy matrix

| Option | Fit | Cash | Founder time | Fully-loaded Year 1 |
|---|---|---|---|---|
| **Docker Compose + GitHub Actions SSH** ⭐ | Clean, portable, parity between targets | $0 | 10h setup | $400 |
| Render blueprint (`render.yaml`) | Perfect for Render fallback | $0 | 2h | $80 |
| Oracle Cloud Resource Manager (Terraform) | Overkill for one VM | $0 | 20h | $800 |
| Ansible playbook | Adds tool to stack for marginal gain | $0 | 15h | $600 |
| Kamal (rails-adjacent deploy tool) | Popular in 2026 | $0 | 8h | $320 |
| Coolify (self-hosted Heroku-like) | Great DX, needs second VM | $0 | 12h | $480 |

Sources:
- Docker Compose docs: https://docs.docker.com/compose/
- Render blueprints: https://render.com/docs/blueprint-spec
- Kamal: https://kamal-deploy.org/

## Options Rating Matrix

KPIs: portability across Oracle/Render (High 30%), setup time (High 20%), maintenance (Medium 20%), $0 (Medium 15%), rollback ease (Medium 10%), lock-in (Low 5%).

| Option | Portability | Setup | Maintenance | $0 | Rollback | Lock-in | Weighted |
|---|---|---|---|---|---|---|---|
| **Docker Compose + GH Actions SSH** ⭐ | 5 | 4 | 4 | 5 | 4 | 5 | **4.40** |
| Render blueprint | 1 (Render only) | 5 | 5 | 5 | 5 | 1 | 3.30 |
| Kamal | 5 | 4 | 4 | 5 | 5 | 4 | 4.35 |
| Coolify | 4 | 3 (needs 2nd VM) | 3 | 5 | 5 | 3 | 3.60 |
| Ansible | 5 | 2 | 3 | 5 | 3 | 5 | 3.55 |

**Winner**: Docker Compose + GitHub Actions SSH. Kamal is a very close second — worth considering if you already know it.

## Recommendation

- **Primary**: `docker compose up -d` on Oracle Cloud VM, driven by GitHub Actions workflow on merge to `main`. Secrets via GitHub Actions Secrets → SSH-injected env file.
- **Fallback**: keep `render.yaml` blueprint in the repo pointing at the same Docker image. If Oracle goes down or signup fails, one `render.yaml` push reactivates Render deploy.
- **Image registry**: GitHub Container Registry (`ghcr.io`) — free for public repos, generous free tier for private.

## Impact if absent

Manual deploys work, but (a) break Oracle↔Render parity quickly, (b) add friction that discourages the small, frequent deploys reliability-driven engineering benefits from. Classified Growth (not Essential) because the tool *can* ship without this — just with more friction.
