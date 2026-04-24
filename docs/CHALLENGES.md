# Challenges, Errors & Lessons Learned — Hadaq Tracker v1

*Written 2026-04-12 as input for the v2 rebuild. Each item is: what broke, root cause, what we did, and what to do differently next time.*

---

## 1. Memory OOM on Render free tier (512 MB)

### Symptom
During batch captures of ~6+ tweets, the Render web service crashed with a 502. Render emailed: *"Nusuk-Tracker exceeded its memory limit → automatic restart."* Batches after the first would partially succeed and leave broken rows.

### Root causes (multiple, compounding)
1. **Video tweets were treated as images.** `fast-extract.ts` picked `media.all[0].url` first — for videos that's the `.mp4` URL. `card-renderer.fetchImageAsDataUri()` had no size cap, so it downloaded 5–30 MB MP4s into base64 buffers and embedded them in SVG (which rendered blank AND blew memory).
2. **Puppeteer browser never recycled mid-batch.** Renderer process accumulated image/font caches across captures; only closed after the whole batch finished.
3. **`waitUntil: 'networkidle0'`** on Twitter embeds held every tracker image in renderer memory.
4. **`deviceScaleFactor: 2` + `fullPage: true`** produced 5 MB+ PNGs held in Node heap during upload.
5. **No `--single-process` flag** on the embed browser → multiple Chromium helper processes per page.

### Fix (v1)
- Thumbnail-only for videos; never the MP4 URL.
- Content-type + 2 MB cap on every image fetch.
- Recycle browser every 3 captures in batch mode.
- `networkidle2`, DPR 1.5, clip to `<article>`, `--single-process` in prod.
- `Memory.forciblyPurgeJavaScriptMemory` between captures.

### Lesson for v2
- **Model media types explicitly from day one.** `media_type` column and strict TS unions prevent this entire class of bug.
- **Treat Render free tier as ~350 MB usable.** Chromium baseline is 200–300 MB. Budget every buffer.
- **Instrument memory**: log `process.memoryUsage().rss` after each capture; alert if it trends upward.
- **Consider offloading screenshots** to an external service (Browserless.io free tier, or a queued worker) if rebuilds continue to hit the ceiling.

---

## 2. Arabic font rendering (intermittent)

### Symptom
Arabic tweets captured via Puppeteer embed sometimes showed Latin/tofu glyphs instead of proper Arabic — forcing manual recapture. Satori-rendered fallback cards had thin, incorrect glyphs.

### Root causes
1. **CSS override injected AFTER first paint.** `addStyleTag` ran post-`waitForSelector`, but TwitterChirp glyphs had already been painted.
2. **Docker image trimmed fonts to save memory** (`fonts-noto-core` only), so any exotic weight or Kufi variant fell through to a generic sans.
3. **Satori font registry used weight 400 only.** Bold Arabic headers silently fell back to the Latin Noto Sans.
4. **No bounded check** that `document.fonts.check('16px "Noto Sans Arabic"')` was true before screenshot; relied on a fixed 1 s sleep.

### Fix (v1)
- Inject font CSS via `page.evaluateOnNewDocument` *before* navigation.
- Bounded poll on `document.fonts.check` up to 2 s, then screenshot.
- Kept `fonts-noto-core` (contains Noto Sans Arabic) in Dockerfile.

### Lesson for v2
- **Bake fonts into the app**, not the OS. Ship `.ttf` files in `server/assets` and register them for both Puppeteer (via `@font-face` with `file://` URLs or `page.evaluateOnNewDocument`) and satori. Removes all OS font variance.
- **Register weights 400 AND 700** for both Latin and Arabic in satori.
- **Golden-file tests**: capture a known Arabic tweet and diff the PNG against a baseline — fails loudly if fonts regress.

---

## 3. Video tweets produced blank cards

Covered in §1 root cause #1 — listed separately because it was reported as its own bug.

### Fix (v1)
- `mediaType: 'video' | 'gif' | 'photo'` returned alongside `mediaUrl`.
- Satori card renders a ▶ play badge over the thumbnail when `mediaType === 'video'`.

### Lesson for v2
- Any external API response that contains a discriminated union (photo vs video) must be **parsed into a typed union at the boundary**. Don't let raw, optional fields leak into renderers.

---

## 4. Puppeteer instability & duplicate browser singletons

### Symptom
Two separate `Browser` singletons existed (`tweet-embed-screenshot.ts` and `twitter-browser.ts`) with different launch args. Under load they could coexist → 2× Chromium → OOM.

### Lesson for v2
- **One browser manager**, one module. Expose typed page-acquisition helpers (`withTweetPage`, `withArticlePage`) so callers can't launch their own.
- Treat Puppeteer as a scarce, pooled resource with a concurrency of **1** on free tier.

---

## 5. Render deploy timeouts from font install

### Symptom
Dockerfile initially installed the full `fonts-noto` meta-package (~hundreds of MB). Deploys timed out fetching fonts.

### Fix (v1)
Commit `751be86` trimmed to `fonts-noto-core` + `fonts-kacst` + `fonts-freefont-ttf`.

### Lesson for v2
- Ship only the glyph subsets actually used. `fonttools pyftsubset` can reduce `NotoSansArabic-Regular.ttf` from ~400 KB to ~60 KB by keeping only Arabic + Latin base.
- Container images should stay under ~400 MB compressed for fast Render cold starts.

---

## 6. Supabase storage vs local filesystem

### Symptom
Early v1 stored screenshots on the server's local disk. Render's free tier has **ephemeral disk** — screenshots vanished after every restart.

### Fix (v1)
Moved to Supabase Storage bucket. Introduced `storage.ts` abstraction.

### Lesson for v2
- Assume the runtime has **no persistent disk**. All writes must go to a durable backing service (Storage, S3, etc.) from the first commit.

---

## 7. Duplicate detection after soft delete

### Symptom
Re-capturing a URL that had been soft-deleted hit the DB unique constraint and errored.

### Fix (v1)
`purgeDeletedDuplicate()` — permanently delete any soft-deleted row before insert.

### Lesson for v2
- Define the dedup contract up front: unique index on `(user_id, normalized_url) WHERE deleted_at IS NULL`. Makes re-capture a simple insert, no pre-purge dance.

---

## 8. Twitter login cookies approach (abandoned)

### What we tried
Logged-in Puppeteer session with cookies persisted in Supabase, so we could screenshot the real twitter.com timeline.

### Why we dropped it
- Cookies expired unpredictably.
- Twitter's DOM changed often; every change broke selectors.
- Memory cost of the logged-in page was ~2× the embed page.

### Lesson for v2
- Prefer **public/unauthenticated surfaces**: the embed page + FxTwitter + oEmbed cover every real need.
- If authenticated scraping ever comes back, isolate it behind a feature flag and only enable on a paid tier with persistent disk.

---

## 9. Monitor feature (keyword scan) disabled

### Symptom
The background monitor (Twitter keyword search → auto-capture) worked locally but OOMed immediately on Render free tier.

### Status
Code is present but the UI is gated (`Features.md` marks it disabled). Not reactivated for v1.

### Lesson for v2
- Build it, but ship it **off by default**. Only enable when:
  - A paid hosting tier is acquired, or
  - The capture pipeline is moved to a separate worker process.

---

## 10. Frontend was JSX, not TypeScript

### Symptom
Multiple runtime bugs — wrong prop names, missing fields after API shape changes — that a TS client would have caught at build time.

### Lesson for v2
- **TypeScript on both sides**, sharing types via a small `packages/shared` workspace (even inside a monorepo without full Turbo/Nx setup).

---

## 11. Render build cache + Vite lockfile invalidation

### Symptom
Locally, `npm run dev` took 28+ seconds to start Vite after any `package-lock.json` change due to dependency re-optimization. Initially confusing — looked stuck.

### Lesson for v2
- Commit dependencies deliberately; avoid churn in `package-lock.json` during active development sprints.
- Add a `npm run doctor` script that checks Node version, ports 3001/5173 free, env vars present.

---

## 12. No observability

### Symptom
When a Render instance OOMed, the only signal was an email. No request-level logs, no memory timeline, no capture-path metrics.

### Lesson for v2
- From day one: structured logs (pino JSON), RSS sampled every 30 s, and a `/api/metrics` endpoint returning last-N-capture durations and fallback-path distribution.
- Even a single log line per capture — `capture path=fx+embed duration=3421ms rss=312MB` — would have diagnosed every issue in this document within minutes.

---

## Verification Checklist (copy into every release PR)

Before deploying, run these on local AND the live Render instance:

- [ ] Single text tweet (English) — captures in ≤ 10 s with correct avatar.
- [ ] Single tweet (Arabic body) — Noto Sans Arabic glyphs, no tofu.
- [ ] Single tweet with photo — photo visible in screenshot.
- [ ] Single tweet with video — thumbnail + ▶ overlay visible, no blank.
- [ ] Single article URL — OG metadata + page screenshot.
- [ ] Batch of 10 mixed URLs — ≥ 9 succeed first pass, no 502.
- [ ] Server RSS during the batch stays < 480 MB.
- [ ] Duplicate URL → "already captured" toast, no error.
- [ ] Soft delete + recapture same URL → succeeds.
- [ ] Excel export opens in Excel/Numbers with per-category sheets.
- [ ] PDF export renders with correct Arabic/RTL content.
- [ ] Backup ZIP → restore on a fresh DB reproduces every post.
- [ ] Arabic UI pass: all pages RTL, no clipped buttons.

---

## Summary — Top 5 Things to Do Differently in v2

1. **Type the seams.** TypeScript client, discriminated unions for media, Zod at every network boundary.
2. **One browser manager.** Pooled, capped, instrumented.
3. **Durable storage from day one.** Never touch local disk.
4. **Ship fonts in-app.** Don't depend on OS fonts.
5. **Observability before features.** Logs + memory + fallback-path metrics in milestone M1.
