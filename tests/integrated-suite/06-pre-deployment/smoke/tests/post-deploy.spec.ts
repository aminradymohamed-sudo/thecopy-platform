// post-deploy.spec.ts
// Playwright smoke after deploy. سريع جداً — مسار واحد حرج.

import { test, expect } from '@playwright/test';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5000';

test.describe('Post-deploy smoke', () => {
  test('home page returns 200 and renders hero', async ({ page }) => {
    const response = await page.goto(`${BASE}/`, { timeout: 20_000 });
    expect(response?.status()).toBe(200);
    // Hero يجب أن يكون مرئياً
    await expect(page.locator('[data-hero-card]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('no JS errors on home', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toEqual([]);
  });

  test('main nav links resolve', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const links = page.locator('nav a[href^="/"]');
    const hrefs = await links.evaluateAll((els) =>
      (els as HTMLAnchorElement[]).map((a) => a.getAttribute('href')).filter(Boolean) as string[]
    );
    expect(hrefs.length).toBeGreaterThan(0);
    // sample 2 random links — تأكد أنها لا ترجع 404
    const sample = hrefs.slice(0, 2);
    for (const href of sample) {
      const r = await page.request.get(`${BASE}${href}`);
      expect(r.status(), `${href} returned ${r.status()}`).toBeLessThan(500);
    }
  });
});
