import type { CaptureService } from './puppeteer-service.js';
import type { FallbackChainResult, StageResult, StageSuccess } from './types.js';
import { classifyUrl } from './url.js';
import { tryFxTwitter } from './fallbacks/fxtwitter.js';
import { tryOembed } from './fallbacks/oembed.js';
import { tryPuppeteerEmbed } from './fallbacks/puppeteer-embed.js';
import { tryPuppeteerDirect } from './fallbacks/puppeteer-direct.js';
import { logger } from '../logger.js';

export interface RunOptions {
  traceId?: string;
}

export async function runFallbackChain(
  url: string,
  service: CaptureService,
  { traceId }: RunOptions = {},
): Promise<FallbackChainResult> {
  const target = classifyUrl(url);
  const attempts: StageResult[] = [];

  const tryStage = async (
    fn: () => Promise<StageResult>,
  ): Promise<StageSuccess | null> => {
    const r = await fn();
    attempts.push(r);
    logger.info(
      {
        stage: r.stage,
        success: r.success,
        duration_ms: r.duration_ms,
        trace_id: traceId,
      },
      'fallback stage complete',
    );
    return r.success ? r : null;
  };

  // Articles skip the twitter-specific stages entirely.
  if (target.kind === 'article') {
    const direct = await tryStage(() => tryPuppeteerDirect(target, service, traceId));
    if (direct) return { final: direct, attempts };
    throw new FallbackChainError(attempts);
  }

  // Tweet: try stages in order, stop on first success.
  const fx = await tryStage(() => tryFxTwitter(target, service, traceId));
  if (fx) return { final: fx, attempts };

  const oe = await tryStage(() => tryOembed(target, service, traceId));
  if (oe) return { final: oe, attempts };

  const emb = await tryStage(() => tryPuppeteerEmbed(target, service, traceId));
  if (emb) return { final: emb, attempts };

  const direct = await tryStage(() => tryPuppeteerDirect(target, service, traceId));
  if (direct) return { final: direct, attempts };

  throw new FallbackChainError(attempts);
}

export class FallbackChainError extends Error {
  readonly attempts: StageResult[];
  constructor(attempts: StageResult[]) {
    super('all fallback stages failed');
    this.name = 'FallbackChainError';
    this.attempts = attempts;
  }
}
