import type { CaptureService } from '../puppeteer-service.js';
import type { StageResult } from '../types.js';
import type { TweetRef } from '../url.js';
import { logger } from '../../logger.js';

export async function tryPuppeteerEmbed(
  ref: TweetRef,
  service: CaptureService,
  traceId?: string,
): Promise<StageResult> {
  const started = Date.now();
  const url =
    'https://platform.twitter.com/embed/Tweet.html?id=' + encodeURIComponent(ref.id);
  try {
    const shot = await service.capturePage(url, {
      timeoutMs: 25_000,
      viewport: { width: 600, height: 900 },
      waitForSelector: 'article, [data-tweet-id], [data-testid="tweet"]',
      clipToSelector: 'article, [data-tweet-id], [data-testid="tweet"]',
      settleMs: 1500,
      ...(traceId ? { traceId } : {}),
    });
    return {
      success: true,
      stage: 'puppeteer_embed',
      final_url: ref.canonicalUrl,
      author_name: null,
      author_handle: ref.username ? '@' + ref.username : null,
      text: null,
      posted_at: null,
      media: { kind: 'none' },
      screenshot: shot.screenshot,
      html: shot.html,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, trace_id: traceId, tweet_id: ref.id }, 'puppeteer_embed stage failed');
    return {
      success: false,
      stage: 'puppeteer_embed',
      error: msg,
      duration_ms: Date.now() - started,
    };
  }
}
