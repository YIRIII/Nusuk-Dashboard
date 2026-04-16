import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/golden',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    viewport: { width: 1280, height: 2000 },
    deviceScaleFactor: 2,
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      // Small tolerance for sub-pixel antialiasing across Chromium patch versions.
      // If this threshold grows, the baseline needs a deliberate refresh — not a bump.
      maxDiffPixelRatio: 0.002,
    },
  },
  projects: [
    {
      name: 'chromium-arm64-parity',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
