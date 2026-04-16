import genericPool from 'generic-pool';
import puppeteer, { type Browser } from 'puppeteer-core';
import { LAUNCH_ARGS, resolveChromiumPath } from './chromium.js';
import { logger } from '../logger.js';

export interface PoolOptions {
  min?: number;
  max?: number;
  idleTimeoutMs?: number;
}

export function createBrowserPool(opts: PoolOptions = {}): genericPool.Pool<Browser> {
  const { min = 1, max = 2, idleTimeoutMs = 60_000 } = opts;
  const executablePath = resolveChromiumPath();

  const factory: genericPool.Factory<Browser> = {
    create: async () => {
      const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [...LAUNCH_ARGS],
      });
      logger.info({ pid: browser.process()?.pid }, 'chromium launched');
      browser.on('disconnected', () => {
        logger.warn({ pid: browser.process()?.pid }, 'chromium disconnected');
      });
      return browser;
    },
    destroy: async (browser) => {
      try {
        await browser.close();
      } catch (err) {
        logger.error({ err }, 'failed to close chromium');
      }
    },
    validate: async (browser) => browser.connected,
  };

  return genericPool.createPool(factory, {
    min,
    max,
    idleTimeoutMillis: idleTimeoutMs,
    testOnBorrow: true,
    // Do NOT pre-warm browsers at startup. Chromium launch can block for
    // seconds (or hang) on Mac; we'd rather boot the HTTP server first and
    // launch Chromium lazily on the first /capture request.
    autostart: false,
  });
}
