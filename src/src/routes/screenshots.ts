import { Router } from 'express';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { downloadScreenshot } from '../db/storage.js';
import { logger } from '../logger.js';

const CACHE_DIR = join(process.cwd(), '.screenshot-cache');
const ONE_DAY = 86_400;

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

export function screenshotsRouter(): Router {
  const router = Router();

  router.get('/screenshots/:postId/:filename', async (req, res) => {
    const { postId, filename } = req.params as { postId: string; filename: string };
    const storagePath = postId + '/' + filename;
    const localPath = join(CACHE_DIR, postId + '-' + filename);
    const isWebp = filename.endsWith('.webp');
    const contentType = isWebp ? 'image/webp' : 'image/png';

    try {
      // Serve from local disk cache if available.
      const cached = await stat(localPath).catch(() => null);
      if (cached) {
        const buf = await readFile(localPath);
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=' + ONE_DAY + ', immutable');
        res.send(buf);
        return;
      }

      // Download from Supabase, cache to disk, then serve.
      await ensureCacheDir();
      const buf = await downloadScreenshot(storagePath);
      await writeFile(localPath, buf);
      logger.info({ storagePath }, 'screenshot cached to disk');

      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=' + ONE_DAY + ', immutable');
      res.send(buf);
    } catch (err) {
      logger.warn({ err, storagePath, trace_id: req.traceId }, 'screenshot proxy failed');
      res.status(404).json({ error: 'screenshot_not_found' });
    }
  });

  return router;
}
