import type { CaptureService } from '../puppeteer-service.js';
import type { StageResult } from '../types.js';
import type { ClassifiedUrl } from '../url.js';
import { logger } from '../../logger.js';

export async function tryPuppeteerDirect(
  target: ClassifiedUrl,
  service: CaptureService,
  traceId?: string,
): Promise<StageResult> {
  const started = Date.now();
  try {
    const shot = await service.capturePage(target.canonicalUrl, {
      timeoutMs: 30_000,
      settleMs: target.kind === 'tweet' ? 2500 : 500,
      ...(target.kind === 'tweet'
        ? {
            waitForSelector: 'article, [data-testid="tweet"], [data-tweet-id]',
            clipToSelector: 'article, [data-testid="tweet"], [data-tweet-id]',
          }
        : {}),
      ...(traceId ? { traceId } : {}),
    });
    return {
      success: true,
      stage: 'puppeteer_direct',
      final_url: shot.finalUrl,
      author_name: null,
      author_handle: target.kind === 'tweet' && target.username ? '@' + target.username : null,
      text: null,
      posted_at: null,
      media: { kind: 'none' },
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
