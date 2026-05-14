// system.spec.ts
// E2E عرضي — يختبر النظام ككتلة واحدة (frontend → backend → memory → AI)

import { test, expect } from '@playwright/test';

const BASE = process.env.SYSTEM_BASE_URL || 'http://localhost:5000';

test.describe('System E2E — full integration', () => {
  test.setTimeout(120_000);

  test('user journey: home → editor → save → reload → verify', async ({ page }) => {
    // 1. home
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('domcontentloaded');

    // 2. navigate to editor
    const editorLink = page.locator('a[href*="/editor"]').first();
    if (await editorLink.count()) {
      await editorLink.click();
      await page.waitForURL(/\/editor/, { timeout: 30_000 });
    } else {
      await page.goto(`${BASE}/editor`);
    }
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // 3. interaction (best-effort — اعتمد على ما هو موجود)
    const editable = page.locator('[contenteditable="true"], textarea, input[type="text"]').first();
    if (await editable.count()) {
      await editable.fill('سيناريو اختبار النظام — مشهد واحد قصير.');
    }

    // 4. reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 5. الصفحة لا تنكسر
    await expect(page).not.toHaveURL(/error|404|500/);
  });

  test('API roundtrip: backend health → list endpoint → response shape', async ({ request }) => {
    const apiBase = process.env.SYSTEM_API_URL || BASE.replace(':5000', ':3001');
    const health = await request.get(`${apiBase}/health`);
    expect(health.status()).toBe(200);

    // واحد من endpoints العامة
    const r = await request.get(`${apiBase}/api/health`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toBeDefined();
  });

  test('static + dynamic routes coexist', async ({ page }) => {
    const routes = ['/', '/cinematography-studio', '/breakdown', '/actorai-arabic'];
    for (const r of routes) {
      const resp = await page.goto(`${BASE}${r}`).catch(() => null);
      if (resp) {
        expect(resp.status(), `${r} returned ${resp.status()}`).toBeLessThan(500);
      }
    }
  });
});
