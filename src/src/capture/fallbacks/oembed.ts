import { z } from 'zod';
import type { CaptureService } from '../puppeteer-service.js';
import type { StageResult } from '../types.js';
import type { TweetRef } from '../url.js';
import { logger } from '../../logger.js';

const OEmbedSchema = z.object({
  html: z.string(),
  author_name: z.string().nullable().optional(),
  author_url: z.string().url().nullable().optional(),
});

const OEMBED_BASE = 'https://publish.twitter.com/oembed';
const TIMEOUT_MS = 6000;

// The oEmbed endpoint returns a <blockquote> HTML snippet that Twitter's widgets.js
// upgrades into a styled embed in a browser. We fetch the snippet, render it in a
// Puppeteer page, and screenshot the result. The canonical URL (and its author)
// are authoritative for metadata.
export async function tryOembed(
  ref: TweetRef,
  service: CaptureService,
  traceId?: string,
): Promise<StageResult> {
  const started = Date.now();
  try {
    const endpoint =
      OEMBED_BASE +
      '?url=' +
      encodeURIComponent(ref.canonicalUrl) +
      '&omit_script=0&dnt=1&hide_thread=1';

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let json: unknown;
    try {
      const res = await fetch(endpoint, {
        signal: ctl.signal,
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error('oembed http ' + res.status);
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }
    const parsed = OEmbedSchema.parse(json);

    // Wrap the snippet in a minimal HTML document that loads Twitter's widgets.js.
    // `service.capturePage` navigates to a URL, so we pass a data: URL.
    const document = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <style>body{margin:24px;font-family:'Noto Sans Arabic',system-ui,sans-serif;background:#fff}
      .twitter-tweet{margin:0 !important}</style>
      </head><body>${parsed.html}</body></html>`;
    const inlineUrl = 'inline:' + encodeURIComponent(document);

    const shot = await service.capturePage(inlineUrl, {
      timeoutMs: 25_000,
      viewport: { width: 600, height: 900 },
      waitForSelector: 'iframe',
      clipToSelector: 'iframe.twitter-tweet, iframe, .twitter-tweet-rendered',
      settleMs: 3000,
      ...(traceId ? { traceId } : {}),
    });

    return {
      success: true,
      stage: 'oembed',
      final_url: ref.canonicalUrl,
      author_name: parsed.author_name ?? null,
      author_handle: ref.username ? '@' + ref.username : null,
      text: null, // oEmbed snippet is HTML; skip text extraction for now
      posted_at: null,
      media: { kind: 'none' }, // conservatively — detection happens on puppeteer_direct
      screenshot: shot.screenshot,
      html: parsed.html,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, trace_id: traceId, tweet_id: ref.id }, 'oembed stage failed');
    return {
      success: false,
      stage: 'oembed',
      error: msg,
      duration_ms: Date.now() - started,
    };
  }
}
