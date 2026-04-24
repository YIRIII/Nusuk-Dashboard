# Business Requirements Document — Hadaq Tracker

*Version 2.0 — 2026-04-12*

---

## 1. Executive Summary

Hadaq Tracker is an internal web application that automates the monitoring and archival of public social-media posts (Twitter/X, Instagram) and news articles related to the **Nusuk Card** (بطاقة نسك) — the digital ID used by pilgrims during Hajj season.

The tool replaces a fully manual workflow (Excel + folder screenshots) with a paste-a-URL, one-click capture experience, producing a searchable archive suitable for compliance reporting and executive briefings.

---

## 2. Business Context

### 2.1 Stakeholder
- **Primary user**: Internal analyst / PR monitoring owner at the Nusuk program office.
- **Consumers of output**: Program leadership (PDF briefings, Excel exports).

### 2.2 Current pain
Each Hajj season generates hundreds of relevant public posts. The manual process takes a full day per week:
1. Search Twitter/X and news for "Nusuk Card" mentions.
2. Copy poster, date, URL, body text into Excel.
3. Manually screenshot each post; file into `/Persons` or `/Companies` folders.
4. Compile weekly PDF summaries by hand.

### 2.3 Business goals
| # | Goal | Measure |
|---|---|---|
| G1 | Cut capture time per post | From ~3 min manual → **< 20 s** automated |
| G2 | Zero missed posts | 100 % of pasted URLs produce an archived record |
| G3 | Reproducible screenshots | Same post captured on two dates looks identical |
| G4 | Zero cost to operate | Free tiers only (Supabase, Render free plan) |
| G5 | Operable by non-technical user | Arabic/English UI, no CLI, no cloud console |

### 2.4 Out of scope (v1)
- Automated discovery (crawling Twitter for keywords → handled manually; a scan tool exists but is disabled due to memory limits).
- Multi-user collaboration / roles.
- Content moderation or sentiment scoring.
- Mobile apps.

---

## 3. Business Rules

- **BR-1**: A post is identified by its canonical URL. URLs are normalised (`x.com` ≡ `twitter.com`, trailing slash stripped, query params dropped) before duplicate checks.
- **BR-2**: Posts are classified as either **Person** or **Company** — no other categories in v1.
- **BR-3**: Deletions are **soft** (recoverable for 30 days) and a hard delete permanently removes screenshots.
- **BR-4**: Screenshots must preserve the original visual (fonts, media, layout) — this is an audit artefact, not a summary.
- **BR-5**: Arabic content must render correctly with a proper Arabic typeface (Noto Sans Arabic) — Latin fallback is unacceptable.
- **BR-6**: Exports (PDF / Excel / ZIP) must be self-contained and openable offline.

---

## 4. Success Criteria

| Criterion | Target |
|---|---|
| A batch of 20 mixed URLs captures without manual recapture | ≥ 95 % first-pass success |
| Render instance stays under memory limit during a 20-URL batch | No OOM restart over 1 hour of use |
| Arabic tweets render with Noto Sans Arabic | 100 % of samples reviewed |
| Video tweets show a recognisable thumbnail with play indicator | 100 % of samples reviewed |
| Weekly PDF export produced in one click | < 30 s generation time |

---

## 5. Constraints & Assumptions

### 5.1 Constraints
- **Budget**: $0/mo. Must run on Render free web service (512 MB RAM, spins down after 15 min idle) and Supabase free tier (500 MB DB, 1 GB storage).
- **Legal**: Only public posts. No scraping behind authentication walls except where the user supplies their own session cookies.
- **Deployment target**: One Dockerised container on Render, pointing at managed Supabase.

### 5.2 Assumptions
- FxTwitter, Twitter oEmbed, and Twitter public embed endpoints remain available without API keys.
- The user has a modern desktop browser (Chrome/Safari/Firefox).
- Hajj monitoring is seasonal: usage peaks for ~2 months/year, near-idle the rest.

---

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Third-party endpoints (FxTwitter, oEmbed) go down | High — no captures | Multiple fallbacks: FxTwitter → oEmbed → Puppeteer embed → satori card |
| Render 512 MB OOM kills browser mid-batch | High — user-visible failures | Recycle Puppeteer every N captures; strict image-size guards; satori fallback |
| Twitter changes embed HTML structure | Medium | Embed page is simpler than main site; fallback chain still works |
| Supabase free tier limits (500 MB DB) | Low (text-only rows) | Screenshots stored in Supabase Storage bucket (1 GB); prune soft-deleted > 30 d |
| Single operator / bus factor | Medium | Documented in `/docs`; simple stack (Node + React + Postgres) |

---

## 7. Stakeholder Sign-off
- Product owner: *(you)*
- Tech owner: *(you)*
- End user: *(Nusuk PR analyst)*
