import type { CaptureService } from '../puppeteer-service.js';
import type { StageResult } from '../types.js';
import type { ClassifiedUrl } from '../url.js';
import type { MediaKind } from '../types.js';
import { logger } from '../../logger.js';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

function isYouTube(url: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function tryPuppeteerDirect(
  target: ClassifiedUrl,
  service: CaptureService,
  traceId?: string,
): Promise<StageResult> {
  const started = Date.now();
  const yt = isYouTube(target.canonicalUrl);
  try {
    const shot = await service.capturePage(target.canonicalUrl, {
      timeoutMs: yt ? 45_000 : 30_000,
      settleMs: target.kind === 'tweet' ? 2500 : yt ? 3000 : 500,
      ...(target.kind === 'tweet'
        ? {
            waitForSelector: 'article, [data-testid="tweet"], [data-tweet-id]',
            clipToSelector: 'article, [data-testid="tweet"], [data-tweet-id]',
          }
        : yt
          ? {
              waitForSelector: '#player, ytd-watch-metadata, #above-the-fold',
              clipToSelector: '#columns, ytd-watch-flexy, #content',
              viewport: { width: 1280, height: 900 },
              fullPage: false,
              cookies: [
                { name: 'SOCS', value: 'CAISHAgCEhJnd3NfMjAyNDA1MTUtMF9SQzIaAmVuIAEaBgiA_LmzBg', domain: '.youtube.com' },
                { name: 'CONSENT', value: 'PENDING+987', domain: '.youtube.com' },
              ],
            }
          : {}),
      ...(traceId ? { traceId } : {}),
    });
    const mediaKind: MediaKind = yt ? 'video' : 'none';
    return {
      success: true,
      stage: 'puppeteer_direct',
      final_url: shot.finalUrl,
      author_name: null,
      author_handle: target.kind === 'tweet' && target.username ? '@' + target.username : null,
      text: null,
      posted_at: null,
      media: { kind: mediaKind },
      screenshot: shot.screenshot,
      html: shot.html,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, trace_id: traceId }, 'puppeteer_direct stage failed');
    return {
      success: false,
      stage: 'puppeteer_direct',
      error: msg,
      duration_ms: Date.now() - started,
    };
  }
}
