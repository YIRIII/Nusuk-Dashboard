# Product Requirements Document — Nusuk Tracker

*Version 2.0 — 2026-04-12*

> Companion: [BRD.md](./BRD.md) (business framing) · [CHALLENGES.md](./CHALLENGES.md) (lessons learned)

---

## 1. Product Summary

A single-user web app that turns a pasted social/news URL into a searchable, exportable archive entry in under 20 seconds — including a faithful screenshot of the post, extracted metadata, and automatic detection of linked articles. Designed to run on a free-tier stack (Render + Supabase) with bilingual English/Arabic UI.

---

## 2. Personas

### P1 — Monitoring Analyst (primary)
- Non-developer, comfortable with Excel and a browser.
- Tracks Nusuk Card mentions during Hajj season.
- Produces weekly PDF and Excel summaries for leadership.
- Prefers Arabic UI; needs RTL throughout.

### P2 — Program Owner (consumer)
- Does not interact with the tool directly.
- Reads generated PDF/Excel reports.

---

## 3. Core User Flows

### 3.1 Single Capture
1. User opens **Capture** page.
2. Pastes a URL, picks **Person** or **Company**.
3. System:
   - Detects type: tweet / Instagram / article.
   - Extracts metadata (poster, display name, body, date, media) via HTTP APIs (no browser when possible).
   - Produces a screenshot via Puppeteer embed; falls back to a server-rendered satori card if that fails.
   - Detects linked articles inside a tweet and captures them too.
4. Preview appears with editable name / notes / category.
5. User clicks **Save** → row stored in Supabase, screenshot in Storage bucket.

### 3.2 Batch Capture
1. User pastes up to 100 URLs (one per line) or drops a .txt/.csv.
2. System captures sequentially with periodic browser recycling.
3. Per-URL status (success / duplicate / failed) shown live.
4. Failed rows offer a one-click retry.

### 3.3 Browse & Filter
- Grid and table views of archived posts.
- Filters: category, source type, date range, free-text search.
- Similar-content badge flags near-duplicate posts.

### 3.4 Post Detail
- Full-size screenshot, lightbox, download button.
- All metadata, inline edit for name/notes/category.
- Linked article preview (if any).
- Soft delete → restorable from **Recently Deleted** for 30 days.

### 3.5 Dashboard
- Counters: total, persons, companies, captured this week.
- Recent captures carousel with thumbnails.
- Quick-capture input.

### 3.6 Export & Backup
- **Excel**: per-category sheets, named screenshot files, all metadata columns.
- **PDF**: dashboard-style weekly report with charts and screenshots.
- **ZIP backup**: manifest.json + screenshots folder, restorable in-app.

### 3.7 Manual override
- Per-post: upload a replacement screenshot (for the rare case auto-capture fails even with fallbacks).

---

## 4. Functional Requirements

### 4.1 Capture pipeline (hard requirements)
- **FR-1** Must extract poster, display name, body, published date, media URL, profile image for tweets.
- **FR-2** Must classify media as `photo | video | gif`; for video/gif the stored media URL must be a thumbnail, **never** a video file URL.
- **FR-3** Puppeteer embed screenshot must render Arabic correctly on first paint (no fallback glyphs).
- **FR-4** All image fetches must enforce: `Content-Type: image/*` and ≤ 2 MB body size.
- **FR-5** Fallback chain for tweets: FxTwitter → oEmbed → Puppeteer embed → satori card. Any tweet URL must always produce *some* screenshot artefact.
- **FR-6** Linked article auto-capture: if tweet body contains an external URL, fetch its OG metadata.

### 4.2 Storage
- **FR-7** Screenshots stored in Supabase Storage (public bucket) under `{userId}/{category}/{uuid}.png`.
- **FR-8** Database single-table `posts` with soft-delete (`deleted_at`) + permanent-delete path.
- **FR-9** Duplicate detection by normalised URL; option to **skip** or **replace** on collision.

### 4.3 UI
- **FR-10** Bilingual EN / AR with full RTL layout when AR.
- **FR-11** Dark theme; responsive down to 1024×768.
- **FR-12** Keyboard shortcut `⌘K` (or `Ctrl+K`) opens capture from anywhere.

### 4.4 Export
- **FR-13** Excel export: one sheet per category, headers in selected UI language.
- **FR-14** PDF export: cover page + per-post card with screenshot thumbnail and metadata.
- **FR-15** Backup ZIP includes `manifest.json` (schema-versioned) + all screenshots.

---

## 5. Non-Functional Requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-1 | Performance | Single capture ≤ 20 s p95 on Render free tier |
| NFR-2 | Performance | Batch of 20 URLs ≤ 6 min p95, no OOM restart |
| NFR-3 | Memory | Server RSS must stay below 480 MB during a 20-URL batch |
| NFR-4 | Reliability | ≥ 95 % first-pass success rate (no manual recapture) |
| NFR-5 | Security | Supabase RLS: each row tagged with `user_id`; anon key only for read of own rows |
| NFR-6 | Accessibility | AA contrast on dark theme; all controls reachable via keyboard |
| NFR-7 | Observability | Server logs each capture with url, path taken (fx/oembed/embed/card), duration |
| NFR-8 | Recoverability | Any failed capture row can be retried from the UI without data loss |

---

## 6. Data Model (target for v2 rebuild)

```sql
-- posts: core archival record
id              uuid PK
user_id         uuid  (FK to auth.users, RLS-enforced)
url             text NOT NULL
normalized_url  text NOT NULL  -- used for dedup
source_type     text NOT NULL   -- 'tweet' | 'instagram' | 'article'
category        text NOT NULL   -- 'person' | 'company'
status          text NOT NULL   -- 'new' | 'reviewed' | 'archived'
poster_name     text
display_name    text
content         text
media_type      text            -- 'photo' | 'video' | 'gif' | null
media_url       text            -- thumbnail URL only, never a .mp4
published_date  timestamptz
screenshot_path text
capture_path    text            -- which fallback fired: 'fx+embed' | 'fx+card' | 'oembed+card' | 'manual'
linked_url      text
linked_title    text
linked_summary  text
notes           text
similar_to_id   uuid REFERENCES posts(id)
similarity_score numeric
deleted_at      timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

New in v2 vs. v1:
- `normalized_url` as a distinct column (indexed) — cleaner dedup.
- `media_type` explicit (prevents the video-as-image bug entirely).
- `capture_path` — lets us measure which fallback is firing most.
- `status` workflow column for analyst triage.

---

## 7. Tech Stack (recommended for v2)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript + TailwindCSS v4 | v1 was JSX — typing the client prevents media-type bugs like v1 |
| State | TanStack Query + Zustand | Replaces ad-hoc fetches; built-in retries for flaky captures |
| Backend | Express + TypeScript (tsx) | Keep — works, familiar, small |
| Screenshots | Puppeteer embed → satori/resvg fallback | Keep — the fallback chain proved its value |
| DB | Supabase Postgres + RLS | Keep |
| Storage | Supabase Storage | Keep (moved away from local FS in v1 for Render ephemerality) |
| Auth | Supabase email magic link | Single-user, minimal UX |
| Hosting | Render free Docker web service | Keep for now; budget for Starter tier if batch sizes grow |

---

## 8. Out of Scope for v2 initial release
- Active monitoring (keyword scan, feed extraction) — keep code gated behind a feature flag, re-enable only if hosting tier allows.
- Automatic categorisation via ML — current heuristic is "good enough".
- Multi-tenant / team features.

---

## 9. Release Milestones

| Milestone | Content |
|---|---|
| **M1** (2 weeks) | Auth + DB schema + Capture (tweet + article) + Posts list + Single-post detail |
| **M2** (1 week) | Batch capture, duplicate detection, soft delete + recently deleted |
| **M3** (1 week) | Excel + PDF export, ZIP backup + restore |
| **M4** (1 week) | Polish: dashboard, similar-content flags, Arabic RTL pass, accessibility |
| **M5** (stretch) | Re-enable monitor (only if on paid tier) |

---

## 10. Acceptance Tests

Each release must pass the [verification checklist](./CHALLENGES.md#verification-checklist) in full before deploy.
