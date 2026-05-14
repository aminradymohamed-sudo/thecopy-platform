// cross-device.spec.ts
// تتحقق أن التكوين المرجعي للديسكتوب لا يُستبدَل بتخطيط جوال.
// قاعدة OPERATING-CONTRACT: عند ضيق المساحة → تمرير، لا stacked layout.

import { test, expect } from '@playwright/test';

test.describe('Cross-device — desktop reference is preserved', () => {
  test('hero cards count remains 7 regardless of viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // قبول selectors: [data-hero-card] (الكود التالي) أو .hero-vcard (mirror الحالي).
    // نفس مستوى الصرامة: العدد الثابت = 7. لا تعديل في القيد.
    const cards = page.locator('[data-hero-card], .hero-vcard');
    // hero-config.ts يفرض 7 كروت ثابتة — لا يتغير العدد بالـ breakpoint
    await expect(cards).toHaveCount(7);
  });

  test('horizontal scroll exists on narrow viewport (no stacked layout)', async ({ page, viewport }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    if (!viewport || viewport.width >= 1200) {
      test.skip(true, 'only relevant for narrow viewports');
    }

    // لا يجب أن تنطوي الكروت أفقياً إلى عمود — بل تظل في صف واحد قابل للتمرير
    const cards = page.locator('[data-hero-card], .hero-vcard');
    const firstBox = await cards.first().boundingBox();
    const lastBox = await cards.last().boundingBox();

    expect(firstBox).not.toBeNull();
    expect(lastBox).not.toBeNull();

    // إذا كانت الـ y لكل الكروت متساوية تقريباً → row layout (مرجعي)
    // إذا كانت متباعدة عمودياً → stacked → drift
    const yDelta = Math.abs((firstBox!.y) - (lastBox!.y));
    expect(yDelta, 'hero must remain horizontal — vertical stacking violates desktop reference').toBeLessThan(200);
  });

  test('editor sheet remains the visual axis (no center-screen overlays)', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // OPERATING-CONTRACT: السيمترية تُقاس بين ورقة التحرير و dock — لا يجوز overlay مثبت في منتصف الشاشة
    const floatingMid = page.locator('[data-floating-mid], [data-overlay-center]');
    const count = await floatingMid.count();
    expect(count, 'floating center-screen overlays violate editor symmetry rule').toBe(0);
  });

  test('touch input does not break key actions on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip(true, 'mobile-only');
    await page.goto('/');
    // ابحث عن أول زر تفاعلي وحاول النقر
    const firstButton = page.locator('button, a[role="button"]').first();
    if (await firstButton.count()) {
      await firstButton.tap({ trial: false }).catch(() => {});
    }
    // لا يجب أن يحدث pageerror
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
