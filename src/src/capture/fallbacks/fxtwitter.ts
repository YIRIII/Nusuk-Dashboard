import { z } from 'zod';
import type { CaptureService } from '../puppeteer-service.js';
import type { StageResult } from '../types.js';
import type { TweetRef } from '../url.js';
import { logger } from '../../logger.js';

// FxTwitter response shape — only the fields we consume. The API returns more.
// Docs (informal): https://github.com/FixTweet/FxTwitter
const FxAuthorSchema = z.object({
  name: z.string().nullable().optional(),
  screen_name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

const FxMediaItemSchema = z.object({
  type: z.enum(['photo', 'video', 'gif']),
  url: z.string().url().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
});

const FxTweetSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  text: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  author: FxAuthorSchema.nullable().optional(),
  media: z
    .object({
      all: z.array(FxMediaItemSchema).optional(),
      photos: z.array(FxMediaItemSchema).optional(),
      videos: z.array(FxMediaItemSchema).optional(),
    })
    .nullable()
    .optional(),
});

const FxResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  tweet: FxTweetSchema.optional(),
});

const FX_BASE = process.env['FXTWITTER_BASE'] ?? 'https://api.fxtwitter.com';
const TIMEOUT_MS = 5000;

export async function tryFxTwitter(
  ref: TweetRef,
  service: CaptureService,
  traceId?: string,
): Promise<StageResult> {
  const started = Date.now();
  try {
    const endpoint = FX_BASE + '/status/' + ref.id;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let json: unknown;
    try {
      const res = await fetch(endpoint, {
        signal: ctl.signal,
        headers: { accept: 'application/json', 'user-agent': 'hadaq-tracker/2 (+internal)' },
      });
      if (!res.ok) throw new Error('fxtwitter http ' + res.status);
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const parsed = FxResponseSchema.parse(json);
    if (parsed.code !== 200 || !parsed.tweet) {
      throw new Error('fxtwitter code=' + parsed.code + ' ' + (parsed.message ?? ''));
    }
    const tweet = parsed.tweet;

    // Screenshot the canonical tweet URL via the headless browser so we retain
    // an audit-grade visual even though the metadata came from FxTwitter.
    const shot = await service.capturePage(ref.canonicalUrl, {
      timeoutMs: 20_000,
      waitForSelector: 'article, [data-testid="tweet"]',
      clipToSelector: 'article, [data-testid="tweet"]',
      settleMs: 1500,
      ...(traceId ? { traceId } : {}),
    });

    const firstMedia = tweet.media?.all?.[0] ?? tweet.media?.photos?.[0] ?? tweet.media?.videos?.[0];
    const mediaKind: 'image' | 'video' | 'gif' | 'none' = firstMedia
      ? firstMedia.type === 'photo'
        ? 'image'
        : firstMedia.type
      : 'none';

    const media: import('../types.js').CapturedMedia = { kind: mediaKind };
    if (mediaKind === 'video') {
      if (firstMedia?.url) media.video_url = firstMedia.url;
      if (firstMedia?.thumbnail_url) media.image_url = firstMedia.thumbnail_url;
    } else if (mediaKind === 'image' || mediaKind === 'gif') {
      if (firstMedia?.url) media.image_url = firstMedia.url;
    }

    return {
      success: true,
      stage: 'fxtwitter',
      final_url: tweet.url,
      author_name: tweet.author?.name ?? null,
      author_handle: tweet.author?.screen_name ? '@' + tweet.author.screen_name : null,
      text: tweet.text ?? null,
      posted_at: tweet.created_at ?? null,
      media,
      screenshot: shot.screenshot,
      html: shot.html,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, trace_id: traceId, tweet_id: ref.id }, 'fxtwitter stage failed');
    return {
      success: false,
      stage: 'fxtwitter',
      error: msg,
      duration_ms: Date.now() - started,
    };
  }
}
