import { Router } from 'express';
import { PostsListQuerySchema, PostPatchSchema } from '@hadaq/schemas';
import { validateQuery, validateBody } from '../middleware/validate.js';
import {
  listPosts,
  getPostById,
  latestCaptureForPost,
  patchPost,
  softDeletePost,
  restorePost,
  listCompanies,
  propagateCategoryByHandle,
} from '../db/posts.js';
import { getSupabase } from '../db/supabase.js';
import type { PostRow, CaptureRow } from '../db/types.js';
import { logger } from '../logger.js';

interface ValidatedQueryReq<T> {
  validatedQuery: T;
}

function screenshotUrl(storagePath: string): string {
  return '/api/screenshots/' + storagePath;
}

function enrich(post: PostRow, latest: CaptureRow | null) {
  return {
    ...post,
    latest_capture: latest,
    screenshot_url: latest ? screenshotUrl(latest.storage_path) : null,
  };
}

export function postsRouter(): Router {
  const router = Router();

  router.get('/posts', validateQuery(PostsListQuerySchema), async (req, res) => {
    const q = (req as unknown as ValidatedQueryReq<import('@hadaq/schemas').PostsListQuery>)
      .validatedQuery;
    try {
      const { rows, total } = await listPosts({
        kind: q.kind,
        review: q.review,
        origin: q.origin,
        ...(q.company ? { company_id: q.company } : {}),
        category: q.category,
        date_range: q.date_range,
        sort: q.sort,
        ...(q.q ? { q: q.q } : {}),
        limit: q.limit,
        offset: q.offset,
        ...(q.deleted === 'true' ? { onlyDeleted: true } : {}),
      });

      // Batch-load latest captures. Supabase .in() has a URL length limit,
      // so chunk into batches of 50 IDs to avoid silent failures on large sets.
      const sb = getSupabase();
      const postIds = rows.map((r) => r.id);
      const latestByPost = new Map<string, CaptureRow>();
      const CHUNK = 50;
      for (let i = 0; i < postIds.length; i += CHUNK) {
        const chunk = postIds.slice(i, i + CHUNK);
        const caps = await sb
          .from('captures')
          .select('*')
          .in('post_id', chunk)
          .eq('success', true)
          .order('created_at', { ascending: false });
        if (!caps.error && caps.data) {
          for (const c of caps.data as CaptureRow[]) {
            if (!latestByPost.has(c.post_id)) latestByPost.set(c.post_id, c);
          }
        }
      }
      const enriched = rows.map((row) => {
        const latest = latestByPost.get(row.id) ?? null;
        return enrich(row, latest);
      });

      res.set('Cache-Control', 'private, max-age=60');
      res.json({ trace_id: req.traceId, total, rows: enriched });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'list posts failed');
      res
        .status(500)
        .json({ error: 'list_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  router.get('/posts/:id', async (req, res) => {
    try {
      const row = await getPostById(req.params['id'] ?? '');
      if (!row) {
        res.status(404).json({ error: 'not_found', trace_id: req.traceId });
        return;
      }
      const latest = await latestCaptureForPost(row.id);
      res.set('Cache-Control', 'private, max-age=60');
      res.json({ trace_id: req.traceId, post: await enrich(row, latest) });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'get post failed');
      res
        .status(500)
        .json({ error: 'fetch_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  router.patch('/posts/:id', validateBody(PostPatchSchema), async (req, res) => {
    try {
      const id = req.params['id'] ?? '';
      const row = await patchPost(id, req.body);
      // Learn-by-handle: if the analyst set a company_category, apply it to
      // every other unclassified live post from the same author_handle.
      let propagated = 0;
      if (
        req.body.company_category &&
        row.origin === 'company'
      ) {
        const handle = (row.metadata as { author_handle?: string } | null)?.author_handle;
        if (handle) {
          propagated = await propagateCategoryByHandle(handle, req.body.company_category, id);
        }
      }
      res.json({ trace_id: req.traceId, post: row, propagated });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'patch post failed');
      res
        .status(500)
        .json({ error: 'patch_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  router.patch('/posts/:id/restore', async (req, res) => {
    try {
      const row = await restorePost(req.params['id'] ?? '');
      res.json({ trace_id: req.traceId, post: row });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'restore post failed');
      res
        .status(500)
        .json({ error: 'restore_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  router.delete('/posts/:id', async (req, res) => {
    try {
      await softDeletePost(req.params['id'] ?? '');
      res.json({ trace_id: req.traceId, ok: true });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'delete post failed');
      res
        .status(500)
        .json({ error: 'delete_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  router.get('/companies', async (req, res) => {
    try {
      const rows = await listCompanies();
      res.set('Cache-Control', 'private, max-age=300');
      res.json({ trace_id: req.traceId, rows });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'list companies failed');
      res
        .status(500)
        .json({ error: 'list_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  return router;
}
