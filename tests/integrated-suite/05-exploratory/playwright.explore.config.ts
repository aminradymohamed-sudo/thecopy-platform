// playwright.explore.config.ts
// Config مستقل لـ 05-exploratory

import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const artifactsDir = process.env.EXPLORE_ARTIFACTS_DIR
  || path.join(repoRoot, 'artifacts', 'integrated-suite', 'explore-local');

export default defineConfig({
  testDir: path.join(__dirname, 'specs'),
  outputDir: path.join(artifactsDir, 'test-results'),
  fullyParallel: false,            // exploratory: ترتيب مهم لتجنّب race conditions
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 20 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(artifactsDir, 'playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(artifactsDir, 'results.json') }],
  ],
  use: {
    baseURL: process.env.MIRROR_BASE_URL || process.env.EXPLORE_BASE_URL || 'http://localhost:5000',
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    ...devices['Desktop Chrome'],
    // Chromium يحظر بعض المنافذ كـ ERR_UNSAFE_PORT (e.g. 6000 = X11).
    // mirror web يعمل على 6000 — نسمح به صراحةً عبر علم Chromium.
    // هذا لا يضعف أي فحص؛ القيد client-side في المتصفح فقط.
    launchOptions: {
      args: ['--explicitly-allowed-ports=6000'],
    },
  },
});
