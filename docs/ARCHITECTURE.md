# Architecture — Hadaq Tracker

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────►│ Vite (5173)  │────►│ Express API  │
│   (React)    │     │   Dev Proxy  │     │   (3001)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ Supabase │ │ Puppeteer│ │  Local   │
                              │ Database │ │ Browser  │ │  Files   │
                              └──────────┘ └──────────┘ └──────────┘
```

## Data Flow: Capture

1. User pastes URL + selects category in React UI
2. `POST /api/capture` sent to Express
3. Server detects URL type (tweet vs article)
4. Puppeteer opens URL with stealth mode:
   - **Tweet:** Dismiss login wall → screenshot tweet element → extract username, text, date → detect linked URLs
   - **Article:** Wait for load → screenshot viewport → extract title/author/date from meta tags
5. If tweet has linked article: auto-navigate + screenshot + extract that too
6. Save metadata to Supabase `posts` table
7. Save screenshots to `server/screenshots/{persons,companies}/`
8. Return post + screenshot paths to client
9. User can edit name/notes then save

## Database

Single table `posts` in Supabase. Screenshot files are NOT stored in Supabase Storage (to avoid the 1GB free tier limit). Instead, they're stored on the local filesystem and served via Express static middleware.

## Puppeteer

- **Singleton browser:** One Chromium instance, new pages per capture, closed after
- **Stealth plugin:** `puppeteer-extra-plugin-stealth` to bypass Twitter's bot detection
- **Screenshots:** PNG for tweets (text clarity), viewport screenshots for articles
- **Error handling:** Timeouts, deleted tweets, and blocked pages all handled gracefully

## Frontend

- **React 19** with JSX (no TypeScript on client)
- **Vite** dev server with proxy to Express backend
- **TailwindCSS v4** with custom dark theme tokens
- **react-router-dom v7** for SPA routing
- **lucide-react** for icons
- **Bilingual:** EN/AR translations via React Context, RTL support

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/capture` | Capture URL → screenshot + extract + save |
| GET | `/api/posts` | List posts (with filters) |
| GET | `/api/posts/stats` | Dashboard statistics |
| GET | `/api/posts/:id` | Single post detail |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Delete post + screenshots |
| GET | `/api/export` | Download Excel export |
| GET | `/api/screenshots/*` | Serve screenshot files |
