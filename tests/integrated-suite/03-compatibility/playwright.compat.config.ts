// playwright.compat.config.ts
// Config مستقل لحزمة التوافق — لا يعدّل أي config قائم في apps/web/

import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const repoRoot = path.resolve(__dirname, '../../..');
const matrixPath = path.join(__dirname, 'matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const baseURL = process.env.MIRROR_BASE_URL || process.env.COMPAT_BASE_URL || 'http://localhost:6080';
const artifactsDir = process.env.COMPAT_ARTIFACTS_DIR
  || path.join(repoRoot, 'artifacts', 'integrated-suite', 'compat-local');

function resolveDevice(deviceCfg: any) {
  if (deviceCfg.preset) return devices[deviceCfg.preset];
  return {
    viewport: deviceCfg.viewport,
    deviceScaleFactor: deviceCfg.deviceScaleFactor ?? 1,
    isMobile: deviceCfg.isMobile ?? false,
    hasTouch: deviceCfg.isMobile ?? false,
  };
}

// Port 6080 (NoVNC) ليس ضمن قوائم الحظر الافتراضية في Chromium/Firefox/WebKit.
// mirror web يعمل على 6080 — نتركه بدون استثناءات ports، ونحافظ على args فارغة.
// تم نقل المرايا من 6000 إلى 6080 لتجنّب ERR_UNSAFE_PORT في WebKit/Chromium.
function buildLaunchOptions(channel: string) {
  if (channel === 'firefox') {
    return {
      args: [],
    };
  }
  if (channel === 'webkit') {
    return {
      args: [],
    };
  }
  // Chromium / chromium-based channels
  return {
    args: [],
  };
}

function buildFirefoxUserPrefs(channel: string) {
  if (channel !== 'firefox') return undefined;
  return {
    // لا حاجة لتعديل قائمة المنافذ المحظورة لأن 6080 ليس فيها.
    // نُبقي مفتاح فارغ لتجنب أي override غير مقصود.
  };
}

const projects = matrix.projects.map((p: any) => {
  const browser = matrix.browsers.find((b: any) => b.id === p.browser);
  const device = matrix.devices.find((d: any) => d.id === p.device);
  const launchOptions: any = buildLaunchOptions(browser.channel);
  const firefoxUserPrefs = buildFirefoxUserPrefs(browser.channel);
  if (firefoxUserPrefs) launchOptions.firefoxUserPrefs = firefoxUserPrefs;
  return {
    name: p.id,
    use: {
      ...resolveDevice(device),
      browserName: browser.channel,
      baseURL,
      locale: 'ar-SA',
      timezoneId: 'Asia/Riyadh',
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      launchOptions,
    },
    testMatch: /.*\.spec\.ts$/,
  };
});

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(artifactsDir, 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(artifactsDir, 'playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(artifactsDir, 'results.json') }],
  ],
  projects,
});
