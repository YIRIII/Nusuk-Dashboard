import { existsSync } from 'node:fs';

const CANDIDATES = [
  process.env['CHROME_BIN'],
  process.env['PUPPETEER_EXECUTABLE_PATH'],
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

export function resolveChromiumPath(): string {
  for (const candidate of CANDIDATES) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  throw new Error(
    'No Chromium found. Set CHROME_BIN or install system Chromium. ' +
      'Never use puppeteer bundled Chromium (see CLAUDE.md).',
  );
}

// Launch flags chosen for Arabic-rendering determinism + container safety.
// Each flag is load-bearing — do not remove without reading the comment.
export const LAUNCH_ARGS: readonly string[] = [
  // Deterministic font rendering — v1's Arabic ligatures broke when hinting was active.
  '--font-render-hinting=none',
  // Containers frequently have tiny /dev/shm. Without this, Chromium crashes under concurrent tabs.
  '--disable-dev-shm-usage',
  // Required when running as root in Docker.
  '--no-sandbox',
  '--disable-setuid-sandbox',
  // Headless doesn't need GPU; saves RAM.
  '--disable-gpu',
  // Keep locale defaults predictable for screenshots.
  '--lang=ar-SA',
];
