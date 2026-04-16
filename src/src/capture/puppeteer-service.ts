import type genericPool from 'generic-pool';
import type { Browser } from 'puppeteer-core';
import { logger } from '../logger.js';

export interface CaptureOptions {
  viewport?: { width: number; height: number };
  fullPage?: boolean;
  timeoutMs?: number;
  traceId?: string;
  /** CSS selector to wait for before screenshotting (tweet content, etc.). */
  waitForSelector?: string;
  /** Extra fixed delay after load — helps fonts/images finish on embed pages. */
  settleMs?: number;
  /**
   * CSS selector to clip the screenshot to — only the matched element is captured.
   * Falls back to full-page when the selector doesn't match (login wall etc.).
   */
  clipToSelector?: string;
  /** Padding in pixels around the clipped element. Default 12. */
  clipPaddingPx?: number;
}

export interface CaptureResult {
  screenshot: Buffer;
  html: string;
  finalUrl: string;
  timing: { ttfbMs: number; totalMs: number };
}

export class CaptureService {
  constructor(private readonly pool: genericPool.Pool<Browser>) {}

  async capturePage(url: string, opts: CaptureOptions = {}): Promise<CaptureResult> {
    const {
      viewport = { width: 1280, height: 2000 },
      fullPage = true,
      timeoutMs = 30_000,
      traceId,
      waitForSelector,
      settleMs = 0,
      clipToSelector,
      clipPaddingPx = 12,
    } = opts;

    const browser = await this.pool.acquire();
    const started = Date.now();
    let ttfb = 0;
    try {
      const page = await browser.newPage();
      try {
        await page.setViewport({ ...viewport, deviceScaleFactor: 2 });
        await page.setExtraHTTPHeaders({ 'accept-language': 'ar,en;q=0.8' });
        // Prefer dark mode — analyst preference, looks better in reports.
        // Override per-request via `colorScheme: "light"` if needed later.
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

        page.once('response', (res) => {
          if (res.url() === url || res.request().redirectChain().length === 0) {
            ttfb = Date.now() - started;
          }
        });

        // `about:blank+setContent` lets us render inline HTML on a real origin so
        // scripts like Twitter widgets.js can fetch cross-origin resources.
        if (url.startsWith('inline:')) {
          const html = decodeURIComponent(url.slice('inline:'.length));
          await page.goto('about:blank');
          await page.setContent(html, { waitUntil: 'networkidle2', timeout: timeoutMs });
        } else {
          const response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: timeoutMs,
          });
          if (!response) throw new Error('no response from page.goto');
        }

        if (waitForSelector) {
          await page
            .waitForSelector(waitForSelector, { timeout: Math.min(timeoutMs, 10_000) })
            .catch((err) => {
              logger.warn({ err, selector: waitForSelector, traceId }, 'waitForSelector timed out');
            });
        }
        if (settleMs > 0) await new Promise((r) => setTimeout(r, settleMs));

        // Clip-to-element: try to find the first matching selector's bounding
        // box (incl. possible iframes) and screenshot just that region. If not
        // found or box is degenerate, fall back to full page.
        let screenshot: Buffer | null = null;
        if (clipToSelector) {
          try {
            const box = await page.evaluate(
              (sel, pad) => {
                const queryAll = (root: Document | ShadowRoot): Element | null => {
                  const direct = root.querySelector(sel);
                  if (direct) return direct;
                  // Probe same-origin iframes one level deep (widgets.js case).
                  const iframes = root.querySelectorAll('iframe');
                  for (const f of Array.from(iframes)) {
                    try {
                      const d = (f as HTMLIFrameElement).contentDocument;
                      if (d) {
                        const inner = d.querySelector(sel);
                        if (inner) return f as Element; // fall back to iframe bbox
                      }
                    } catch {
                      // cross-origin — use the iframe element's own box
                      return f as Element;
                    }
                  }
                  return null;
                };
                const el = queryAll(document);
                if (!el) return null;
                const r = (el as HTMLElement).getBoundingClientRect();
                if (r.width < 10 || r.height < 10) return null;
                return {
                  x: Math.max(0, r.left - pad),
                  y: Math.max(0, r.top - pad),
                  width: r.width + pad * 2,
                  height: r.height + pad * 2,
                };
              },
              clipToSelector,
              clipPaddingPx,
            );
            if (box) {
              screenshot = (await page.screenshot({
                type: 'png',
                clip: box,
              })) as Buffer;
            }
          } catch (err) {
            logger.warn({ err, selector: clipToSelector, traceId }, 'clip-to-element failed');
          }
        }
        if (!screenshot) {
          screenshot = (await page.screenshot({ type: 'png', fullPage })) as Buffer;
        }
        const html = await page.content();
        const finalUrl = page.url();

        return {
          screenshot,
          html,
          finalUrl,
          timing: { ttfbMs: ttfb, totalMs: Date.now() - started },
        };
      } finally {
        await page.close().catch((err) => {
          logger.warn({ err, traceId }, 'page close failed');
        });
      }
    } catch (err) {
      logger.error({ err, url, traceId }, 'capture failed; destroying browser');
      await this.pool.destroy(browser);
      throw err;
    } finally {
      if (browser.connected) await this.pool.release(browser);
    }
  }
}
