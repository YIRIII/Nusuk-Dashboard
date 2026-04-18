import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { CaptureRequestV2Schema, BatchCaptureRequestSchema } from '@nusuk/schemas';
import { validateBody } from '../middleware/validate.js';
import { CaptureService } from '../capture/puppeteer-service.js';
import { runFallbackChain, FallbackChainError } from '../capture/fallback-chain.js';
import { classifyUrl } from '../capture/url.js';
import { classifyCompanyByHandle } from '../capture/classify.js';
import {
  upsertPost,
  insertCapture,
  findLivePostByUrl,
  softDeletePost,
} from '../db/posts.js';
import { getSupabase } from '../db/supabase.js';
import { uploadScreenshot, signedUrl } from '../db/storage.js';
import { logger } from '../logger.js';
import type { PostOrigin } from '../db/types.js';

interface CaptureOutcome {
  url: string;
  status: 'captured' | 'duplicate' | 'failed';
  post_id?: string;
  capture_id?: string;
  stage?: string;
  screenshot_url?: string;
  error?: string;
  attempts?: Array<{ stage: string; success: boolean; duration_ms: number; error: string | null }>;
  duration_ms: number;
  prior_captured_at?: string;
}

async function captureOne(
  url: string,
  service: CaptureService,
  traceId: string,
  origin: PostOrigin,
  companyId: string | null,
  forceRecapture = false,
): Promise<CaptureOutcome> {
  const started = Date.now();
  try {
    const existing = await findLivePostByUrl(url);
    if (existing && !forceRecapture) {
      return {
        url,
        status: 'duplicate',
        post_id: existing.id,
        prior_captured_at: existing.captured_at,
        duration_ms: Date.now() - started,
      };
    }
    // Force recapture: soft-delete the prior post so the unique-URL index frees up.
    if (existing && forceRecapture) {
      await softDeletePost(existing.id);
    }

    const { final } = await runFallbackChain(url, service, { traceId });
    const classified = classifyUrl(url);
    const companyCategory = await classifyCompanyByHandle(getSupabase(), {
      origin,
      author_handle: final.author_handle,
      author_name: final.author_name,
      text: final.text,
    });
    const { row: post, duplicate } = await upsertPost({
      url,
      kind: classified.kind,
      metadata: {
        author_name: final.author_name,
        author_handle: final.author_handle,
        text: final.text,
        posted_at: final.posted_at,
        final_url: final.final_url,
      },
      origin,
      company_id: companyId,
      company_category: companyCategory,
      posted_at: final.posted_at,
    });

    if (duplicate) {
      return {
        url,
        status: 'duplicate',
        post_id: post.id,
        prior_captured_at: post.captured_at,
        duration_ms: Date.now() - started,
      };
    }

    const captureId = randomUUID();
    const uploaded = await uploadScreenshot(post.id, captureId, final.screenshot);
    const row = await insertCapture({
      id: captureId,
      post_id: post.id,
      media: final.media.kind,
      stage: final.stage,
      storage_path: uploaded.path,
      bytes: uploaded.bytes,
      duration_ms: final.duration_ms,
      success: true,
    });

    return {
      url,
      status: 'captured',
      post_id: post.id,
      capture_id: row.id,
      stage: final.stage,
      screenshot_url: await signedUrl(uploaded.path),
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    if (err instanceof FallbackChainError) {
      return {
        url,
        status: 'failed',
        error: 'all_stages_failed',
        attempts: err.attempts.map((a) => ({
          stage: a.stage,
          success: a.success,
          duration_ms: a.duration_ms,
          error: a.success ? null : a.error,
        })),
        duration_ms: Date.now() - started,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, url, trace_id: traceId }, 'single capture failed');
    return { url, status: 'failed', error: msg, duration_ms: Date.now() - started };
  }
}

async function runBounded<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      await worker(items[idx]!, idx);
    }
  });
  await Promise.all(runners);
}

export function captureRouter(service: CaptureService): Router {
  const router = Router();

  router.post('/capture', validateBody(CaptureRequestV2Schema), async (req, res) => {
    const body = req.body as {
      url: string;
      origin: PostOrigin;
      company_id?: string | null;
      force_recapture?: boolean;
    };
    const outcome = await captureOne(
      body.url,
      service,
      req.traceId,
      body.origin,
      body.company_id ?? null,
      body.force_recapture === true,
    );
    if (outcome.status === 'failed') {
      res.status(502).json({ trace_id: req.traceId, ...outcome });
      return;
    }
    res.json({ trace_id: req.traceId, ...outcome });
  });

  router.post('/capture/batch', validateBody(BatchCaptureRequestSchema), async (req, res) => {
    const body = req.body as {
      urls: string[];
      origin: PostOrigin;
      company_id?: string | null;
      force_recapture_urls?: string[];
    };
    const forceSet = new Set(body.force_recapture_urls ?? []);
    const started = Date.now();
    const results: CaptureOutcome[] = new Array(body.urls.length);
    const concurrency = Number(process.env['BROWSER_POOL_MAX'] ?? 2);

    await runBounded(body.urls, concurrency, async (url, idx) => {
      results[idx] = await captureOne(
        url,
        service,
        req.traceId,
        body.origin,
        body.company_id ?? null,
        forceSet.has(url),
      );
    });

    const summary = {
      captured: results.filter((r) => r.status === 'captured').length,
      duplicate: results.filter((r) => r.status === 'duplicate').length,
      failed: results.filter((r) => r.status === 'failed').length,
    };

    res.json({
      trace_id: req.traceId,
      total_urls: body.urls.length,
      duration_ms: Date.now() - started,
      summary,
      results,
    });
  });

  return router;
}
