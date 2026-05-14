// editor-explore.spec.ts
// استكشاف آلي للمحرر — ينفّذ heuristics من charters/editor-charter.md
// النمط: field-test مع addResult/screenshots/progress.json

import { test } from '@playwright/test';
import * as path from 'node:path';
import { FieldReporter } from '../lib/reporter';

const BASE = process.env.EXPLORE_BASE_URL || 'http://localhost:5000';
const ARTIFACTS = process.env.EXPLORE_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts/integrated-suite/explore-local');
const OUT = path.join(ARTIFACTS, 'editor-explore');

test.setTimeout(15 * 60_000);

test('editor — agentic exploration', async ({ page, browser }) => {
  const r = new FieldReporter(OUT, `${BASE}/editor`, 'editor-charter');
  r.attachPage(page);

  // 1. Load
  try {
    const resp = await page.goto(`${BASE}/editor`, { timeout: 30_000, waitUntil: 'domcontentloaded' });
    await r.screenshot(page, 'load-01-domcontent');
    if (!resp || resp.status() >= 500) {
      r.addResult('LOAD-01', 'load', 'فاشل', 'تحميل صفحة المحرر', `status=${resp?.status()}`, [], 'مرتفعة');
    } else {
      r.addResult('LOAD-01', 'load', 'ناجح', 'تحميل صفحة المحرر', `status=${resp.status()}`);
    }
  } catch (e: any) {
    r.addResult('LOAD-01', 'load', 'محجوب', 'تحميل صفحة المحرر', e.message, [], 'مرتفعة');
    await r.finalize();
    return;
  }

  // 2. Boundary inputs — empty/1/100K
  const editable = page.locator('[contenteditable="true"], textarea, input[type="text"]').first();
  if (await editable.count()) {
    // 2a. fill 100K text
    const longText = 'سيناريو طويل جداً. '.repeat(5000); // ~100K حرف
    try {
      await editable.fill(longText.slice(0, 100_000));
      await page.waitForTimeout(500);
      const errCount = await page.locator('[data-error]').count();
      r.addResult('BND-01', 'boundary', errCount > 0 ? 'فاشل' : 'ناجح',
        'إدخال 100K حرف', `data-error count=${errCount}`, [await r.screenshot(page, 'bnd-01-long-text')]);
    } catch (e: any) {
      r.addResult('BND-01', 'boundary', 'فاشل', 'إدخال 100K حرف', e.message, [], 'متوسطة');
    }

    // 2b. RTL/LTR override characters
    try {
      await editable.fill('عربي‮معكوس‬عادي');
      await page.waitForTimeout(300);
      r.addResult('BND-02', 'i18n', 'ناجح', 'إدخال bidi override', 'no crash',
        [await r.screenshot(page, 'bnd-02-bidi')]);
    } catch (e: any) {
      r.addResult('BND-02', 'i18n', 'فاشل', 'إدخال bidi override', e.message);
    }

    // 2c. emojis + zero-width
    try {
      await editable.fill('مشهد 🎬​‌ في 🌅');
      r.addResult('BND-03', 'i18n', 'ناجح', 'إدخال emoji + zero-width', 'no crash');
    } catch (e: any) {
      r.addResult('BND-03', 'i18n', 'فاشل', 'إدخال emoji + zero-width', e.message);
    }
  } else {
    r.addResult('EDIT-01', 'editor', 'غير موجود', 'البحث عن editable element', 'no editable element on /editor');
  }

  // 3. Center-screen overlay rule (OPERATING-CONTRACT)
  const centerOverlay = await page.locator('[data-floating-mid], [data-overlay-center]').count();
  r.addResult('LAY-01', 'layout',
    centerOverlay === 0 ? 'ناجح' : 'فاشل',
    'فحص عدم وجود overlay مثبت في منتصف الشاشة',
    `overlay-count=${centerOverlay}`,
    [], centerOverlay > 0 ? 'مرتفعة' : 'منخفضة');

  // 4. Keyboard-only navigation
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
  }
  const stuckOnDeadElement = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return false;
    return a.tagName === 'BODY';
  });
  r.addResult('KEY-01', 'keyboard',
    stuckOnDeadElement ? 'فاشل' : 'ناجح',
    '20 ضغطة Tab', `stuckOnBody=${stuckOnDeadElement}`,
    [await r.screenshot(page, 'key-01-tab-trace')]);

  // 5. Reload preserves state (best-effort)
  if (await editable.count()) {
    await editable.fill('test-persist-' + Date.now());
    await page.waitForTimeout(2000); // wait for autosave
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const text = await editable.first().inputValue().catch(() => '');
    r.addResult('PER-01', 'persistence',
      text.includes('test-persist-') ? 'ناجح' : 'فاشل',
      'reload يحافظ على المحتوى', `recovered=${text.includes('test-persist-')}`,
      [await r.screenshot(page, 'per-01-after-reload')], 'متوسطة');
  }

  // 6. Network failure simulation
  await page.context().setOffline(true);
  if (await editable.count()) {
    await editable.fill('offline-edit-' + Date.now());
    await page.waitForTimeout(500);
    const errors = await page.locator('[data-error], .error-message').count();
    r.addResult('OFL-01', 'offline',
      errors > 0 ? 'ناجح' : 'فاشل',
      'تحرير أثناء انقطاع الشبكة', `errors-shown=${errors}`,
      [await r.screenshot(page, 'ofl-01-offline')], 'متوسطة');
  }
  await page.context().setOffline(false);

  await r.finalize();
});
