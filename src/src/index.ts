// Guard against Node 22+ regression in V8's ESM-from-CJS evaluator that
// silently infinite-loops when importing puppeteer-core. Pinning to 20.x
// here surfaces the mismatch immediately instead of hanging for minutes.
{
  const major = Number(process.versions.node.split('.')[0]);
  if (major !== 20) {
    // eslint-disable-next-line no-console
    console.error(
      `\n[FATAL] Node ${process.versions.node} detected — this project requires Node 20.x.\n` +
        `Run: nvm use 20   (or: nvm install 20 && nvm use 20)\n` +
        `See .nvmrc and CLAUDE.md.\n`,
    );
    process.exit(1);
  }
}

// eslint-disable-next-line no-console
console.log('[boot] index.ts start');

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Look up the directory tree for a .env file (workspace runs set cwd to the
// workspace dir, so CWD/.env misses the repo-root .env). Load the first hit.
const HERE = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(HERE, '../../.env'),
  resolve(HERE, '../../../.env'),
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

// eslint-disable-next-line no-console
console.log('[boot] env loaded, importing app deps');

import express from 'express';
import { join } from 'node:path';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { traceId } from './middleware/trace-id.js';
import { createBrowserPool } from './capture/browser-pool.js';
import { CaptureService } from './capture/puppeteer-service.js';
import { captureRouter } from './routes/capture.js';
import { postsRouter } from './routes/posts.js';
import { exportRouter } from './routes/export.js';
import { activityRouter } from './routes/activity.js';
import { login, requireAdmin } from './auth.js';

// eslint-disable-next-line no-console
console.log('[boot] building app');

const app = express();
const port = Number(process.env['PORT'] ?? 3001);

const pool = createBrowserPool({
  min: Number(process.env['BROWSER_POOL_MIN'] ?? 0),
  max: Number(process.env['BROWSER_POOL_MAX'] ?? 2),
});
const captureService = new CaptureService(pool);

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,x-trace-id,Authorization');
  if (_req.method === 'OPTIONS') return void res.sendStatus(204);
  next();
});
app.use(traceId);
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ trace_id: (req as express.Request).traceId }),
  }),
);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  const token = login(email, password);
  if (!token) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }
  res.json({ token, email });
});

app.get('/api/auth/me', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/metrics', (_req, res) => {
  res.json({
    window: '24h',
    counts: { total: 0, per_stage: {} },
    latency: { p50: null, p95: null, max: null },
    errors: [],
  });
});

app.use('/api', postsRouter());
app.use('/api', exportRouter());
app.use('/api', requireAdmin, captureRouter(captureService));
app.use('/api', requireAdmin, activityRouter());

const webDist = join(HERE, '../../web/dist');
app.use(express.static(webDist, { maxAge: '1d' }));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api') || _req.path === '/health') return next();
  res.sendFile(join(webDist, 'index.html'));
});

const server = app.listen(port, () => {
  // Plain console.log first — guarantees visibility even if pino is mis-wired.
  // eslint-disable-next-line no-console
  console.log('hadaq api listening on port ' + port);
  logger.info({ port }, 'hadaq api listening');
});
server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('listen error', err);
  process.exit(1);
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down');
  server.close();
  await pool.drain();
  await pool.clear();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
