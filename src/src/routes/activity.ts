import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { logger } from '../logger.js';
import type { CaptureRow, PostRow } from '../db/types.js';

type ActivityType = 'captured' | 'recaptured' | 'failed';

interface ActivityEntry {
  id: string;
  type: ActivityType;
  post_id: string;
  target: string; // shortened URL
  stage: string;
  at: string;
  error: string | null;
}

export function activityRouter(): Router {
  const router = Router();

  router.get('/activity', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query['limit'] ?? 100), 500);
      const sb = getSupabase();

      // Pull recent captures with the joined post URL. Order by capture time desc.
      const captures = await sb
        .from('captures')
        .select('*, posts!inner(url)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (captures.error) throw new Error('activity fetch failed: ' + captures.error.message);

      // Count captures per post to distinguish first-capture from recapture.
      const captureCountByPost = new Map<string, number>();
      const rowsAsc = ((captures.data ?? []) as (CaptureRow & { posts: Pick<PostRow, 'url'> })[])
        .slice()
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const r of rowsAsc) {
        captureCountByPost.set(r.post_id, (captureCountByPost.get(r.post_id) ?? 0) + 1);
      }

      // Assign "captured" to the first success per post, "recaptured" to later successes.
      const firstSuccess = new Map<string, string>();
      for (const r of rowsAsc) {
        if (!r.success) continue;
        if (!firstSuccess.has(r.post_id)) firstSuccess.set(r.post_id, r.id);
      }

      const rows = (captures.data ?? []) as (CaptureRow & { posts: Pick<PostRow, 'url'> })[];
      const entries: ActivityEntry[] = rows.map((r) => {
        const type: ActivityType = !r.success
          ? 'failed'
          : firstSuccess.get(r.post_id) === r.id
            ? 'captured'
            : 'recaptured';
        return {
          id: r.id,
          type,
          post_id: r.post_id,
          target: r.posts.url,
          stage: r.stage,
          at: r.created_at,
          error: r.error,
        };
      });

      res.json({ trace_id: req.traceId, rows: entries });
    } catch (err) {
      logger.error({ err, trace_id: req.traceId }, 'activity list failed');
      res
        .status(500)
        .json({ error: 'activity_failed', trace_id: req.traceId, message: (err as Error).message });
    }
  });

  return router;
}
