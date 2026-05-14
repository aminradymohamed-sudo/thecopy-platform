// playwright.predeploy.config.ts
// Config مستقل لحزمة 06-pre-deployment (smoke + system) — لا يعدّل أي config قائم في apps/web/.
// يعالج مشكلة testDir المقيّد في apps/web/playwright.config.ts عند تشغيل specs خارج tests/e2e.

import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');

const baseURL =
  process.env.PRE_DEPLOY_BASE_URL ||
  process.env.MIRROR_BASE_URL ||
  process.env.SMOKE_BASE_URL ||
  process.env.SYSTEM_BASE_URL ||
  'http://localhost:6080';

const artifactsDir =
  process.env.PRE_DEPLOY_ARTIFACTS_DIR ||
  path.join(repoRoot, 'artifacts', 'integrated-suite', 'pre-deploy-local');

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(artifactsDir, 'test-results'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(artifactsDir, 'playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(artifactsDir, 'results.json') }],
  ],
  use: {
    baseURL,
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts$/,
    },
  ],
});
