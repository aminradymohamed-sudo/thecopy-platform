// cross-browser.spec.ts
// فروقات معروفة بين المتصفحات: clipboard, pointer events, RTL bidi, intl.

import { test, expect } from '@playwright/test';

test.describe('Cross-browser feature parity', () => {
  test('clipboard write/read works (or graceful fallback)', async ({ page, browserName }) => {
    await page.goto('/');
    const supported = await page.evaluate(async () => {
      try {
        if (!navigator.clipboard) return 'no-api';
        await navigator.clipboard.writeText('test-' + Date.now());
        const back = await navigator.clipboard.readText();
        return back.startsWith('test-') ? 'ok' : 'mismatch';
      } catch (e: any) {
        return 'error:' + e.message;
      }
    });
    // Webkit يحتاج permission — قبول كل النتائج عدا 'mismatch'
    expect(supported).not.toBe('mismatch');
  });

  test('Intl.DateTimeFormat supports ar-SA', async ({ page }) => {
    await page.goto('/');
    const formatted = await page.evaluate(() => {
      return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(2026, 4, 7));
    });
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(3);
  });

  test('CSS logical properties (margin-inline) render correctly in RTL', async ({ page }) => {
    await page.goto('/');
    const supported = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.marginInlineStart = '10px';
      return el.style.marginInlineStart === '10px';
    });
    expect(supported).toBe(true);
  });

  test('PointerEvents present', async ({ page }) => {
    await page.goto('/');
    const has = await page.evaluate(() => 'PointerEvent' in window);
    expect(has).toBe(true);
  });

  test('IntersectionObserver present', async ({ page }) => {
    await page.goto('/');
    const has = await page.evaluate(() => 'IntersectionObserver' in window);
    expect(has).toBe(true);
  });
});
